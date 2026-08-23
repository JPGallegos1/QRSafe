#!/usr/bin/env bash
#
# check-media-url.sh — mide la VIGENCIA y la AUTENTICACIÓN de una URL de media de Kapso.
#
# Para qué sirve
#   Kapso NO publica cuánto vive `kapso.media_data.url` ni si requiere credencial.
#   Son los dos vacíos que la sección 4 del informe declara y que este script mide:
#     - vigencia: golpea la misma URL a los 0, 5, 10 y 30 minutos y anota el código HTTP
#     - autenticación: prueba primero SIN credencial y, si da 401/403, reintenta con X-API-Key
#
#   El resultado define el presupuesto de tiempo del adaptador de descarga. Si a los
#   30 minutos sigue devolviendo 200, la URL no es de vida corta. Si en algún momento
#   pasa a 403/404, ese minuto es el techo contra el que hay que diseñar.
#
# Requisitos
#   - curl
#   - (opcional) KAPSO_API_KEY o --api-key, para la prueba autenticada
#
# Uso
#   ./check-media-url.sh "<media_data.url>" [opciones]
#
# Opciones
#   --api-key <key>      API key de proyecto (default: $KAPSO_API_KEY si está seteada)
#   --minutes "0 5 10"   Minutos en los que medir (default: "0 5 10 30")
#   --out <archivo>      CSV con el registro (default: ./kapso-media-url-vigencia.csv)
#   --download <archivo> Además, en el minuto 0, baja los bytes acá para probar el motor
#   -h | --help          Esta ayuda
#
# Códigos de salida
#   0  terminó todas las mediciones (mirá el CSV para el veredicto)
#   1  error de uso o falta curl
#
# ADVERTENCIA: con los minutos por defecto el script corre 30 minutos. Es intencional:
# la medición ES la espera. Dejalo en una terminal aparte.

set -uo pipefail

URL=""
API_KEY="${KAPSO_API_KEY:-}"
MINUTOS="0 5 10 30"
OUT="./kapso-media-url-vigencia.csv"
DOWNLOAD=""

usage() {
  sed -n '2,36p' "$0" | sed 's/^# \{0,1\}//'
}

# El primer argumento posicional es la URL.
while [ $# -gt 0 ]; do
  case "$1" in
    --api-key)  API_KEY="${2:-}";  shift 2 ;;
    --minutes)  MINUTOS="${2:-}";  shift 2 ;;
    --out)      OUT="${2:-}";      shift 2 ;;
    --download) DOWNLOAD="${2:-}"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    -*) echo "Opción desconocida: $1" >&2; usage >&2; exit 1 ;;
    *)  if [ -z "$URL" ]; then URL="$1"; else echo "Argumento de más: $1" >&2; exit 1; fi; shift ;;
  esac
done

if [ -z "$URL" ]; then
  echo "ERROR: falta la URL a medir." >&2
  echo "       Sacala del payload que dejó poll-inbound.sh, en resumen.media_data.url" >&2
  usage >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: no encuentro 'curl' en el PATH." >&2
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "AVISO: sin API key. Sólo se prueba el acceso anónimo."
  echo "       Si la URL responde 401/403, no vamos a poder distinguir 'requiere credencial'"
  echo "       de 'venció'. Pasá --api-key <key> o exportá KAPSO_API_KEY."
  echo ""
fi

# --- Registro -----------------------------------------------------------------

if [ ! -f "$OUT" ]; then
  echo "minuto,epoch,iso_utc,http_anonimo,http_con_api_key,content_type,content_length,lectura" > "$OUT"
fi

# sonda_http <descripción> [headers extra...] → imprime "codigo|content_type|content_length"
sonda_http() {
  local etiqueta="$1"; shift
  local headers_tmp
  headers_tmp="$(mktemp 2>/dev/null || echo "./.kapso-headers.$$")"

  local codigo
  # -I = HEAD. No baja los bytes, que es lo que queremos para medir vigencia.
  #
  # -L es obligatorio: la URL de Active Storage devuelve 302 hacia el objeto
  # real. Sin seguir el redirect medimos si el redirector sigue vivo, que no es
  # la pregunta; la pregunta es si el objeto todavia entrega bytes. Un 302 sin
  # seguir quedaba clasificado como inesperado y la medicion no servia.
  # Con -L, %{http_code} reporta el codigo FINAL de la cadena.
  codigo=$(curl -sS -I -L \
    --max-time 30 \
    -o "$headers_tmp" \
    -w '%{http_code}' \
    "$@" \
    "$URL" 2>/dev/null)
  local curl_status=$?

  if [ $curl_status -ne 0 ]; then
    rm -f "$headers_tmp"
    printf 'curl_error_%s||' "$curl_status"
    return
  fi

  # Algunos storages firmados rechazan HEAD. Si pasa, reintentamos con un GET de 1 byte.
  if [ "$codigo" = "405" ] || [ "$codigo" = "501" ]; then
    codigo=$(curl -sS \
      --max-time 30 \
      -r 0-0 \
      -o /dev/null \
      -D "$headers_tmp" \
      -w '%{http_code}' \
      "$@" \
      "$URL" 2>/dev/null)
  fi

  local ctype clen
  ctype=$(grep -i '^content-type:' "$headers_tmp" 2>/dev/null | tail -n 1 | tr -d '\r' | cut -d' ' -f2- | tr ',' ';')
  clen=$(grep -i '^content-length:'  "$headers_tmp" 2>/dev/null | tail -n 1 | tr -d '\r' | cut -d' ' -f2-)
  rm -f "$headers_tmp"

  printf '%s|%s|%s' "$codigo" "${ctype:-}" "${clen:-}"
}

# lectura_de <codigo_anon> <codigo_auth> → frase interpretativa para el CSV
lectura_de() {
  local anon="$1" auth="$2"
  case "$anon" in
    200) echo "vigente y publica (no requiere credencial)" ;;
    401|403)
      if [ "$auth" = "200" ]; then
        echo "vigente pero REQUIERE X-API-Key"
      elif [ -z "$auth" ]; then
        echo "rechaza anonimo ($anon); sin API key no se puede distinguir vencida de protegida"
      else
        echo "rechaza anonimo ($anon) y tambien con API key ($auth): probablemente VENCIDA"
      fi
      ;;
    404) echo "no existe / VENCIDA (404)" ;;
    curl_error_*) echo "fallo de red o DNS: $anon" ;;
    *) echo "codigo inesperado: $anon" ;;
  esac
}

echo "Midiendo vigencia de la URL de media de Kapso."
echo "  url     : ${URL}"
echo "  minutos : ${MINUTOS}"
echo "  registro: ${OUT}"
echo ""

T0=$(date +%s)
ANTERIOR_OK=""

for MIN in $MINUTOS; do
  OBJETIVO=$((T0 + MIN * 60))
  AHORA=$(date +%s)
  ESPERA=$((OBJETIVO - AHORA))

  if [ "$ESPERA" -gt 0 ]; then
    echo "Esperando ${ESPERA}s hasta el minuto ${MIN}..."
    sleep "$ESPERA"
  fi

  ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  EPOCH=$(date +%s)

  # 1) Sin credencial. Responde la pregunta "¿es pública?".
  RES_ANON=$(sonda_http "anonimo")
  COD_ANON="${RES_ANON%%|*}"
  RESTO="${RES_ANON#*|}"
  CTYPE="${RESTO%%|*}"
  CLEN="${RESTO#*|}"

  # 2) Con credencial, sólo si hay key y el anónimo no pasó.
  COD_AUTH=""
  if [ -n "$API_KEY" ] && [ "$COD_ANON" != "200" ] && [ "$COD_ANON" != "206" ]; then
    RES_AUTH=$(sonda_http "con-api-key" -H "X-API-Key: ${API_KEY}")
    COD_AUTH="${RES_AUTH%%|*}"
    RESTO_AUTH="${RES_AUTH#*|}"
    if [ -z "$CTYPE" ]; then CTYPE="${RESTO_AUTH%%|*}"; fi
    if [ -z "$CLEN"  ]; then CLEN="${RESTO_AUTH#*|}";  fi
  fi

  LECTURA=$(lectura_de "$COD_ANON" "$COD_AUTH")

  printf 'minuto %-3s  anon=%-4s  api_key=%-4s  %s\n' \
    "$MIN" "$COD_ANON" "${COD_AUTH:--}" "$LECTURA"

  echo "${MIN},${EPOCH},${ISO},${COD_ANON},${COD_AUTH},${CTYPE},${CLEN},\"${LECTURA}\"" >> "$OUT"

  # Marcamos el intervalo dentro del cual expiró, que es el dato que le importa al adaptador.
  if [ "$COD_ANON" = "200" ] || [ "$COD_AUTH" = "200" ]; then
    ANTERIOR_OK="$MIN"
  elif [ -n "$ANTERIOR_OK" ]; then
    echo ""
    echo "  >> La URL dejó de servir bytes entre el minuto ${ANTERIOR_OK} y el minuto ${MIN}."
    echo "     Ese intervalo es el presupuesto máximo del adaptador de descarga."
  fi

  # En el minuto 0, opcionalmente bajamos los bytes para probarlos contra el motor.
  if [ "$MIN" = "0" ] && [ -n "$DOWNLOAD" ]; then
    echo "  Descargando bytes a ${DOWNLOAD} ..."
    # OJO: curl reenvía las cabeceras -H a los saltos siguientes de un redirect.
    # La URL de Active Storage salta a otro host, así que combinar -L con
    # X-API-Key le entrega la clave del proyecto al storage. Se resuelve en dos
    # pasos: pedimos sin seguir, y el objeto final se baja SIN la cabecera.
    if [ -n "$API_KEY" ]; then
      destino=$(curl -sS -o /dev/null -w '%{redirect_url}'         --max-time 30 -H "X-API-Key: ${API_KEY}" "$URL" 2>/dev/null)
      if [ -n "$destino" ]; then
        echo "  Redirect a otro host: la clave NO se reenvía."
        curl -sS --max-time 60 "$destino" -o "$DOWNLOAD"
      else
        curl -sS --max-time 60 -H "X-API-Key: ${API_KEY}" "$URL" -o "$DOWNLOAD"
      fi
    else
      curl -sSL --max-time 60 "$URL" -o "$DOWNLOAD"
    fi
    if [ -s "$DOWNLOAD" ]; then
      echo "  Bajados $(wc -c < "$DOWNLOAD" | tr -d ' ') bytes."
      echo "  Probalos contra el motor de verificación:"
      echo "    node -e \"require('./packages/verification/dist/decode.js').decodeImage(require('fs').readFileSync('${DOWNLOAD}')).then(r=>console.log(r))\""
    else
      echo "  El archivo quedó vacío: la descarga no devolvió bytes."
    fi
  fi
done

echo ""
echo "Listo. Registro completo en: ${OUT}"
echo ""
echo "Cómo leerlo:"
echo "  - 200 en todos los minutos  -> la URL NO es de vida corta; igual el adaptador"
echo "    descarga al recibir el webhook, porque el camino de respaldo vence en 5 min."
echo "  - 401/403 con anon y 200 con X-API-Key -> la URL requiere credencial de proyecto."
echo "    Es un dato que la documentación de Kapso NO publica; anotalo en el informe."
echo "  - 403/404 a partir de cierto minuto -> ese es el techo real de vigencia."
