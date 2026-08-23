import crypto from 'node:crypto'

/**
 * Verificación de la firma de los webhooks de Kapso.
 *
 * Kapso firma con HMAC SHA256 usando el secreto del webhook y manda el
 * resultado en la cabecera `X-Webhook-Signature`.
 *
 * La firma se calcula sobre el **cuerpo crudo**, no sobre el objeto ya
 * parseado y vuelto a serializar. `JSON.stringify` de un objeto parseado puede
 * cambiar el orden de las claves, los espacios o la forma de los números, y
 * cualquiera de esas tres cosas rompe el HMAC sin que nada parezca mal. Por eso
 * el servidor guarda el Buffer original.
 *
 * La documentación de Kapso es ambigua en este punto: el texto habla del "raw
 * JSON payload" pero sus ejemplos firman un `JSON.stringify(payload)` ya
 * parseado. Ante la duda se verifica contra el crudo, que es lo que no puede
 * estar mal, y si falla se registra para poder revisarlo.
 */

export interface ResultadoFirma {
  valida: boolean
  motivo: string | null
}

export function verificarFirma(
  cuerpoCrudo: Buffer | undefined,
  firmaRecibida: string | undefined,
  secreto: string | undefined
): ResultadoFirma {
  if (!secreto) {
    return { valida: false, motivo: 'no hay WEBHOOK_SECRET configurado' }
  }
  if (!firmaRecibida) {
    return { valida: false, motivo: 'falta la cabecera X-Webhook-Signature' }
  }
  if (!cuerpoCrudo || cuerpoCrudo.length === 0) {
    return { valida: false, motivo: 'no se capturó el cuerpo crudo' }
  }

  const esperada = crypto.createHmac('sha256', secreto).update(cuerpoCrudo).digest('hex')

  const a = Buffer.from(esperada, 'utf8')
  const b = Buffer.from(firmaRecibida.trim().toLowerCase(), 'utf8')

  // timingSafeEqual exige el mismo largo, y comparar largos no filtra nada útil.
  if (a.length !== b.length) {
    return { valida: false, motivo: 'la firma no coincide' }
  }
  if (!crypto.timingSafeEqual(a, b)) {
    return { valida: false, motivo: 'la firma no coincide' }
  }
  return { valida: true, motivo: null }
}
