/**
 * The shape of an incoming Kapso message and its three envelopes.
 *
 * The payload captured from a real message on 2026-08-22 is in
 * `docs/research/kapso-whatsapp-sandbox-bot.md`. It came from the CLI API,
 * while the webhook has a different shape. Two differences break parsers:
 *
 * 1. `phone_number_id` travels **outside `message`**, at the envelope root and
 *    inside `conversation`. The CLI response places it inside `kapso`, so all
 *    three locations must be checked.
 *
 * 2. With buffering enabled, the body **contains a batch, not one message**:
 *    `{ type, batch: true, data: [...], batch_info }`. A single-message parser
 *    silently drops all of them after Kapso receives the 200 response.
 *
 * `has_media`, `content`, `media_url`, and `media_data` live **inside the
 * `kapso` envelope**, not at the message root.
 */

export interface MediaData {
  url: string
  filename: string
  content_type: string
  byte_size: number
}

export interface KapsoEnvelope {
  direction?: string
  status?: string
  phone_number?: string
  phone_number_id?: string
  has_media?: boolean
  content?: string
  media_url?: string
  media_data?: MediaData
  whatsapp_conversation_id?: string
}

export interface KapsoMessage {
  type?: string
  from?: string
  id?: string
  timestamp?: string
  text?: { body?: string }
  /** Meta fallback path: `id` is the media_id. */
  image?: { id?: string; mime_type?: string; url?: string; link?: string }
  kapso?: KapsoEnvelope
}

export interface Conversation {
  id?: string
  phone_number?: string
  phone_number_id?: string
  status?: string
}

/** An event: the message and its required surrounding context. */
export interface KapsoEvent {
  message?: KapsoMessage
  conversation?: Conversation
  phone_number_id?: string
  [key: string]: unknown
}

export interface WebhookBody extends KapsoEvent {
  /** With buffering: `batch: true` and `data` is an event array. */
  batch?: boolean
  data?: KapsoEvent | KapsoEvent[]
}

/** A resolved message with the context needed to reply. */
export interface IncomingMessage {
  message: KapsoMessage
  phoneNumberId: string | null
  destination: string | null
}

function isEvent(value: unknown): value is KapsoEvent {
  return typeof value === 'object' && value !== null
}

/**
 * Searches `phone_number_id` in every possible location, from most specific to
 * most general. Otherwise valid deliveries can receive no reply.
 */
function resolvePhoneNumberId(event: KapsoEvent, message: KapsoMessage): string | null {
  return (
    message.kapso?.phone_number_id ??
    event.conversation?.phone_number_id ??
    event.phone_number_id ??
    null
  )
}

function resolveDestination(event: KapsoEvent, message: KapsoMessage): string | null {
  return message.from ?? message.kapso?.phone_number ?? event.conversation?.phone_number ?? null
}

function fromEvent(event: KapsoEvent): IncomingMessage | null {
  // Some events place the message directly at the root.
  const message =
    event.message ??
    (typeof event['type'] === 'string' && event['kapso'] !== undefined
      ? (event as unknown as KapsoMessage)
      : null)
  if (!message) return null
  return {
    message,
    phoneNumberId: resolvePhoneNumberId(event, message),
    destination: resolveDestination(event, message),
  }
}

/**
 * Returns ALL messages from the body. It is always a list so batches are not
 * forgotten as a special case.
 */
export function extractIncoming(body: WebhookBody): IncomingMessage[] {
  if (Array.isArray(body.data)) {
    return body.data.map(fromEvent).filter((event): event is IncomingMessage => event !== null)
  }
  if (isEvent(body.data)) {
    const event = fromEvent(body.data)
    if (event) return [event]
  }
  const root = fromEvent(body)
  return root ? [root] : []
}

/** Finds the file URL where Kapso actually provides it. */
export function mediaUrl(message: KapsoMessage): string | null {
  return message.kapso?.media_data?.url ?? message.kapso?.media_url ?? null
}

export function hasMedia(message: KapsoMessage): boolean {
  return message.kapso?.has_media === true && mediaUrl(message) !== null
}
