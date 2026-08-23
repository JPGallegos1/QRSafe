/**
 * Downloads the file received through WhatsApp.
 *
 * Two observations from the real sandbox on 2026-08-22 govern this module:
 *
 * 1. The URL points to an Active Storage blob at `app.kapso.ai` and **downloads
 *    without credentials**: it returned 200 and the exact `byte_size` without
 *    headers. Do not send the project key. The URL is itself a secret: anyone
 *    holding it can download the file.
 *
 * 2. **The URL lifetime is undocumented.** Kapso publishes storage capacity,
 *    not retention time. Until measured, download on webhook receipt and keep
 *    the bytes instead of storing a URL and assuming it remains valid.
 */

const MAX_BYTES = 20 * 1024 * 1024
const TIMEOUT_MS = 20_000

export interface DownloadResult {
  bytes: Buffer | null
  error: string | null
}

export async function downloadMedia(url: string): Promise<DownloadResult> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)

  let response: Response
  try {
    // Authentication headers are intentionally omitted: they are unnecessary,
    // and the cross-host Active Storage redirect would leak the project key.
    response = await fetch(url, { redirect: 'follow', signal: timeout })
  } catch (err) {
    return { bytes: null, error: err instanceof Error ? err.message : String(err) }
  }

  if (!response.ok) {
    return { bytes: null, error: 'the file returned ' + String(response.status) }
  }

  const declaredSize = Number(response.headers.get('content-length') ?? '0')
  if (declaredSize > MAX_BYTES) {
    return { bytes: null, error: 'the file declares ' + String(declaredSize) + ' bytes' }
  }

  // Consuming the body can fail independently of the connection: after the
  // headers arrive, a truncated or timed-out body rejects `arrayBuffer`.
  let buffer: Buffer
  try {
    buffer = Buffer.from(await response.arrayBuffer())
  } catch (err) {
    return {
      bytes: null,
      error: 'download was interrupted: ' + (err instanceof Error ? err.message : String(err)),
    }
  }

  if (buffer.length > MAX_BYTES) {
    return { bytes: null, error: 'the file is ' + String(buffer.length) + ' bytes' }
  }
  return { bytes: buffer, error: null }
}
