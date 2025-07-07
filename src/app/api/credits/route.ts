import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Ottieni tutti i crediti dell'utente
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const credits = await prisma.credit.findMany({
      where: { userId },
      orderBy: { amount: 'desc' } // Ordina per importo decrescente
    })
    
    return NextResponse.json(credits)
  } catch (error) {
    console.error('Errore nel recupero crediti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei crediti' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo credito
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { name, description, amount } = body
    
    // Validazione
    if (!name || !amount) {
      return NextResponse.json(
        { error: 'Nome e importo sono obbligatori' },
        { status: 400 }
      )
    }
    
    const creditAmount = parseFloat(amount)
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return NextResponse.json(
        { error: 'L\'importo deve essere un numero positivo' },
        { status: 400 }
      )
    }
    
    const credit = await prisma.credit.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: creditAmount,
        userId
      }
    })
    
    return NextResponse.json(credit)
  } catch (error) {
    console.error('Errore nella creazione credito:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione del credito' },
      { status: 500 }
    )
  }
}