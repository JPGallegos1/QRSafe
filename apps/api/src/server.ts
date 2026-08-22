import express from 'express'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.disable('x-powered-by')
app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`QRSafe API listening on http://localhost:${port}`)
})
