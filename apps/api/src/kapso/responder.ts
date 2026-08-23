/**
 * Envío de la respuesta por WhatsApp, a través del proxy de Meta de Kapso.
 *
 * Sobre el costo, que acá no es un detalle: el plan gratuito da 2.000 mensajes
 * por mes y **Kapso cuenta los entrantes y los salientes contra la misma
 * cuota**. Una verificación son dos mensajes como mínimo, así que el techo real
 * son ~1.000 verificaciones mensuales. Cada mensaje de cortesía que el bot
 * agregue —un "recibí tu foto", un acuse— cuesta un tercio de la capacidad del
 * plan. Por eso este módulo manda **un solo mensaje por consulta** y no expone
 * ninguna forma cómoda de mandar dos.
 *
 * Ver `docs/research/kapso-free-tier.md`.
 */

const BASE = process.env.KAPSO_API_BASE ?? 'https://api.kapso.ai/meta/whatsapp/v24.0'
const TIMEOUT_MS = 15_000

export interface Envio {
  ok: boolean
  error: string | null
}

export async function responderTexto(
  phoneNumberId: string,
  destinatario: string,
  texto: string
): Promise<Envio> {
  const apiKey = process.env.KAPSO_API_KEY
  if (!apiKey) return { ok: false, error: 'no hay KAPSO_API_KEY configurada' }

  const url = BASE + '/' + encodeURIComponent(phoneNumberId) + '/messages'

  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: destinatario,
        type: 'text',
        text: { body: texto },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!respuesta.ok) {
      const detalle = (await respuesta.text()).slice(0, 300)
      return { ok: false, error: String(respuesta.status) + ' ' + detalle }
    }
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
