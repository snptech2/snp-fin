// src/app/api/auth/logout/route.ts - FIX COOKIE AUTHENTICATION
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  
  // 🔧 FIX: Cookie settings corretti per deployment
  // Determina se usare secure basandosi su HTTPS, non su NODE_ENV
  const isHttps = process.env.FORCE_HTTPS === 'true' || 
                 request.headers.get('x-forwarded-proto') === 'https' ||
                 request.url.startsWith('https://')

  console.log('🍪 Logout Cookie Settings Debug:', {
    isHttps,
    nodeEnv: process.env.NODE_ENV,
    protocol: request.url.split('://')[0],
    xForwardedProto: request.headers.get('x-forwarded-proto')
  })
  
  // Rimuovi il cookie di autenticazione con le stesse impostazioni usate per crearlo
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: isHttps, // 🔧 Stesso setting usato per creare il cookie
    sameSite: 'lax',
    maxAge: 0, // Scade immediatamente
    path: '/', // 🔧 Stesso path usato per creare il cookie
    domain: undefined // 🔧 Lascia che il browser determini il domain automaticamente
  })

  console.log('✅ Logout successful - cookie cleared')
  return response
}