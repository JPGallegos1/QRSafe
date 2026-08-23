import { getSecretClient } from './supabase.js'
import { fingerprintPayload } from './qr.js'

export interface RegisteredBinding {
  bindingId: string
  businessName: string
  paymentPointName: string
}

interface BindingRow {
  id: string
  business_id: string
  payment_point_id: string
}

interface PointRow {
  id: string
  business_id: string
  name: string
}

interface BusinessRow {
  id: string
  name: string
}

export async function lookupActiveBinding(payload: string): Promise<RegisteredBinding | null> {
  const database = getSecretClient('buscar el registro del QR')
  const bindingResult = await database
    .from('qr_bindings')
    .select('id, business_id, payment_point_id')
    .eq('payload_sha256', fingerprintPayload(payload))
    .eq('status', 'active')
    .maybeSingle()
  if (bindingResult.error) throw bindingResult.error
  if (!bindingResult.data) return null
  const binding = bindingResult.data as BindingRow

  const [pointResult, businessResult] = await Promise.all([
    database
      .from('payment_points')
      .select('id, business_id, name')
      .eq('id', binding.payment_point_id)
      .eq('business_id', binding.business_id)
      .maybeSingle(),
    database
      .from('businesses')
      .select('id, name')
      .eq('id', binding.business_id)
      .eq('verification_status', 'verified')
      .maybeSingle(),
  ])
  if (pointResult.error) throw pointResult.error
  if (businessResult.error) throw businessResult.error
  if (!pointResult.data || !businessResult.data) return null

  const point = pointResult.data as PointRow
  const business = businessResult.data as BusinessRow
  return {
    bindingId: binding.id,
    businessName: business.name,
    paymentPointName: point.name,
  }
}
