// src/app/api/changelog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Leggi changelog (tutti gli utenti autenticati)
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult

    // Trova il changelog più recente
    const changelog = await prisma.changelog.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json({ 
      changelog: changelog || null 
    })

  } catch (error) {
    console.error('Errore nel recupero changelog:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna changelog (solo admin)
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    
    const { userId, user } = authResult
    const { content } = await request.json()

    // 🔐 CONTROLLO ADMIN - Sostituisci con la tua email
    const isAdmin = user.email === 'snp@snp.snp'
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo gli amministratori possono modificare il changelog' },
        { status: 403 }
      )
    }

    // Validazione contenuto
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Contenuto non valido' },
        { status: 400 }
      )
    }

    // Crea o aggiorna il changelog
    // Prima elimina eventuali changelog esistenti (manteniamo solo l'ultimo)
    await prisma.changelog.deleteMany({})
    
    // Crea il nuovo changelog
    const changelog = await prisma.changelog.create({
      data: {
        content: content.trim(),
        updatedBy: userId
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json({ changelog })

  } catch (error) {
    console.error('Errore nell\'aggiornamento changelog:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}