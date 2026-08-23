/**
 * Descarga del archivo que llegó por WhatsApp.
 *
 * Dos cosas medidas el 2026-08-22 contra el sandbox real gobiernan este módulo:
 *
 * 1. La URL apunta a un blob de Active Storage en `app.kapso.ai` y **se
 *    descarga sin credencial**: devolvió 200 y los `byte_size` exactos sin
 *    ninguna cabecera. Por lo tanto no se manda la clave del proyecto. Esa URL
 *    es un secreto en sí misma: quien la tenga baja el archivo.
 *
 * 2. **Cuánto dura esa URL no está documentado en ninguna parte.** Kapso
 *    publica capacidad de almacenamiento, nunca tiempo. Mientras eso siga sin
 *    medirse, la regla es descargar al recibir el webhook y quedarse con los
 *    bytes, en lugar de guardar la URL y confiar en que siga viva.
 */

const MAX_BYTES = 20 * 1024 * 1024
const TIMEOUT_MS = 20_000

export interface Descarga {
  bytes: Buffer | null
  error: string | null
}

export async function descargarMedia(url: string): Promise<Descarga> {
  const corte = AbortSignal.timeout(TIMEOUT_MS)

  let respuesta: Response
  try {
    // Sin cabeceras de autenticación a propósito: no hacen falta, y el redirect
    // de Active Storage cruza de host, así que mandarlas filtraría la clave del
    // proyecto al storage.
    respuesta = await fetch(url, { redirect: 'follow', signal: corte })
  } catch (err) {
    return { bytes: null, error: err instanceof Error ? err.message : String(err) }
  }

  if (!respuesta.ok) {
    return { bytes: null, error: 'el archivo respondió ' + String(respuesta.status) }
  }

  const declarado = Number(respuesta.headers.get('content-length') ?? '0')
  if (declarado > MAX_BYTES) {
    return { bytes: null, error: 'el archivo declara ' + String(declarado) + ' bytes' }
  }

  // Consumir el cuerpo puede fallar aparte de la conexión: si el servidor manda
  // las cabeceras y después el cuerpo se corta o se pasa del tiempo límite,
  // `fetch` ya resolvió y es `arrayBuffer` el que rechaza. Sin este try esa
  // falla escapa de la función y saltea la respuesta al usuario.
  let buffer: Buffer
  try {
    buffer = Buffer.from(await respuesta.arrayBuffer())
  } catch (err) {
    return {
      bytes: null,
      error: 'se cortó la descarga: ' + (err instanceof Error ? err.message : String(err)),
    }
  }

  if (buffer.length > MAX_BYTES) {
    return { bytes: null, error: 'el archivo pesa ' + String(buffer.length) + ' bytes' }
  }
  return { bytes: buffer, error: null }
}
