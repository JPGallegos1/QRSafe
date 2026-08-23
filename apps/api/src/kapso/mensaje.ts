/**
 * La forma real de un mensaje entrante de Kapso.
 *
 * Capturada de un mensaje verdadero el 2026-08-22, no de la documentación:
 * ver `docs/research/kapso-whatsapp-sandbox-bot.md`, donde está el payload
 * completo y las diferencias contra lo publicado.
 *
 * La trampa que importa: `has_media`, `content`, `media_url` y `media_data`
 * viven **dentro del sobre `kapso`**, no en la raíz del mensaje. Un parser que
 * los busque arriba no falla — devuelve `undefined` en silencio y hace creer
 * que el mensaje no traía imagen.
 */

export interface MediaData {
  url: string
  filename: string
  content_type: string
  byte_size: number
}

export interface SobreKapso {
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

export interface MensajeKapso {
  type?: string
  from?: string
  id?: string
  timestamp?: string
  text?: { body?: string }
  /** El camino de Meta, que sirve de respaldo: `id` es el media_id. */
  image?: { id?: string; mime_type?: string; url?: string; link?: string }
  kapso?: SobreKapso
}

/** Un webhook puede traer el mensaje suelto o dentro de un sobre de evento. */
export interface CuerpoWebhook {
  message?: MensajeKapso
  data?: { message?: MensajeKapso }
  [clave: string]: unknown
}

/** Saca el mensaje del cuerpo, sea cual sea la envoltura. */
export function extraerMensaje(cuerpo: CuerpoWebhook): MensajeKapso | null {
  if (cuerpo.message) return cuerpo.message
  if (cuerpo.data?.message) return cuerpo.data.message
  // Algunos eventos mandan el mensaje en la raíz.
  if (typeof cuerpo['type'] === 'string' && cuerpo['kapso'] !== undefined) {
    return cuerpo as unknown as MensajeKapso
  }
  return null
}

/** La URL del archivo, buscada donde realmente está. */
export function urlDeMedia(mensaje: MensajeKapso): string | null {
  return mensaje.kapso?.media_data?.url ?? mensaje.kapso?.media_url ?? null
}

export function tieneMedia(mensaje: MensajeKapso): boolean {
  return mensaje.kapso?.has_media === true && urlDeMedia(mensaje) !== null
}

/** A quién contestarle. */
export function remitente(mensaje: MensajeKapso): string | null {
  return mensaje.from ?? mensaje.kapso?.phone_number ?? null
}
