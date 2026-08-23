#!/usr/bin/env bash
#
# check-media-url.sh — measures the LIFETIME and AUTHENTICATION of a Kapso media URL.
#
# Purpose
#   Kapso does NOT publish how long `kapso.media_data.url` lasts or whether it requires
#   credentials. This script measures the two gaps identified in section 4 of the report:
#     - lifetime: requests the same URL at 0, 5, 10, and 30 minutes and records the HTTP code
#     - authentication: tests WITHOUT credentials first and retries with X-API-Key for 401/403
#
#   The result defines the download adapter's time budget. If it still returns 200 after
#   30 minutes, the URL is not short-lived. If it changes to 403/404, that minute is the
#   upper limit the adapter must accommodate.
#
# Requirements
#   - curl
#   - (optional) KAPSO_API_KEY or --api-key, for the authenticated test
#
# Usage
#   ./check-media-url.sh "<media_data.url>" [options]
#
# Options
#   --api-key <key>      Project API key (default: $KAPSO_API_KEY when set)
#   --minutes "0 5 10"   Minutes at which to measure (default: "0 5 10 30")
#   --out <file>         CSV recording the results (default: ./kapso-media-url-lifetime.csv)
#   --download <file>    Also downloads bytes here at minute 0 to test the engine
#   -h | --help          This help
#
# Exit codes
#   0  completed all measurements (see the CSV for the conclusion)
#   1  usage error or curl is unavailable
#
# WARNING: with the default minutes, the script runs for 30 minutes. This is intentional:
# the measurement IS the wait. Leave it in a separate terminal.

set -uo pipefail

URL=""
API_KEY="${KAPSO_API_KEY:-}"
MINUTES="0 5 10 30"
OUT="./kapso-media-url-lifetime.csv"
DOWNLOAD=""

usage() {
  sed -n '2,36p' "$0" | sed 's/^# \{0,1\}//'
}

# The first positional argument is the URL.
while [ $# -gt 0 ]; do
  case "$1" in
    --api-key)  API_KEY="${2:-}";  shift 2 ;;
    --minutes)  MINUTES="${2:-}";  shift 2 ;;
    --out)      OUT="${2:-}";      shift 2 ;;
    --download) DOWNLOAD="${2:-}"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *)  if [ -z "$URL" ]; then URL="$1"; else echo "Unexpected argument: $1" >&2; exit 1; fi; shift ;;
  esac
done

if [ -z "$URL" ]; then
  echo "ERROR: a URL to measure is required." >&2
  echo "       Get it from poll-inbound.sh's output at summary.media_data.url" >&2
  usage >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: could not find 'curl' in PATH." >&2
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "WARNING: no API key. Only anonymous access will be tested."
  echo "       If the URL returns 401/403, we cannot distinguish 'requires credentials'"
  echo "       from 'expired'. Pass --api-key <key> or export KAPSO_API_KEY."
  echo ""
fi

# --- Log ----------------------------------------------------------------------

if [ ! -f "$OUT" ]; then
  echo "minute,epoch,iso_utc,http_anonymous,http_with_api_key,content_type,content_length,interpretation" > "$OUT"
fi

# probe_http <description> [extra headers...] -> prints "code|content_type|content_length"
probe_http() {
  local label="$1"; shift
  local temporary_headers
  temporary_headers="$(mktemp 2>/dev/null || echo "./.kapso-headers.$$")"

  local code
# -I = HEAD. It does not download bytes, which is what we want when measuring lifetime.
  #
  # -L is required: the Active Storage URL returns 302 to the real object. Without
  # following the redirect, we measure whether the redirector is alive rather than
  # whether the object still returns bytes. With -L, %{http_code} reports the FINAL code.
  code=$(curl -sS -I -L \
    --max-time 30 \
    -o "$temporary_headers" \
    -w '%{http_code}' \
    "$@" \
    "$URL" 2>/dev/null)
  local curl_exit_status=$?

  if [ $curl_exit_status -ne 0 ]; then
    rm -f "$temporary_headers"
    printf 'curl_error_%s||' "$curl_exit_status"
    return
  fi

  # Some signed storage endpoints reject HEAD. If so, retry with a 1-byte GET.
  if [ "$code" = "405" ] || [ "$code" = "501" ]; then
    code=$(curl -sS \
      --max-time 30 \
      -r 0-0 \
      -o /dev/null \
      -D "$temporary_headers" \
      -w '%{http_code}' \
      "$@" \
      "$URL" 2>/dev/null)
  fi

  local content_type content_length
  content_type=$(grep -i '^content-type:' "$temporary_headers" 2>/dev/null | tail -n 1 | tr -d '\r' | cut -d' ' -f2- | tr ',' ';')
  content_length=$(grep -i '^content-length:' "$temporary_headers" 2>/dev/null | tail -n 1 | tr -d '\r' | cut -d' ' -f2-)
  rm -f "$temporary_headers"

  printf '%s|%s|%s' "$code" "${content_type:-}" "${content_length:-}"
}

# interpretation_for <anonymous_code> <authenticated_code> -> interpretation for the CSV
interpretation_for() {
  local anonymous_code="$1" authenticated_code="$2"
  case "$anonymous_code" in
    200) echo "active and public (does not require credentials)" ;;
    401|403)
      if [ "$authenticated_code" = "200" ]; then
        echo "active but REQUIRES X-API-Key"
      elif [ -z "$authenticated_code" ]; then
        echo "rejects anonymous access ($anonymous_code); without an API key, expired and protected cannot be distinguished"
      else
        echo "rejects anonymous access ($anonymous_code) and API key ($authenticated_code): probably EXPIRED"
      fi
      ;;
    404) echo "does not exist / EXPIRED (404)" ;;
    curl_error_*) echo "network or DNS failure: $anonymous_code" ;;
    *) echo "unexpected code: $anonymous_code" ;;
  esac
}

echo "Measuring the Kapso media URL lifetime."
echo "  url     : ${URL}"
echo "  minutes: ${MINUTES}"
echo "  log    : ${OUT}"
echo ""

T0=$(date +%s)
PREVIOUS_SUCCESSFUL_MINUTE=""

for MINUTE in $MINUTES; do
  TARGET_TIME=$((T0 + MINUTE * 60))
  CURRENT_TIME=$(date +%s)
  WAIT_SECONDS=$((TARGET_TIME - CURRENT_TIME))

  if [ "$WAIT_SECONDS" -gt 0 ]; then
    echo "Waiting ${WAIT_SECONDS}s until minute ${MINUTE}..."
    sleep "$WAIT_SECONDS"
  fi

  ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  EPOCH=$(date +%s)

  # 1) Without credentials. Answers the question: "Is it public?"
  ANONYMOUS_RESPONSE=$(probe_http "anonymous")
  ANONYMOUS_CODE="${ANONYMOUS_RESPONSE%%|*}"
  REMAINDER="${ANONYMOUS_RESPONSE#*|}"
  CONTENT_TYPE="${REMAINDER%%|*}"
  CONTENT_LENGTH="${REMAINDER#*|}"

  # 2) With credentials, only when a key exists and anonymous access did not succeed.
  AUTHENTICATED_CODE=""
  if [ -n "$API_KEY" ] && [ "$ANONYMOUS_CODE" != "200" ] && [ "$ANONYMOUS_CODE" != "206" ]; then
    AUTHENTICATED_RESPONSE=$(probe_http "with-api-key" -H "X-API-Key: ${API_KEY}")
    AUTHENTICATED_CODE="${AUTHENTICATED_RESPONSE%%|*}"
    AUTHENTICATED_REMAINDER="${AUTHENTICATED_RESPONSE#*|}"
    if [ -z "$CONTENT_TYPE" ]; then CONTENT_TYPE="${AUTHENTICATED_REMAINDER%%|*}"; fi
    if [ -z "$CONTENT_LENGTH" ]; then CONTENT_LENGTH="${AUTHENTICATED_REMAINDER#*|}"; fi
  fi

  INTERPRETATION=$(interpretation_for "$ANONYMOUS_CODE" "$AUTHENTICATED_CODE")

  printf 'minute %-3s  anonymous=%-4s  api_key=%-4s  %s\n' \
    "$MINUTE" "$ANONYMOUS_CODE" "${AUTHENTICATED_CODE:--}" "$INTERPRETATION"

  echo "${MINUTE},${EPOCH},${ISO},${ANONYMOUS_CODE},${AUTHENTICATED_CODE},${CONTENT_TYPE},${CONTENT_LENGTH},\"${INTERPRETATION}\"" >> "$OUT"

  # Mark the interval in which the URL expired, the detail relevant to the adapter.
  if [ "$ANONYMOUS_CODE" = "200" ] || [ "$AUTHENTICATED_CODE" = "200" ]; then
    PREVIOUS_SUCCESSFUL_MINUTE="$MINUTE"
  elif [ -n "$PREVIOUS_SUCCESSFUL_MINUTE" ]; then
    echo ""
    echo "  >> The URL stopped serving bytes between minute ${PREVIOUS_SUCCESSFUL_MINUTE} and minute ${MINUTE}."
    echo "     That interval is the download adapter's maximum time budget."
  fi

  # At minute 0, optionally download bytes to test them against the engine.
  if [ "$MINUTE" = "0" ] && [ -n "$DOWNLOAD" ]; then
    echo "  Downloading bytes to ${DOWNLOAD} ..."
    # curl forwards -H headers to the next hops in a redirect. The Active Storage URL
    # redirects to another host, so combining -L with X-API-Key exposes the project key
    # to storage. Resolve it in two steps: request without following, then download the
    # final object WITHOUT the header.
    if [ -n "$API_KEY" ]; then
      destination=$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 30 -H "X-API-Key: ${API_KEY}" "$URL" 2>/dev/null)
      if [ -n "$destination" ]; then
        echo "  Redirect to another host: the key is NOT forwarded."
        curl -sS --max-time 60 "$destination" -o "$DOWNLOAD"
      else
        curl -sS --max-time 60 -H "X-API-Key: ${API_KEY}" "$URL" -o "$DOWNLOAD"
      fi
    else
      curl -sSL --max-time 60 "$URL" -o "$DOWNLOAD"
    fi
    if [ -s "$DOWNLOAD" ]; then
      echo "  Downloaded $(wc -c < "$DOWNLOAD" | tr -d ' ') bytes."
      echo "  Test them against the verification engine:"
      echo "    node -e \"require('./packages/verification/dist/decode.js').decodeImage(require('fs').readFileSync('${DOWNLOAD}')).then(r=>console.log(r))\""
    else
      echo "  The file is empty: the download did not return bytes."
    fi
  fi
done

echo ""
echo "Done. Full log at: ${OUT}"
echo ""
echo "How to read it:"
echo "  - 200 at every minute -> the URL is NOT short-lived; the adapter should still"
echo "    download on webhook receipt because the fallback path expires after 5 min."
echo "  - 401/403 anonymous and 200 with X-API-Key -> the URL requires project credentials."
echo "    Kapso documentation does NOT publish this; record it in the report."
echo "  - 403/404 from a given minute -> that is the actual lifetime limit."
