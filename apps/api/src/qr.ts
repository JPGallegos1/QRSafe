import { createHash } from 'node:crypto'
import { read } from '@qrsafe/verification'

export interface ExtractedQrData {
  declaredName: string | null
  city: string | null
  country: string | null
  currency: string | null
  isStatic: boolean
  accounts: Array<{
    template: string
    subTag: string
    scheme: string | null
    value: string
  }>
}

export type PayloadAnalysis =
  | { ok: true; extractedData: ExtractedQrData }
  | {
      ok: false
      code: 'qr_ilegible' | 'qr_no_emv' | 'qr_no_estatico' | 'qr_anomalo'
      message: string
      details: string[]
    }

export function fingerprintPayload(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex')
}

export function analyzePayload(payload: string | null): PayloadAnalysis {
  if (!payload) {
    return {
      ok: false,
      code: 'qr_ilegible',
      message: 'No se pudo leer un codigo QR en la imagen.',
      details: [],
    }
  }

  const reading = read(payload)
  if (!reading || reading.kind !== 'emv') {
    return {
      ok: false,
      code: 'qr_no_emv',
      message: 'El codigo leido no es un QR de pago EMV.',
      details: [],
    }
  }
  const details: string[] = []
  if (!reading.wellFormed) details.push('La estructura EMV contiene datos incompletos o sobrantes.')
  if (!reading.crc.present) details.push('Falta el campo de control EMV obligatorio.')
  else if (!reading.crc.intact) details.push('El campo de control EMV no coincide con el contenido.')
  if (reading.country !== null && reading.country !== 'AR') {
    details.push(`El pais declarado es ${reading.country}, no Argentina.`)
  }
  if (reading.currency !== null && reading.currency !== '032') {
    details.push('La moneda declarada no es el peso argentino.')
  }

  const routes = new Set(reading.accountRefs.map((account) => account.template))
  if (routes.size === 0) details.push('El QR no declara una ruta de cobro identificable.')
  if (routes.size > 1) details.push('El QR declara mas de una ruta de cobro.')

  if (details.length > 0) {
    return {
      ok: false,
      code: 'qr_anomalo',
      message: 'El QR presenta una anomalia estructural y no puede registrarse.',
      details,
    }
  }

  if (!reading.isStatic) {
    return {
      ok: false,
      code: 'qr_no_estatico',
      message: 'Solo se pueden registrar QR de pago estaticos.',
      details: [],
    }
  }

  return {
    ok: true,
    extractedData: {
      declaredName: reading.declaredName,
      city: reading.city,
      country: reading.country,
      currency: reading.currency,
      isStatic: reading.isStatic,
      accounts: reading.accountRefs.map((account) => ({ ...account })),
    },
  }
}
