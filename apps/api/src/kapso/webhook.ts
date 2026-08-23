import type { Request, Response } from 'express'
import { decodeImage, verify } from '@qrsafe/verification'

import { verifySignature } from './signature.js'
import { downloadMedia } from './download.js'
import { sendText } from './reply.js'
import { extractIncoming, hasMedia, mediaUrl, type WebhookBody, type IncomingMessage } from './message.js'

/**
 * Connects the channel to the verification engine.
 *
 * Three decisions that should not be changed without understanding why they exist:
 *
 * 1. **Return 200 immediately, then process.** Decoding can take seconds in
 *    the worst case, and Kapso pauses a webhook after roughly ten failures or
 *    an 85% error rate in fifteen minutes. A slow endpoint is paused like a
 *    broken one, leaving the bot silent until manually restored.
 *
 * 2. **Verify the signature before anything else** against the raw body. An
 *    unverified webhook is a public endpoint that downloads arbitrary URLs and
 *    sends messages at our expense.
 *
 * 3. **Send one reply per query.** The plan counts inbound and outbound traffic
 *    against the same quota; see `reply.ts`.
 *
 * This module knows nothing about users or subscriptions. A separate, unbuilt
 * gate decides **whether** a query is served; the engine decides **what** to
 * answer. Mixing them would turn subscription issues into judgments about QR.
 */

/** Short idempotency window: Kapso retries, and we must not reply twice. */
const seen = new Map<string, number>()
const WINDOW_MS = 10 * 60 * 1000

function alreadyProcessed(key: string | undefined): boolean {
  if (!key) return false
  const now = Date.now()
  for (const [seenKey, seenAt] of seen) if (now - seenAt > WINDOW_MS) seen.delete(seenKey)
  if (seen.has(key)) return true
  seen.set(key, now)
  return false
}

const NO_IMAGE = 'Send me a photo of the QR code and I will tell you what I can verify. I can only read images for now.'

export function handleWebhook(request: Request, response: Response): void {
  const signature = verifySignature(
    (request as Request & { rawBody?: Buffer }).rawBody,
    request.header('X-Webhook-Signature') ?? undefined,
    process.env.WEBHOOK_SECRET
  )

  if (!signature.valid) {
    console.warn('[webhook] rejected signature: ' + String(signature.reason))
    response.status(401).json({ error: 'invalid_signature' })
    return
  }

  if (alreadyProcessed(request.header('X-Idempotency-Key') ?? undefined)) {
    response.status(200).json({ status: 'duplicate' })
    return
  }

  // Acknowledge immediately; everything else happens outside the request cycle.
  response.status(200).json({ status: 'received' })

  const body = request.body as WebhookBody
  void processBody(body).catch((err: unknown) => {
    console.error('[webhook] processing error:', err)
  })
}

/**
 * A body can contain one message or a full batch.
 *
 * With buffering enabled, Kapso sends `{ batch: true, data: [...] }`. Because
 * the endpoint has already returned 200, an ignored batch is considered
 * delivered. Process each message with its own catch so one failure cannot
 * prevent later replies.
 */
async function processBody(body: WebhookBody): Promise<void> {
  const incomingMessages = extractIncoming(body)
  if (incomingMessages.length === 0) {
    console.warn('[webhook] body has no recognized messages')
    return
  }
  if (incomingMessages.length > 1) {
    console.log('[webhook] batch of ' + String(incomingMessages.length) + ' messages')
  }

  for (const incoming of incomingMessages) {
    try {
      await processIncoming(incoming)
    } catch (err) {
      console.error('[webhook] error in batch message:', err)
    }
  }
}

async function processIncoming(incoming: IncomingMessage): Promise<void> {
  const { message, destination, phoneNumberId } = incoming
  if (message.kapso?.direction === 'outbound') return // do not reply to ourselves

  if (!destination || !phoneNumberId) {
    console.warn('[webhook] message has no sender or phone_number_id')
    return
  }

  if (!hasMedia(message)) {
    await reply(phoneNumberId, destination, NO_IMAGE, 'no-image')
    return
  }

  const url = mediaUrl(message)
  if (url === null) return

  const { bytes, error } = await downloadMedia(url)
  if (bytes === null) {
    console.error('[webhook] could not download file: ' + String(error))
    await reply(
      phoneNumberId,
      destination,
      'I could not open the image you sent. Please try sending it again.',
      'download-failed'
    )
    return
  }

  const reading = await decodeImage(bytes)
  const verdict = verify(reading.payload)

  const observations = verdict.notes
    .filter((note) => note.level === 'medium')
    .map((n) => '\n\n• ' + n.text)
    .join('')

  console.log(
    '[webhook] ' +
      verdict.state +
      ' · reading=' +
      (reading.via ?? 'unreadable') +
      ' · attempts=' +
      String(reading.attempts)
  )

  await reply(phoneNumberId, destination, verdict.message + observations, verdict.state)
}

/**
 * Sends the reply and **records failures**.
 *
 * A silently failed send leaves the user waiting while the server appears fine.
 * Kapso can also pause the webhook after repeated failures, so these logs are
 * the only early signal.
 */
async function reply(
  phoneNumberId: string,
  destination: string,
  text: string,
  reason: string
): Promise<void> {
  const result = await sendText(phoneNumberId, destination, text)
  if (!result.ok) {
    console.error('[webhook] could not reply (' + reason + '): ' + String(result.error))
  }
}
