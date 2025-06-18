// src/app/api/network-fees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista fee di rete (con filtro opzionale per portfolio)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const portfolioId = searchParams.get('portfolioId')

    const whereClause: any = {}
    
    if (portfolioId) {
      const id = parseInt(portfolioId)
      if (!isNaN(id)) {
        whereClause.portfolioId = id
      }
    }

    const fees = await prisma.networkFee.findMany({
      where: whereClause,
      include: {
        portfolio: {
          select: {
            id: true,
            name: true,
            userId: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Filtra per user se necessario
    const userFees = fees.filter(fee => fee.portfolio.userId === 1)

    // Aggiungi conversione in BTC
    const feesWithBTC = userFees.map(fee => ({
      ...fee,
      btcAmount: fee.sats / 100000000
    }))

    return NextResponse.json(feesWithBTC)
  } catch (error) {
    console.error('Errore nel recupero fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero fee di rete' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova fee di rete
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolioId, sats, date, description } = body

    // Validazioni
    if (!portfolioId || !sats) {
      return NextResponse.json(
        { error: 'Campi obbligatori: portfolioId, sats' },
        { status: 400 }
      )
    }

    if (sats <= 0) {
      return NextResponse.json(
        { error: 'Fee in sats deve essere maggiore di zero' },
        { status: 400 }
      )
    }

    // Verifica che il portfolio esista e appartenga all'utente
    const portfolio = await prisma.dCAPortfolio.findUnique({
      where: { id: parseInt(portfolioId), userId: 1 }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    const fee = await prisma.networkFee.create({
      data: {
        portfolioId: parseInt(portfolioId),
        sats: parseInt(sats),
        date: date ? new Date(date) : new Date(),
        description: description?.trim() || null
      },
      include: {
        portfolio: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Aggiungi conversione in BTC
    const feeWithBTC = {
      ...fee,
      btcAmount: fee.sats / 100000000
    }

    return NextResponse.json(feeWithBTC, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione fee di rete' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella fee di rete (per operazioni batch)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array di IDs richiesto' },
        { status: 400 }
      )
    }

    // Verifica che tutte le fee esistano e appartengano all'utente
    const fees = await prisma.networkFee.findMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) },
        portfolio: { userId: 1 }
      }
    })

    if (fees.length !== ids.length) {
      return NextResponse.json(
        { error: 'Alcune fee non sono state trovate' },
        { status: 404 }
      )
    }

    const deletedFees = await prisma.networkFee.deleteMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      }
    })

    return NextResponse.json({ 
      message: `${deletedFees.count} fee cancellate con successo`,
      deletedCount: deletedFees.count
    })
  } catch (error) {
    console.error('Errore nella cancellazione fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione fee di rete' },
      { status: 500 }
    )
  }
}