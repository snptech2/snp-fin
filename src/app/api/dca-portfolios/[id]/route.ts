// src/app/api/dca-portfolios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Dettagli portafoglio specifico con statistiche complete
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 },
      include: {
        transactions: {
          orderBy: { date: 'desc' }
        },
        networkFees: {
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Calcola statistiche dettagliate
    const totalBTC = portfolio.transactions.reduce((sum, tx) => sum + tx.btcQuantity, 0)
    const totalEUR = portfolio.transactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
    const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
    const totalFeesBTC = totalFeesSats / 100000000
    const netBTC = totalBTC - totalFeesBTC
    const avgPrice = totalBTC > 0 ? totalEUR / totalBTC : 0

    // Aggiungi prezzo di acquisto per ogni transazione
    const transactionsWithPrice = portfolio.transactions.map(tx => ({
      ...tx,
      purchasePrice: tx.eurPaid / tx.btcQuantity
    }))

    const portfolioWithStats = {
      ...portfolio,
      transactions: transactionsWithPrice,
      stats: {
        totalBTC,
        totalEUR,
        totalFeesSats,
        totalFeesBTC,
        netBTC,
        avgPrice,
        transactionCount: portfolio.transactions.length,
        feesCount: portfolio.networkFees.length
      }
    }

    return NextResponse.json(portfolioWithStats)
  } catch (error) {
    console.error('Errore nel recupero portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero portafoglio DCA' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna portafoglio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { name } = body

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome portafoglio richiesto' },
        { status: 400 }
      )
    }

    // Controlla se il portfolio esiste
    const existingPortfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Controlla duplicati nome (escluso se stesso)
    const duplicatePortfolio = await prisma.dCAPortfolio.findFirst({
      where: {
        userId: 1,
        name: name.trim(),
        id: { not: id }
      }
    })

    if (duplicatePortfolio) {
      return NextResponse.json(
        { error: 'Esiste già un portafoglio con questo nome' },
        { status: 400 }
      )
    }

    const updatedPortfolio = await prisma.dCAPortfolio.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        transactions: true,
        networkFees: true
      }
    })

    return NextResponse.json(updatedPortfolio)
  } catch (error) {
    console.error('Errore nell\'aggiornamento portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento portafoglio DCA' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella portafoglio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    // Controlla se il portfolio esiste
    const existingPortfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 },
      include: {
        _count: {
          select: {
            transactions: true,
            networkFees: true
          }
        }
      }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Cancella il portfolio (CASCADE cancellerà automaticamente transazioni e fee)
    await prisma.dCAPortfolio.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Portafoglio cancellato con successo',
      deletedTransactions: existingPortfolio._count.transactions,
      deletedFees: existingPortfolio._count.networkFees
    })
  } catch (error) {
    console.error('Errore nella cancellazione portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione portafoglio DCA' },
      { status: 500 }
    )
  }
}