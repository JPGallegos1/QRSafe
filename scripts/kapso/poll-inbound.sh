#!/usr/bin/env bash
#
# poll-inbound.sh — detects the first INBOUND message with media for a Kapso number.
#
# Purpose
#   Completes step 3 of docs/research/kapso-whatsapp-sandbox-bot.md without requiring
#   someone to watch the console: start the script, send the photo from the phone, and
#   the script detects the message and writes the full payload to disk.
#
# Question it helps answer
#   Does the Kapso WhatsApp sandbox deliver messages with images, or text only?
#   The cutoff criterion is `kapso.has_media == true` on a real inbound message.
#
# Requirements
#   - kapso CLI (>= 0.18.0) installed and AUTHENTICATED (`kapso login` or KAPSO_API_KEY).
#   - node (the script parses JSON with node; it does NOT require jq).
#
# CLI syntax verified against `kapso whatsapp messages list --help` (v0.18.0).
# The CLI JSON is wrapped: { "data": [...], "paging": {...} }, NOT a bare array.
#
# Usage
#   ./poll-inbound.sh --phone-number-id <ID> [options]
#   ./poll-inbound.sh --phone-number "+5491122223333" [options]
#
# Options
#   --phone-number-id <id>   Meta's internal number ID (`kapso whatsapp numbers list` provides it)
#   --phone-number <e164>    Displayed number; the CLI resolves it to the ID
#   --interval <seconds>     Seconds between queries (default: 10)
#   --timeout <seconds>      Stops after this total time (default: 900 = 15 min)
#   --limit <n>              Inbound messages to fetch per query (default: 5)
#   --out <file>             Where to save the full payload (default: ./kapso-inbound-media.json)
#   -h | --help              This help
#
# Exit codes
#   0  found an inbound message with has_media == true (payload in --out)
#   1  usage error or missing dependency
#   2  --timeout elapsed without seeing media
#
# NOTE: if the number is a sandbox number, its session must be ACTIVE before running this.
# Creating and activating the session requires the dashboard and phone; CLI 0.18.0 exposes
# no sandbox command (verified: the word "sandbox" does not appear in its code).

set -uo pipefail

INTERVAL=10
TIMEOUT=900
LIMIT=5
OUT="./kapso-inbound-media.json"
PHONE_NUMBER_ID=""
PHONE_NUMBER=""

usage() {
  # Prints the comment block above as help.
  sed -n '2,45p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --phone-number-id) PHONE_NUMBER_ID="${2:-}"; shift 2 ;;
    --phone-number)    PHONE_NUMBER="${2:-}";    shift 2 ;;
    --interval)        INTERVAL="${2:-}";        shift 2 ;;
    --timeout)         TIMEOUT="${2:-}";         shift 2 ;;
    --limit)           LIMIT="${2:-}";           shift 2 ;;
    --out)             OUT="${2:-}";             shift 2 ;;
    -h|--help)         usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# --- Preflight checks ---------------------------------------------------------

if ! command -v kapso >/dev/null 2>&1; then
  echo "ERROR: could not find the 'kapso' command in PATH." >&2
  echo "       Install it with: npm install -g @kapso/cli" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: could not find 'node' in PATH. The script uses it to parse JSON." >&2
  exit 1
fi

if [ -z "$PHONE_NUMBER_ID" ] && [ -z "$PHONE_NUMBER" ]; then
  echo "ERROR: --phone-number-id or --phone-number is required." >&2
  echo "       List available numbers with:" >&2
  echo "         kapso whatsapp numbers list --output json" >&2
  exit 1
fi

# Build the selector as an array so the CLI receives its documented flags.
SELECTOR=()
if [ -n "$PHONE_NUMBER_ID" ]; then
  SELECTOR=(--phone-number-id "$PHONE_NUMBER_ID")
else
  SELECTOR=(--phone-number "$PHONE_NUMBER")
fi

# Warn early when credentials are unavailable.
# The existence of ~/.kapso/cli alone does NOT mean a session exists: the CLI creates that
# directory on first startup, even before login. The only reliable signal is
# `kapso status --output json`, which returns "authenticated": false.
STATUS=$(kapso status --output json 2>&1)
if printf '%s' "$STATUS" | grep -q '"authenticated": *false'; then
  echo "WARNING: the CLI reports authenticated=false. All queries will fail with" >&2
  echo "       'Not authenticated. Run \"kapso login\" first.'" >&2
  echo "       Authenticate first: run 'kapso login' interactively or export KAPSO_API_KEY." >&2
  echo "" >&2
fi

# --- Response parser ----------------------------------------------------------
# Reads CLI JSON from stdin. Exits 0 when media is found, 10 when not, 20 when unparseable.
# It is deliberately defensive: accepts the { data: [...] } envelope, a bare array,
# and snake_case / camelCase variants of Kapso fields.
read -r -d '' NODE_FINDER <<'NODE_EOF'
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Not JSON: this is almost always a plaintext CLI error message.
    process.stderr.write('   non-JSON CLI response: ' + raw.trim().slice(0, 300) + '\n');
    process.exit(20);
  }

  // CLI 0.18.0 returns { data: [...], paging: {...} }. Accept a bare array in case
  // a future version changes the shape.
  const list = Array.isArray(payload) ? payload : (payload.data ?? []);
  if (!Array.isArray(list)) {
    process.stderr.write('   unexpected shape: could not find a message array\n');
    process.exit(20);
  }

  const pick = (obj, ...keys) => {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return undefined;
  };

  const hit = list.find((m) => {
    const k = m?.kapso ?? {};
    return pick(k, 'has_media', 'hasMedia') === true;
  });

  if (!hit) {
    // No media yet: report what did arrive so the operator can track progress.
    const summary = list.map((m) => {
      const k = m?.kapso ?? {};
      const media = pick(k, 'has_media', 'hasMedia');
      return `${m?.type ?? 'unknown'}(has_media=${media === undefined ? 'missing' : media})`;
    });
    process.stderr.write(
      `   ${list.length} inbound message(s), none with media` +
      (summary.length ? `: ${summary.join(', ')}` : '') + '\n'
    );
    process.exit(10);
  }

  const k = hit.kapso ?? {};
  const mediaData = pick(k, 'media_data', 'mediaData') ?? {};
  const out = {
    message_id: hit.id,
    type: hit.type,
    timestamp: hit.timestamp,
    // Meta media_id: fallback path, 7-day window.
    meta_media_id: hit.image?.id ?? hit.video?.id ?? hit.document?.id ?? hit.audio?.id ?? null,
    caption: hit.image?.caption ?? null,
    has_media: pick(k, 'has_media', 'hasMedia'),
    media_url: pick(k, 'media_url', 'mediaUrl') ?? null,
    media_data: {
      url: pick(mediaData, 'url') ?? null,
      filename: pick(mediaData, 'filename') ?? null,
      content_type: pick(mediaData, 'content_type', 'contentType') ?? null,
      byte_size: pick(mediaData, 'byte_size', 'byteSize') ?? null,
    },
    conversation_id: pick(k, 'whatsapp_conversation_id', 'whatsappConversationId') ?? null,
  };

  process.stdout.write(JSON.stringify({ summary: out, full_message: hit }, null, 2));
  process.exit(0);
});
NODE_EOF

# --- Query loop ---------------------------------------------------------------

START_TIME=$(date +%s)
DEADLINE=$((START_TIME + TIMEOUT))
ATTEMPT=0

echo "Listening for inbound messages in Kapso."
echo "  selector : ${SELECTOR[*]}"
echo "  interval: ${INTERVAL}s   timeout: ${TIMEOUT}s   limit: ${LIMIT}"
echo "  output  : ${OUT}"
echo ""
echo "NOW: send the QR photo from the phone to the WhatsApp number."
echo ""

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  ATTEMPT=$((ATTEMPT + 1))
  ELAPSED=$(( $(date +%s) - START_TIME ))
  printf '[%03d] t+%ss ... ' "$ATTEMPT" "$ELAPSED"

  # Intentionally capture stderr: preserve CLI error text when it fails.
  RESPONSE=$(kapso whatsapp messages list \
    "${SELECTOR[@]}" \
    --direction inbound \
    --limit "$LIMIT" \
    --output json 2>&1)
  CLI_EXIT_STATUS=$?

  if [ $CLI_EXIT_STATUS -ne 0 ]; then
    # Do not stop: a transient error (network, rate limit) should not end the wait.
    # Authentication errors are terminal, but leave them visible on screen.
    echo "the CLI failed (exit ${CLI_EXIT_STATUS})"
    echo "      ${RESPONSE}" | head -n 3
    sleep "$INTERVAL"
    continue
  fi

  MATCH=$(printf '%s' "$RESPONSE" | node -e "$NODE_FINDER")
  NODE_EXIT_STATUS=$?

  case $NODE_EXIT_STATUS in
    0)
      echo "FOUND"
      echo ""
      echo "=== INBOUND message WITH media ==="
      printf '%s\n' "$MATCH" | node -e "
        let raw='';process.stdin.setEncoding('utf8');
        process.stdin.on('data',c=>raw+=c);
        process.stdin.on('end',()=>{
          const p=JSON.parse(raw);
          console.log(JSON.stringify(p.summary,null,2));
        });
      "
      printf '%s' "$MATCH" > "$OUT"
      echo ""
      echo "Full payload saved to: ${OUT}"
      echo ""
      echo "Next step: measure the media URL lifetime."
      echo "  ./check-media-url.sh \"<summary.media_data.url from above>\""
      exit 0
      ;;
    10)
      # No media yet. The parser already wrote details to stderr.
      ;;
    *)
      echo "      (could not parse the response; retrying)"
      ;;
  esac

  sleep "$INTERVAL"
done

echo ""
echo "TIMEOUT: ${TIMEOUT}s elapsed without an inbound message with has_media == true."
echo ""
echo "This does NOT yet prove that the sandbox does not deliver media. Before concluding, check:"
echo "  1. The sandbox session is ACTIVE (the code expires after 15 minutes)."
echo "  2. --phone-number-id belongs to the number that received the photo."
echo "  3. What actually arrived, without filtering by direction or media:"
echo "       kapso whatsapp messages list ${SELECTOR[*]} --limit 10 --output json"
echo "  4. If the message appears with type=image but has_media=false, the sandbox receives"
echo "     the image but does not ingest it: message.image.id via the Meta proxy remains."
exit 2
