import type { Request, Response } from 'express'
import { decodeImage, verify } from '@qrsafe/verification'

import { verificarFirma } from './firma.js'
import { descargarMedia } from './descargar.js'
import { responderTexto } from './responder.js'
import { extraerMensaje, remitente, tieneMedia, urlDeMedia, type CuerpoWebhook } from './mensaje.js'

/**
 * El webhook que une el canal con el motor.
 *
 * Tres decisiones que conviene no revertir sin entender por qué están:
 *
 * 1. **Se contesta 200 enseguida y se procesa después.** Decodificar puede
 *    tardar hasta unos segundos en el peor caso, y Kapso **pausa el webhook
 *    solo** —y no lo reactiva— ante ~10 fallos o 85% de error en 15 minutos.
 *    Un endpoint lento se gana la pausa igual que uno roto, y la consecuencia
 *    es un bot mudo hasta que alguien lo toque a mano.
 *
 * 2. **La firma se verifica antes que nada**, contra el cuerpo crudo. Un
 *    webhook sin verificar es un endpoint público que descarga URLs ajenas y
 *    manda mensajes a cuenta de uno.
 *
 * 3. **Un solo mensaje de respuesta por consulta.** El plan cuenta entrantes y
 *    salientes contra la misma cuota; ver `responder.ts`.
 *
 * El módulo no sabe nada de usuarios ni de suscripciones: la compuerta que
 * decide **si** se atiende la consulta es una capa aparte, todavía sin
 * construir, y el motor decide **qué** se contesta. Mezclarlas haría que un
 * problema de suscripción se lea como un juicio sobre el QR.
 */

/** Ventana corta de idempotencia: Kapso reintenta y no queremos contestar dos veces. */
const vistos = new Map<string, number>()
const VENTANA_MS = 10 * 60 * 1000

function yaProcesado(clave: string | undefined): boolean {
  if (!clave) return false
  const ahora = Date.now()
  for (const [k, t] of vistos) if (ahora - t > VENTANA_MS) vistos.delete(k)
  if (vistos.has(clave)) return true
  vistos.set(clave, ahora)
  return false
}

const SIN_IMAGEN =
  'Mandame una foto del código QR y te digo lo que puedo verificar. Por ahora sólo leo imágenes.'

export function manejarWebhook(request: Request, response: Response): void {
  const firma = verificarFirma(
    (request as Request & { rawBody?: Buffer }).rawBody,
    request.header('X-Webhook-Signature') ?? undefined,
    process.env.WEBHOOK_SECRET
  )

  if (!firma.valida) {
    console.warn('[webhook] firma rechazada: ' + String(firma.motivo))
    response.status(401).json({ error: 'firma inválida' })
    return
  }

  if (yaProcesado(request.header('X-Idempotency-Key') ?? undefined)) {
    response.status(200).json({ status: 'duplicado' })
    return
  }

  // Se acusa recibo YA. Todo lo que sigue ocurre fuera del ciclo de la petición.
  response.status(200).json({ status: 'recibido' })

  const cuerpo = request.body as CuerpoWebhook
  void procesar(cuerpo).catch((err: unknown) => {
    console.error('[webhook] error procesando:', err)
  })
}

async function procesar(cuerpo: CuerpoWebhook): Promise<void> {
  const mensaje = extraerMensaje(cuerpo)
  if (!mensaje) return
  if (mensaje.kapso?.direction === 'outbound') return // no contestarse a sí mismo

  const destino = remitente(mensaje)
  const phoneNumberId = mensaje.kapso?.phone_number_id
  if (!destino || !phoneNumberId) {
    console.warn('[webhook] mensaje sin remitente o sin phone_number_id')
    return
  }

  if (!tieneMedia(mensaje)) {
    await contestar(phoneNumberId, destino, SIN_IMAGEN, 'sin-imagen')
    return
  }

  const url = urlDeMedia(mensaje)
  if (url === null) return

  const { bytes, error } = await descargarMedia(url)
  if (bytes === null) {
    console.error('[webhook] no se pudo bajar el archivo: ' + String(error))
    await contestar(
      phoneNumberId,
      destino,
      'No pude abrir la imagen que mandaste. Probá mandarla de nuevo.',
      'descarga-fallida'
    )
    return
  }

  const lectura = await decodeImage(bytes)
  const veredicto = verify(lectura.payload)

  const observaciones = veredicto.notes
    .filter((n) => n.level === 'medio')
    .map((n) => '\n\n• ' + n.text)
    .join('')

  console.log(
    '[webhook] ' +
      veredicto.state +
      ' · lectura=' +
      (lectura.via ?? 'ilegible') +
      ' · intentos=' +
      String(lectura.attempts)
  )

  await contestar(phoneNumberId, destino, veredicto.message + observaciones, veredicto.state)
}

/**
 * Manda la respuesta y **registra si falló**.
 *
 * Un envío que falla en silencio es peor que un error visible: el usuario se
 * queda esperando una respuesta que nunca llega, y del lado del servidor todo
 * parece haber salido bien. Kapso además pausa el webhook por su cuenta ante
 * una racha de fallos, así que estos registros son la única señal temprana.
 */
async function contestar(
  phoneNumberId: string,
  destino: string,
  texto: string,
  motivo: string
): Promise<void> {
  const envio = await responderTexto(phoneNumberId, destino, texto)
  if (!envio.ok) {
    console.error('[webhook] no se pudo responder (' + motivo + '): ' + String(envio.error))
  }
}
