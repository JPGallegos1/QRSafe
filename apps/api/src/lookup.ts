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

/**
 * Finds a verified business whose name is exactly the one the code claims.
 *
 * WHY THIS IS SAFE, AND WHY THE DIRECTION MATTERS. The declared name comes from
 * field 59 of the QR, which whoever generated the code wrote — an attacker,
 * possibly. Using that name to VERIFY would be catastrophic: anybody could
 * claim to be a certified business and be believed. Using it to ACCUSE is the
 * opposite: a forger who borrows a certified merchant's name only manages to
 * expose himself, because the borrowed name can never help him and can only
 * hurt him. The asymmetry is what makes this usable at all.
 *
 * It answers the question a certified merchant is paying for. Andrea registered
 * her codes; a code that claims to be Andrea's and is not among them is not a
 * doubt, it is a rejection. Answering "I cannot confirm or rule out" there would
 * defeat the point of certifying.
 *
 * MATCHING IS EXACT, after trimming and case folding. A partial match would let
 * a code named "Andrea's Bakery" drag in a certified "Andrea", and would also
 * misfire on ordinary merchants. Exact is narrow enough to be honest.
 *
 * KNOWN LIMITATION, deliberately accepted: two different real businesses can
 * share a name. A legitimate, unregistered "Andrea" would be reported as not
 * matching the certified "Andrea". That is why the wording of the reply says
 * that the code is not among the ones the certified business registered — which
 * is true in both cases — instead of calling it fraudulent.
 */
export async function findVerifiedBusinessNamed(declaredName: string): Promise<string | null> {
  const claimed = declaredName.trim()
  if (claimed.length < 3) return null

  const database = getSecretClient('buscar un comercio certificado por nombre')
  const result = await database
    .from('businesses')
    .select('name')
    .eq('verification_status', 'verified')
    .ilike('name', escapePattern(claimed))
    .limit(1)
    .maybeSingle()
  if (result.error) throw result.error
  if (!result.data) return null

  // Second gate, and not redundant: even if a pattern character slipped through
  // the escaping, a name that does not actually equal the claimed one must not
  // produce an accusation. The comparison the product promised is equality, so
  // that is what decides.
  const found = (result.data as { name: string }).name
  return sameName(found, claimed) ? found : null
}

/**
 * Neutralises SQL pattern characters in attacker-controlled text.
 *
 * `ilike` treats `%` and `_` as wildcards, and PostgREST also translates `*`.
 * A field 59 of `%%%` would therefore match an arbitrary verified business and
 * produce a false "do not pay" against a perfectly legitimate, unregistered
 * code — the exact failure this whole design exists to avoid, handed to the
 * attacker for free.
 */
function escapePattern(value: string): string {
  const especiales = new Set(['\\', '%', '_', '*'])
  return Array.from(value)
    .map((c) => (especiales.has(c) ? '\\' + c : c))
    .join('')
}

/** Case-insensitive, accent-sensitive equality after trimming. */
function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es')
}
