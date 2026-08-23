import express from 'express'

import { handleWebhook } from './kapso/webhook.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.disable('x-powered-by')

// The raw body is required for HMAC verification. Reserializing the parsed
// object can change key order or whitespace, either of which breaks the HMAC.
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

app.post('/webhooks/kapso/whatsapp', handleWebhook)

app.listen(port, () => {
  console.log(`QRSafe API listening on http://localhost:${port}`)
})
