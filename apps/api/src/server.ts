import express from 'express'

import { ApiError } from './errors.js'
import { handleWebhook } from './kapso/webhook.js'
import { protectedRoutes, publicRoutes } from './routes.js'
import { getAdminOrigin } from './supabase.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.disable('x-powered-by')

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

// Only this route captures raw JSON for Kapso's HMAC. The octet-stream preview
// has its own parser and never passes through this verifier.
app.post(
  '/webhooks/kapso/whatsapp',
  express.json({
    limit: '1mb',
    verify: (request, _response, buffer) => {
      ;(request as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer)
    },
  }),
  handleWebhook
)

app.use((request, response, next) => {
  const origin = request.header('origin')
  if (origin) {
    const allowed = getAdminOrigin()
    if (origin !== allowed) {
      next(new ApiError(403, 'origen_no_permitido', 'El origen no esta permitido.'))
      return
    }
    response.setHeader('Access-Control-Allow-Origin', allowed)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  }
  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }
  next()
})

app.use(express.json({ limit: '100kb' }))
app.use(publicRoutes)
app.use(protectedRoutes)

app.use((_request, response) => {
  response.status(404).json({ error: { code: 'ruta_no_encontrada', message: 'La ruta no existe.' } })
})

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof ApiError) {
      response.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
      })
      return
    }
    if (typeof error === 'object' && error !== null && 'type' in error) {
      if (error.type === 'entity.too.large') {
        response.status(413).json({
          error: { code: 'cuerpo_demasiado_grande', message: 'El cuerpo supera el limite permitido.' },
        })
        return
      }
      if (error.type === 'entity.parse.failed') {
        response.status(400).json({
          error: { code: 'json_invalido', message: 'El cuerpo JSON no es valido.' },
        })
        return
      }
    }
    console.error('[api] error no controlado:', error)
    response.status(500).json({
      error: { code: 'error_interno', message: 'Ocurrio un error interno.' },
    })
  }
)

app.listen(port, () => {
  console.log(`QRSafe API listening on http://localhost:${port}`)
})
