// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyPassword, generateToken } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validazione
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email obbligatoria' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password obbligatoria' },
        { status: 400 }
      )
    }

    // Trova utente
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Email o password non corretti' },
        { status: 401 }
      )
    }

    // Verifica password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email o password non corretti' },
        { status: 401 }
      )
    }

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

    // Imposta cookie sicuro
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 giorni
    })

    return response

  } catch (error) {
    console.error('Errore durante il login:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}