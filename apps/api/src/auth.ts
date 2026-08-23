import type { NextFunction, Request, Response } from 'express'
import type { User } from '@supabase/supabase-js'

import { ApiError } from './errors.js'
import { getSecretClient } from './supabase.js'

declare global {
  namespace Express {
    interface Request {
      authUser?: User
    }
  }
}

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const match = /^Bearer\s+(.+)$/i.exec(request.header('authorization') ?? '')
    if (!match?.[1]) {
      throw new ApiError(401, 'autenticacion_requerida', 'Falta un token Bearer valido.')
    }

    const { data, error } = await getSecretClient('validar la sesion').auth.getUser(match[1])
    if (error || !data.user) {
      throw new ApiError(401, 'sesion_invalida', 'La sesion no es valida o vencio.')
    }
    request.authUser = data.user
    next()
  } catch (error) {
    next(error)
  }
}

export function currentUser(request: Request): User {
  if (!request.authUser) {
    throw new ApiError(401, 'autenticacion_requerida', 'La ruta requiere autenticacion.')
  }
  return request.authUser
}
