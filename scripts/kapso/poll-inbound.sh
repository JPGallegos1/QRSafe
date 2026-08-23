#!/usr/bin/env bash
#
# poll-inbound.sh — detecta el primer mensaje ENTRANTE con media en un número de Kapso.
#
# Para qué sirve
#   Cierra el paso 3 del runbook de docs/research/kapso-whatsapp-sandbox-bot.md sin que
#   la persona tenga que mirar la consola: arranca el script, manda la foto desde el
#   teléfono, y el script detecta solo el mensaje y vuelca el payload completo a disco.
#
# La pregunta que ayuda a responder
#   ¿El sandbox de WhatsApp de Kapso entrega mensajes con imagen, o sólo texto?
#   El criterio de corte es `kapso.has_media == true` sobre un mensaje entrante real.
#
# Requisitos
#   - kapso CLI (>= 0.18.0) instalado y AUTENTICADO (`kapso login` o KAPSO_API_KEY).
#   - node (el script parsea JSON con node; NO necesita jq).
#
# Sintaxis del CLI verificada contra `kapso whatsapp messages list --help` (v0.18.0).
# El JSON del CLI viene envuelto: { "data": [...], "paging": {...} }, NO es un array suelto.
#
# Uso
#   ./poll-inbound.sh --phone-number-id <ID> [opciones]
#   ./poll-inbound.sh --phone-number "+5491122223333" [opciones]
#
# Opciones
#   --phone-number-id <id>   ID interno de Meta del número (lo da `kapso whatsapp numbers list`)
#   --phone-number <e164>    Número visible; el CLI lo resuelve al ID
#   --interval <seg>         Segundos entre consultas (default: 10)
#   --timeout <seg>          Corta después de este tiempo total (default: 900 = 15 min)
#   --limit <n>              Mensajes entrantes a traer por consulta (default: 5)
#   --out <archivo>          Dónde guardar el payload completo (default: ./kapso-inbound-media.json)
#   -h | --help              Esta ayuda
#
# Códigos de salida
#   0  encontró un mensaje entrante con has_media == true (payload en --out)
#   1  error de uso o falta una dependencia
#   2  se agotó el --timeout sin ver media
#
# NOTA: si el número es de sandbox, la sesión tiene que estar ACTIVA antes de correr esto.
# Crear y activar la sesión es un paso de dashboard + teléfono; el CLI 0.18.0 no expone
# ningún comando de sandbox (verificado: la palabra "sandbox" no aparece en su código).

set -uo pipefail

INTERVAL=10
TIMEOUT=900
LIMIT=5
OUT="./kapso-inbound-media.json"
PHONE_NUMBER_ID=""
PHONE_NUMBER=""

usage() {
  # Imprime el bloque de comentarios de arriba como ayuda.
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
    *) echo "Opción desconocida: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# --- Validaciones previas -----------------------------------------------------

if ! command -v kapso >/dev/null 2>&1; then
  echo "ERROR: no encuentro el comando 'kapso' en el PATH." >&2
  echo "       Instalalo con: npm install -g @kapso/cli" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: no encuentro 'node' en el PATH. El script lo usa para parsear JSON." >&2
  exit 1
fi

if [ -z "$PHONE_NUMBER_ID" ] && [ -z "$PHONE_NUMBER" ]; then
  echo "ERROR: falta --phone-number-id o --phone-number." >&2
  echo "       Listá los números disponibles con:" >&2
  echo "         kapso whatsapp numbers list --output json" >&2
  exit 1
fi

# Armamos el selector como array para que el CLI reciba los flags reales que documenta.
SELECTOR=()
if [ -n "$PHONE_NUMBER_ID" ]; then
  SELECTOR=(--phone-number-id "$PHONE_NUMBER_ID")
else
  SELECTOR=(--phone-number "$PHONE_NUMBER")
fi

# Aviso temprano si no hay credencial.
# OJO: la sola existencia de ~/.kapso/cli NO significa que haya sesión — el CLI crea ese
# directorio en el primer arranque, aunque nunca hayas hecho login. La única señal
# confiable es `kapso status --output json`, que devuelve "authenticated": false.
ESTADO=$(kapso status --output json 2>&1)
if printf '%s' "$ESTADO" | grep -q '"authenticated": *false'; then
  echo "AVISO: el CLI reporta authenticated=false. Todas las consultas van a fallar con" >&2
  echo "       'Not authenticated. Run \"kapso login\" first.'" >&2
  echo "       Autenticá primero: 'kapso login' (interactivo) o exportá KAPSO_API_KEY." >&2
  echo "" >&2
fi

# --- Parser de la respuesta ---------------------------------------------------
# Recibe el JSON del CLI por stdin. Sale 0 si encontró media, 10 si no, 20 si no parsea.
# Es defensivo a propósito: tolera el envelope { data: [...] }, un array suelto,
# y las variantes snake_case / camelCase de los campos de Kapso.
read -r -d '' NODE_FINDER <<'NODE_EOF'
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // No es JSON: casi siempre es un mensaje de error del CLI en texto plano.
    process.stderr.write('   respuesta no-JSON del CLI: ' + raw.trim().slice(0, 300) + '\n');
    process.exit(20);
  }

  // El CLI 0.18.0 devuelve { data: [...], paging: {...} }. Toleramos un array suelto
  // por si la forma cambia en una versión futura.
  const list = Array.isArray(payload) ? payload : (payload.data ?? []);
  if (!Array.isArray(list)) {
    process.stderr.write('   forma inesperada: no encuentro un array de mensajes\n');
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
    // Sin media todavía: reportamos qué SÍ llegó, para que la persona vea el avance.
    const resumen = list.map((m) => {
      const k = m?.kapso ?? {};
      const media = pick(k, 'has_media', 'hasMedia');
      return `${m?.type ?? 'unknown'}(has_media=${media === undefined ? 'ausente' : media})`;
    });
    process.stderr.write(
      `   ${list.length} entrante(s), ninguno con media` +
      (resumen.length ? `: ${resumen.join(', ')}` : '') + '\n'
    );
    process.exit(10);
  }

  const k = hit.kapso ?? {};
  const mediaData = pick(k, 'media_data', 'mediaData') ?? {};
  const out = {
    message_id: hit.id,
    type: hit.type,
    timestamp: hit.timestamp,
    // media_id de Meta: camino de respaldo, ventana de 7 días.
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

  process.stdout.write(JSON.stringify({ resumen: out, mensaje_completo: hit }, null, 2));
  process.exit(0);
});
NODE_EOF

# --- Bucle de consulta --------------------------------------------------------

INICIO=$(date +%s)
LIMITE=$((INICIO + TIMEOUT))
VUELTA=0

echo "Escuchando mensajes entrantes en Kapso."
echo "  selector : ${SELECTOR[*]}"
echo "  intervalo: ${INTERVAL}s   timeout: ${TIMEOUT}s   limit: ${LIMIT}"
echo "  salida   : ${OUT}"
echo ""
echo "AHORA: mandá la foto con el QR desde el teléfono al número de WhatsApp."
echo ""

while [ "$(date +%s)" -lt "$LIMITE" ]; do
  VUELTA=$((VUELTA + 1))
  TRANSCURRIDO=$(( $(date +%s) - INICIO ))
  printf '[%03d] t+%ss ... ' "$VUELTA" "$TRANSCURRIDO"

  # 2>&1 a propósito: si el CLI falla, queremos el texto del error, no perderlo.
  RESPUESTA=$(kapso whatsapp messages list \
    "${SELECTOR[@]}" \
    --direction inbound \
    --limit "$LIMIT" \
    --output json 2>&1)
  CLI_STATUS=$?

  if [ $CLI_STATUS -ne 0 ]; then
    # No cortamos: un error transitorio (red, rate limit) no debe matar la espera.
    # Un error de autenticación sí es terminal, pero lo dejamos visible en pantalla.
    echo "el CLI falló (exit ${CLI_STATUS})"
    echo "      ${RESPUESTA}" | head -n 3
    sleep "$INTERVAL"
    continue
  fi

  HALLAZGO=$(printf '%s' "$RESPUESTA" | node -e "$NODE_FINDER")
  NODE_STATUS=$?

  case $NODE_STATUS in
    0)
      echo "ENCONTRADO"
      echo ""
      echo "=== Mensaje entrante CON media ==="
      printf '%s\n' "$HALLAZGO" | node -e "
        let raw='';process.stdin.setEncoding('utf8');
        process.stdin.on('data',c=>raw+=c);
        process.stdin.on('end',()=>{
          const p=JSON.parse(raw);
          console.log(JSON.stringify(p.resumen,null,2));
        });
      "
      printf '%s' "$HALLAZGO" > "$OUT"
      echo ""
      echo "Payload completo guardado en: ${OUT}"
      echo ""
      echo "Siguiente paso: medir la vigencia de la URL de media."
      echo "  ./check-media-url.sh \"<media_data.url de arriba>\""
      exit 0
      ;;
    10)
      # Sin media todavía. El detalle ya lo imprimió el parser por stderr.
      ;;
    *)
      echo "      (no pude interpretar la respuesta; reintento)"
      ;;
  esac

  sleep "$INTERVAL"
done

echo ""
echo "TIMEOUT: pasaron ${TIMEOUT}s sin ver un mensaje entrante con has_media == true."
echo ""
echo "Esto NO prueba todavía que el sandbox no entregue media. Antes de concluir, revisá:"
echo "  1. Que la sesión de sandbox esté ACTIVA (el código vence a los 15 minutos)."
echo "  2. Que el --phone-number-id sea el del número al que mandaste la foto."
echo "  3. Qué llegó realmente, sin filtrar por dirección ni por media:"
echo "       kapso whatsapp messages list ${SELECTOR[*]} --limit 10 --output json"
echo "  4. Si el mensaje aparece con type=image pero has_media=false, el sandbox recibe"
echo "     la imagen pero no la ingesta: queda el camino message.image.id vía proxy Meta."
exit 2
