import express from 'express'

import { manejarWebhook } from './kapso/webhook.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.disable('x-powered-by')

// El cuerpo crudo hace falta para verificar la firma HMAC. Volver a serializar
// el objeto parseado puede cambiar el orden de las claves o los espacios, y
// cualquiera de las dos cosas rompe el HMAC sin que nada parezca mal.
app.use(
  express.json({
    limit: '1mb',
    verify: (request, _response, buffer) => {
      ;(request as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer)
    },
  })
)

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post('/webhooks/kapso/whatsapp', manejarWebhook)

app.listen(port, () => {
  console.log(`QRSafe API listening on http://localhost:${port}`)
})
