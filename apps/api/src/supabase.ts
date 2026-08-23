import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { ApiError } from './errors.js'

let publishableClient: SupabaseClient | undefined
let secretClient: SupabaseClient | undefined

function required(name: string, operation: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new ApiError(
      503,
      'configuracion_incompleta',
      `No se puede ${operation}: falta configurar ${name}.`
    )
  }
  return value
}

function client(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

export function getPublishableClient(operation: string): SupabaseClient {
  if (!publishableClient) {
    publishableClient = client(
      required('SUPABASE_URL', operation),
      required('SUPABASE_PUBLISHABLE_KEY', operation)
    )
  }
  return publishableClient
}

export function getSecretClient(operation: string): SupabaseClient {
  if (!secretClient) {
    secretClient = client(
      required('SUPABASE_URL', operation),
      required('SUPABASE_SECRET_KEY', operation)
    )
  }
  return secretClient
}

export function getAdminOrigin(): string {
  return required('ADMIN_ORIGIN', 'habilitar CORS para el panel administrador')
}

export function demoAutoApprove(): boolean {
  return demoBoolean('DEMO_AUTO_APPROVE', 'enviar la verificacion de la empresa')
}

export function demoAutoConfirmEmail(): boolean {
  return demoBoolean('DEMO_AUTO_CONFIRM_EMAIL', 'crear la cuenta demo')
}

function demoBoolean(name: string, operation: string): boolean {
  const value = required(name, operation)
  if (value !== 'true' && value !== 'false') {
    throw new ApiError(
      503,
      'configuracion_invalida',
      `${name} debe ser true o false.`
    )
  }
  return value === 'true'
}
