import type {
  AuthResponse,
  Business,
  PaymentPoint,
  QrBinding,
  QrPreview,
  Session,
} from './types'

const API_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? 'error_desconocido',
      body.error?.message ?? 'No pudimos completar la operación.'
    )
  }
  return body
}

async function json<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  return parseResponse<T>(response)
}

export function signUp(email: string, password: string): Promise<AuthResponse> {
  return json('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function signIn(email: string, password: string): Promise<AuthResponse> {
  return json('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function getBusiness(token: string): Promise<{ business: Business | null }> {
  return json('/business', {}, token)
}

export function createBusiness(
  token: string,
  input: { name: string; taxId: string; representativeName: string }
): Promise<{ business: Business }> {
  return json('/business', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function submitBusiness(token: string): Promise<{ business: Business; autoApproved: boolean }> {
  return json('/business/verification', { method: 'POST', body: '{}' }, token)
}

export function getPaymentPoints(token: string): Promise<{ paymentPoints: PaymentPoint[] }> {
  return json('/payment-points', {}, token)
}

export function createPaymentPoint(
  token: string,
  input: { name: string; address: string }
): Promise<{ paymentPoint: PaymentPoint }> {
  return json('/payment-points', { method: 'POST', body: JSON.stringify(input) }, token)
}

export function getBindings(token: string): Promise<{ bindings: QrBinding[] }> {
  return json('/qr-bindings', {}, token)
}

export async function previewQr(token: string, pointId: string, file: File): Promise<QrPreview> {
  const response = await fetch(`${API_URL}/payment-points/${encodeURIComponent(pointId)}/qr-preview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  })
  return parseResponse<QrPreview>(response)
}

export function createBinding(
  token: string,
  input: { paymentPointId: string; payload: string; destinationConfirmed: true }
): Promise<{ binding: QrBinding }> {
  return json('/qr-bindings', { method: 'POST', body: JSON.stringify(input) }, token)
}

const SESSION_KEY = 'qrsafe.session'

export function readSession(): Session | null {
  try {
    const value = localStorage.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as Session) : null
  } catch {
    return null
  }
}

export function storeSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
