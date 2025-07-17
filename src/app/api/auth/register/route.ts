// src/app/api/auth/register/route.ts - FIX COOKIE AUTHENTICATION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { hashPassword, generateToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validazione
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome obbligatorio' },
        { status: 400 }
      )
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email obbligatoria' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password deve essere di almeno 6 caratteri' },
        { status: 400 }
      )
    }

    // Controlla se l'email esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 400 }
      )
    }

    // Hash della password
    const hashedPassword = await hashPassword(password)

    // Crea nuovo utente con valori onboarding di default
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        currency: 'EUR', // Default
        // 🎯 SISTEMA MODULARE - Valori default per onboarding
        onboardingStep: 1,
        onboardingCompleted: false,
        moduleSettings: undefined,
        appProfile: undefined
      }
    })

    // Genera token
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    // Prepara response con cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency
      },
      token
    })

    // 🔧 FIX: Cookie settings corretti per deployment
    // Determina se usare secure basandosi su HTTPS, non su NODE_ENV
    const isHttps = process.env.FORCE_HTTPS === 'true' || 
                   request.headers.get('x-forwarded-proto') === 'https' ||
                   request.url.startsWith('https://')

    console.log('🍪 Registration Cookie Settings Debug:', {
      isHttps,
      nodeEnv: process.env.NODE_ENV,
      protocol: request.url.split('://')[0],
      xForwardedProto: request.headers.get('x-forwarded-proto')
    })

    // Imposta cookie con settings corretti
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isHttps, // 🔧 Solo se effettivamente HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 giorni
      path: '/', // 🔧 Assicura che sia disponibile ovunque
      domain: undefined // 🔧 Lascia che il browser determini il domain automaticamente
    })

    console.log('✅ Registration successful for:', email)
    return response

  } catch (error) {
    console.error('❌ Errore durante la registrazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}