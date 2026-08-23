export interface Session {
  access_token: string
  refresh_token: string
  expires_at?: number
}

export interface AuthResponse {
  user: { id: string; email?: string }
  session: Session | null
}

export interface Business {
  id: string
  name: string
  tax_id: string | null
  representative_name: string
  verification_status: 'draft' | 'submitted' | 'verified' | 'rejected'
  verified_at: string | null
}

export interface PaymentPoint {
  id: string
  business_id: string
  name: string
  address: string | null
  created_at: string
}

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

export interface QrPreview {
  payload: string
  summary: ExtractedQrData
  decode: {
    via: string | null
    dimensions: { width: number; height: number } | null
    attempts: number
  }
}

export interface QrBinding {
  id: string
  business_id: string
  payment_point_id: string
  payload_sha256: string
  destination_confirmed: boolean
  extracted_data: ExtractedQrData
  status: 'active' | 'inactive'
  created_at: string
}
