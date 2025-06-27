// src/lib/auth-middleware.ts
import { NextRequest } from 'next/server'
import { extractTokenFromRequest, getUserFromToken, JWTPayload } from './auth'

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload
}

// Middleware per autenticare le richieste API
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const token = extractTokenFromRequest(req)
    
    if (!token) {
      return Response.json(
        { error: 'Token di autenticazione mancante' },
        { status: 401 }
      )
    }
    
    const user = getUserFromToken(token)
    if (!user) {
      return Response.json(
        { error: 'Token di autenticazione non valido' },
        { status: 401 }
      )
    }
    
    // Aggiungi l'utente alla richiesta
    ;(req as AuthenticatedRequest).user = user
    
    return handler(req as AuthenticatedRequest)
  }
}

// Utility per ottenere l'ID utente corrente da una richiesta
export function getCurrentUserId(req: NextRequest): number | null {
  const token = extractTokenFromRequest(req)
  if (!token) return null
  
  const user = getUserFromToken(token)
  return user?.userId || null
}

// Utility helper per le API che non usano il middleware completo
export function requireAuth(req: NextRequest): { userId: number; user: JWTPayload } | Response {
  const token = extractTokenFromRequest(req)
  
  if (!token) {
    return Response.json(
      { error: 'Token di autenticazione mancante' },
      { status: 401 }
    )
  }
  
  const user = getUserFromToken(token)
  if (!user) {
    return Response.json(
      { error: 'Token di autenticazione non valido' },
      { status: 401 }
    )
  }
  
  return { userId: user.userId, user }
}