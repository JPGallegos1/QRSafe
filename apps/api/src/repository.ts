import { ApiError } from './errors.js'
import { getSecretClient } from './supabase.js'

export interface Business {
  id: string
  owner_id: string
  name: string
  tax_id: string | null
  representative_name: string
  verification_status: 'draft' | 'submitted' | 'verified' | 'rejected'
  verification_submitted_at: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentPoint {
  id: string
  business_id: string
  name: string
  address: string | null
  created_at: string
  updated_at: string
}

interface DatabaseError {
  code?: string
  message: string
}

function databaseFailure(action: string, error: DatabaseError): ApiError {
  console.error(`[supabase] ${action}: ${error.message}`)
  if (error.code === '23505') {
    return new ApiError(409, 'recurso_duplicado', 'El recurso ya existe.')
  }
  return new ApiError(502, 'error_de_datos', `No se pudo ${action}.`)
}

export async function findBusiness(ownerId: string): Promise<Business | null> {
  const { data, error } = await getSecretClient('consultar la empresa')
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw databaseFailure('consultar la empresa', error)
  return data as Business | null
}

export async function requireBusiness(ownerId: string): Promise<Business> {
  const business = await findBusiness(ownerId)
  if (!business) throw new ApiError(404, 'empresa_no_encontrada', 'Primero debes crear una empresa.')
  return business
}

export async function findOwnedPoint(ownerId: string, pointId: string): Promise<PaymentPoint> {
  const business = await requireBusiness(ownerId)
  const { data, error } = await getSecretClient('consultar el punto de cobro')
    .from('payment_points')
    .select('*')
    .eq('id', pointId)
    .eq('business_id', business.id)
    .maybeSingle()
  if (error) throw databaseFailure('consultar el punto de cobro', error)
  if (!data) {
    throw new ApiError(404, 'punto_no_encontrado', 'El punto de cobro no existe o no pertenece a tu empresa.')
  }
  return data as PaymentPoint
}

export { databaseFailure }
