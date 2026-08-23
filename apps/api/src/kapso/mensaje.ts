/**
 * La forma de un mensaje entrante de Kapso, y sus tres envoltorios.
 *
 * El payload capturado de un mensaje real el 2026-08-22 está en
 * `docs/research/kapso-whatsapp-sandbox-bot.md`. Pero ojo: **ese payload vino
 * de consultar la API por CLI, y el webhook no tiene la misma forma.** Dos
 * diferencias rompen un parser escrito contra el primero:
 *
 * 1. `phone_number_id` viaja **fuera de `message`**, en la raíz del envelope y
 *    también dentro de `conversation`. En la respuesta del CLI está dentro de
 *    `kapso`. Hay que mirar los tres lugares.
 *
 * 2. Con buffering activado el cuerpo **no trae un mensaje sino un lote**:
 *    `{ type, batch: true, data: [...], batch_info }`. Un parser que espere un
 *    solo mensaje los ignora todos en silencio — y como el endpoint ya
 *    respondió 200, Kapso da el lote por entregado y esa gente nunca recibe
 *    respuesta.
 *
 * La otra trampa, ésta sí compartida por las dos formas: `has_media`,
 * `content`, `media_url` y `media_data` viven **dentro del sobre `kapso`**, no
 * en la raíz del mensaje.
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

export interface Conversacion {
  id?: string
  phone_number?: string
  phone_number_id?: string
  status?: string
}

/** Un evento: el mensaje más lo que lo rodea, que también hace falta. */
export interface EventoKapso {
  message?: MensajeKapso
  conversation?: Conversacion
  phone_number_id?: string
  [clave: string]: unknown
}

export interface CuerpoWebhook extends EventoKapso {
  /** Con buffering: `batch: true` y `data` es un arreglo de eventos. */
  batch?: boolean
  data?: EventoKapso | EventoKapso[]
}

/** Un mensaje ya resuelto junto al contexto que necesita para contestarse. */
export interface Entrante {
  mensaje: MensajeKapso
  phoneNumberId: string | null
  destino: string | null
}

function esEvento(valor: unknown): valor is EventoKapso {
  return typeof valor === 'object' && valor !== null
}

/**
 * `phone_number_id` buscado en los tres lugares donde puede estar, del más
 * específico al más general. Sin esto, entregas perfectamente válidas caen en
 * la rama de "mensaje sin phone_number_id" y el bot no contesta nada.
 */
function resolverPhoneNumberId(evento: EventoKapso, mensaje: MensajeKapso): string | null {
  return (
    mensaje.kapso?.phone_number_id ??
    evento.conversation?.phone_number_id ??
    evento.phone_number_id ??
    null
  )
}

function resolverDestino(evento: EventoKapso, mensaje: MensajeKapso): string | null {
  return mensaje.from ?? mensaje.kapso?.phone_number ?? evento.conversation?.phone_number ?? null
}

function deEvento(evento: EventoKapso): Entrante | null {
  // Algunos eventos traen el mensaje suelto en la raíz.
  const mensaje =
    evento.message ??
    (typeof evento['type'] === 'string' && evento['kapso'] !== undefined
      ? (evento as unknown as MensajeKapso)
      : null)
  if (!mensaje) return null
  return {
    mensaje,
    phoneNumberId: resolverPhoneNumberId(evento, mensaje),
    destino: resolverDestino(evento, mensaje),
  }
}

/**
 * Devuelve TODOS los mensajes del cuerpo. Siempre una lista, aunque venga uno
 * solo: tratar el lote como caso especial es justamente lo que hace que se
 * olvide.
 */
export function extraerEntrantes(cuerpo: CuerpoWebhook): Entrante[] {
  if (Array.isArray(cuerpo.data)) {
    return cuerpo.data.map(deEvento).filter((e): e is Entrante => e !== null)
  }
  if (esEvento(cuerpo.data)) {
    const uno = deEvento(cuerpo.data)
    if (uno) return [uno]
  }
  const raiz = deEvento(cuerpo)
  return raiz ? [raiz] : []
}

/** La URL del archivo, buscada donde realmente está. */
export function urlDeMedia(mensaje: MensajeKapso): string | null {
  return mensaje.kapso?.media_data?.url ?? mensaje.kapso?.media_url ?? null
}

export function tieneMedia(mensaje: MensajeKapso): boolean {
  return mensaje.kapso?.has_media === true && urlDeMedia(mensaje) !== null
}
