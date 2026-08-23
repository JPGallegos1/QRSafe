/**
 * Sends the WhatsApp reply through Kapso's Meta proxy.
 *
 * Cost matters here: the free plan provides 2,000 messages per month and
 * **Kapso counts inbound and outbound messages against the same quota**. A
 * verification needs at least two messages, so the practical ceiling is about
 * 1,000 monthly verifications. This module sends **one reply per query**.
 *
 * See `docs/research/kapso-free-tier.md`.
 */

const BASE = process.env.KAPSO_API_BASE ?? 'https://api.kapso.ai/meta/whatsapp/v24.0'
const TIMEOUT_MS = 15_000

export interface SendResult {
  ok: boolean
  error: string | null
}

export async function sendText(
  phoneNumberId: string,
  recipient: string,
  text: string
): Promise<SendResult> {
  const apiKey = process.env.KAPSO_API_KEY
  if (!apiKey) return { ok: false, error: 'KAPSO_API_KEY is not configured' }

  const url = BASE + '/' + encodeURIComponent(phoneNumberId) + '/messages'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { body: text },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300)
      return { ok: false, error: String(response.status) + ' ' + detail }
    }
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
