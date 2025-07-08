// src/app/api/user/currency/route.ts - API per aggiornare valuta utente
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Aggiorna valuta utente
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const { currency } = await request.json()

    // Validazione valuta
    if (!currency || !['EUR', 'USD'].includes(currency)) {
      return NextResponse.json(
        { error: 'Valuta non supportata. Utilizzare EUR o USD.' },
        { status: 400 }
      )
    }

    // Aggiorna valuta utente
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { currency },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true
      }
    })

    console.log(`✅ Currency updated for user ${userId}: ${currency}`)

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Valuta aggiornata a ${currency}`
    })

  } catch (error) {
    console.error('❌ Errore nell\'aggiornamento valuta:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento valuta' },
      { status: 500 }
    )
  }
}