import express, { Router, type Request, type Response } from 'express'

import { currentUser, requireAuth } from './auth.js'
import { ApiError } from './errors.js'
import { analyzePayload, fingerprintPayload } from './qr.js'
import {
  databaseFailure,
  findBusiness,
  findOwnedPoint,
  requireBusiness,
  type Business,
  type PaymentPoint,
} from './repository.js'
import {
  demoAutoApprove,
  demoAutoConfirmEmail,
  getPublishableClient,
  getSecretClient,
} from './supabase.js'
import { decodeImage } from '@qrsafe/verification'

interface JsonObject {
  [key: string]: unknown
}

function objectBody(request: Request): JsonObject {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) {
    throw new ApiError(400, 'json_invalido', 'El cuerpo debe ser un objeto JSON.')
  }
  return request.body as JsonObject
}

function requiredString(body: JsonObject, key: string, label: string, max: number): string {
  const value = body[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'campo_invalido', `${label} es obligatorio.`)
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new ApiError(400, 'campo_invalido', `${label} no puede superar ${String(max)} caracteres.`)
  }
  return trimmed
}

function optionalString(body: JsonObject, key: string, label: string, max: number): string | null {
  const value = body[key]
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new ApiError(400, 'campo_invalido', `${label} no es valido.`)
  }
  return value.trim()
}

function requiredPayload(body: JsonObject): string {
  const value = body['payload']
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiError(400, 'campo_invalido', 'El payload del QR es obligatorio.')
  }
  if (value.length > 10_000) {
    throw new ApiError(400, 'campo_invalido', 'El payload del QR supera el limite permitido.')
  }
  return value
}

export const publicRoutes = Router()

publicRoutes.post('/auth/signup', async (request: Request, response: Response) => {
  const body = objectBody(request)
  const email = requiredString(body, 'email', 'El correo', 320)
  const password = requiredString(body, 'password', 'La contrasena', 200)
  if (password.length < 8) {
    throw new ApiError(400, 'campo_invalido', 'La contrasena debe tener al menos 8 caracteres.')
  }

  if (demoAutoConfirmEmail()) {
    const { error } = await getSecretClient('crear la cuenta demo').auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) {
      console.warn('[auth] no se pudo crear la cuenta demo:', error.message)
      throw new ApiError(400, 'registro_fallido', 'No se pudo crear la cuenta con esos datos.')
    }
    const { data, error: signInError } = await getPublishableClient(
      'iniciar la sesion demo'
    ).auth.signInWithPassword({ email, password })
    if (signInError || !data.session) {
      throw new ApiError(502, 'sesion_no_disponible', 'La cuenta se creo, pero no se pudo iniciar la sesion.')
    }
    response.status(201).json({ user: data.user, session: data.session })
    return
  }

  const { data, error } = await getPublishableClient('crear la cuenta').auth.signUp({ email, password })
  if (error) {
    console.warn('[auth] no se pudo crear la cuenta:', error.message)
    throw new ApiError(400, 'registro_fallido', 'No se pudo crear la cuenta con esos datos.')
  }
  response.status(201).json({ user: data.user, session: data.session })
})

publicRoutes.post('/auth/signin', async (request: Request, response: Response) => {
  const body = objectBody(request)
  const email = requiredString(body, 'email', 'El correo', 320)
  const password = requiredString(body, 'password', 'La contrasena', 200)
  const { data, error } = await getPublishableClient('iniciar sesion').auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new ApiError(401, 'credenciales_invalidas', 'El correo o la contrasena no son validos.')
  response.json({ user: data.user, session: data.session })
})

export const protectedRoutes = Router()
protectedRoutes.use(requireAuth)

protectedRoutes.get('/business', async (request: Request, response: Response) => {
  const business = await findBusiness(currentUser(request).id)
  response.json({ business })
})

protectedRoutes.post('/business', async (request: Request, response: Response) => {
  const user = currentUser(request)
  const body = objectBody(request)
  const name = requiredString(body, 'name', 'El nombre de la empresa', 200)
  const taxId = optionalString(body, 'taxId', 'La identificacion fiscal', 30)
  const representativeName = requiredString(body, 'representativeName', 'El representante', 200)
  const { data, error } = await getSecretClient('crear la empresa')
    .from('businesses')
    .insert({
      owner_id: user.id,
      name,
      tax_id: taxId,
      representative_name: representativeName,
    })
    .select('*')
    .single()
  if (error) throw databaseFailure('crear la empresa', error)
  response.status(201).json({ business: data as Business })
})

protectedRoutes.post('/business/verification', async (request: Request, response: Response) => {
  const business = await requireBusiness(currentUser(request).id)
  const approved = demoAutoApprove()
  const now = new Date().toISOString()
  const update = approved
    ? { verification_status: 'verified', verification_submitted_at: now, verified_at: now }
    : { verification_status: 'submitted', verification_submitted_at: now, verified_at: null }
  const { data, error } = await getSecretClient('enviar la verificacion de la empresa')
    .from('businesses')
    .update(update)
    .eq('id', business.id)
    .select('*')
    .single()
  if (error) throw databaseFailure('enviar la verificacion de la empresa', error)
  response.json({ business: data as Business, autoApproved: approved })
})

protectedRoutes.get('/payment-points', async (request: Request, response: Response) => {
  const business = await requireBusiness(currentUser(request).id)
  const { data, error } = await getSecretClient('consultar los puntos de cobro')
    .from('payment_points')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })
  if (error) throw databaseFailure('consultar los puntos de cobro', error)
  response.json({ paymentPoints: data as PaymentPoint[] })
})

protectedRoutes.post('/payment-points', async (request: Request, response: Response) => {
  const business = await requireBusiness(currentUser(request).id)
  const body = objectBody(request)
  const name = requiredString(body, 'name', 'El nombre del punto', 160)
  const address = optionalString(body, 'address', 'La direccion', 300)
  const { data, error } = await getSecretClient('crear el punto de cobro')
    .from('payment_points')
    .insert({ business_id: business.id, name, address })
    .select('*')
    .single()
  if (error) throw databaseFailure('crear el punto de cobro', error)
  response.status(201).json({ paymentPoint: data as PaymentPoint })
})

protectedRoutes.post(
  '/payment-points/:paymentPointId/qr-preview',
  express.raw({ type: 'application/octet-stream', limit: '20mb' }),
  async (request: Request, response: Response) => {
    const parameter = request.params['paymentPointId']
    const paymentPointId = typeof parameter === 'string' ? parameter : ''
    await findOwnedPoint(currentUser(request).id, paymentPointId)
    if (!request.is('application/octet-stream')) {
      throw new ApiError(415, 'tipo_no_soportado', 'El preview requiere Content-Type application/octet-stream.')
    }
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw new ApiError(400, 'imagen_vacia', 'Debes enviar los bytes de una imagen.')
    }

    const decoded = await decodeImage(request.body)
    const analysis = analyzePayload(decoded.payload)
    if (!analysis.ok) {
      throw new ApiError(422, analysis.code, analysis.message, analysis.details)
    }
    response.json({
      payload: decoded.payload,
      summary: analysis.extractedData,
      decode: { via: decoded.via, dimensions: decoded.dims, attempts: decoded.attempts },
    })
  }
)

protectedRoutes.get('/qr-bindings', async (request: Request, response: Response) => {
  const business = await requireBusiness(currentUser(request).id)
  const { data, error } = await getSecretClient('consultar los QR registrados')
    .from('qr_bindings')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })
  if (error) throw databaseFailure('consultar los QR registrados', error)
  response.json({ bindings: data })
})

protectedRoutes.post('/qr-bindings', async (request: Request, response: Response) => {
  const user = currentUser(request)
  const body = objectBody(request)
  const paymentPointId = requiredString(body, 'paymentPointId', 'El punto de cobro', 100)
  // Do not trim or normalize: the fingerprint covers the exact decoded payload.
  const payload = requiredPayload(body)
  if (body['destinationConfirmed'] !== true) {
    throw new ApiError(
      400,
      'destino_no_confirmado',
      'Debes confirmar expresamente que verificaste el destino del pago.'
    )
  }

  const business = await requireBusiness(user.id)
  if (business.verification_status !== 'verified') {
    throw new ApiError(409, 'empresa_no_verificada', 'La empresa debe estar verificada para registrar un QR.')
  }
  await findOwnedPoint(user.id, paymentPointId)
  const analysis = analyzePayload(payload)
  if (!analysis.ok) throw new ApiError(422, analysis.code, analysis.message, analysis.details)

  const { data, error } = await getSecretClient('registrar el QR')
    .from('qr_bindings')
    .insert({
      business_id: business.id,
      payment_point_id: paymentPointId,
      payload_sha256: fingerprintPayload(payload),
      destination_confirmed: true,
      extracted_data: analysis.extractedData,
      status: 'active',
    })
    .select('*')
    .single()
  if (error) throw databaseFailure('registrar el QR', error)
  response.status(201).json({ binding: data })
})
