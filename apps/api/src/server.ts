import { appendFileSync } from 'node:fs'

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

      // Diagnóstico: con DUMP_BODIES apuntando a un archivo, se guarda el cuerpo
      // crudo de cada entrega. Sirve para ver qué manda el proveedor de verdad,
      // que es lo único que zanja las diferencias entre la documentación y el
      // comportamiento. Apagado si la variable no está.
      const destino = process.env.DUMP_BODIES
      if (destino) {
        appendFileSync(destino, buffer.toString('utf8') + String.fromCharCode(10))
      }
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
