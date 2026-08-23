import crypto from 'node:crypto'

/**
 * Kapso webhook signature verification.
 *
 * Kapso signs with HMAC SHA256 using the webhook secret and sends the result in
 * the `X-Webhook-Signature` header.
 *
 * The signature is calculated from the **raw body**, not a parsed and
 * reserialized object. `JSON.stringify` can change key order, whitespace, or
 * number formatting, any of which breaks the HMAC. The server therefore keeps
 * the original Buffer.
 *
 * Kapso documentation is ambiguous here: it refers to the "raw JSON payload"
 * but its examples sign a parsed `JSON.stringify(payload)`. Verify the raw
 * bytes because they are the only unambiguous input, and log failures for review.
 */

export interface SignatureResult {
  valid: boolean
  reason: string | null
}

export function verifySignature(
  rawBody: Buffer | undefined,
  receivedSignature: string | undefined,
  secret: string | undefined
): SignatureResult {
  if (!secret) {
    return { valid: false, reason: 'WEBHOOK_SECRET is not configured' }
  }
  if (!receivedSignature) {
    return { valid: false, reason: 'X-Webhook-Signature header is missing' }
  }
  if (!rawBody || rawBody.length === 0) {
    return { valid: false, reason: 'raw body was not captured' }
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const expectedBuffer = Buffer.from(expected, 'utf8')
  const receivedBuffer = Buffer.from(receivedSignature.trim().toLowerCase(), 'utf8')

  // timingSafeEqual requires equal lengths, and comparing them leaks no useful information.
  if (expectedBuffer.length !== receivedBuffer.length) {
    return { valid: false, reason: 'signature does not match' }
  }
  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return { valid: false, reason: 'signature does not match' }
  }
  return { valid: true, reason: null }
}
