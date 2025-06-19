// src/app/api/dca-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista transazioni DCA (con filtro opzionale per portfolio)
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

    const transactions = await prisma.dCATransaction.findMany({
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
    const userTransactions = transactions.filter(tx => tx.portfolio.userId === 1)

    // Aggiungi prezzo di acquisto calcolato
    const transactionsWithPrice = userTransactions.map(tx => ({
      ...tx,
      purchasePrice: tx.eurPaid / tx.btcQuantity
    }))

    return NextResponse.json(transactionsWithPrice)
  } catch (error) {
    console.error('Errore nel recupero transazioni DCA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero transazioni DCA' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova transazione DCA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolioId, date, broker, info, btcQuantity, eurPaid, notes } = body

    // Validazioni
    if (!portfolioId || !broker || !info || !btcQuantity || !eurPaid) {
      return NextResponse.json(
        { error: 'Campi obbligatori: portfolioId, broker, info, btcQuantity, eurPaid' },
        { status: 400 }
      )
    }

    if (btcQuantity <= 0 || eurPaid <= 0) {
      return NextResponse.json(
        { error: 'Quantità BTC e Euro pagati devono essere maggiori di zero' },
        { status: 400 }
      )
    }

    // Verifica che il portfolio esista e appartenga all'utente
    const portfolio = await prisma.dCAPortfolio.findUnique({
      where: { id: parseInt(portfolioId) },
      include: {
        account: true // Include il conto collegato
      }
    })

    if (!portfolio || portfolio.userId !== 1) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Verifica che il portfolio abbia un conto collegato
    if (!portfolio.account) {
      return NextResponse.json(
        { error: 'Portfolio non ha un conto di investimento collegato' },
        { status: 400 }
      )
    }

    // Verifica che il conto abbia liquidità sufficiente
    if (portfolio.account.balance < parseFloat(eurPaid)) {
      return NextResponse.json(
        { 
          error: 'Liquidità insufficiente',
          currentBalance: portfolio.account.balance,
          required: parseFloat(eurPaid),
          deficit: parseFloat(eurPaid) - portfolio.account.balance,
          accountName: portfolio.account.name
        },
        { status: 400 }
      )
    }

    // Crea transazione e aggiorna saldo in una transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // Crea la transazione DCA
      const transaction = await tx.dCATransaction.create({
        data: {
          portfolioId: parseInt(portfolioId),
          date: date ? new Date(date) : new Date(),
          broker: broker.trim(),
          info: info.trim(),
          btcQuantity: parseFloat(btcQuantity),
          eurPaid: parseFloat(eurPaid),
          notes: notes?.trim() || null,
          accountId: portfolio.account.id // Collega la transazione al conto
        },
        include: {
          portfolio: {
            select: {
              id: true,
              name: true
            }
          },
          account: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Scala i soldi dal conto di investimento
      await tx.account.update({
        where: { id: portfolio.account.id },
        data: { balance: { decrement: parseFloat(eurPaid) } }
      })

      return transaction
    })

    // Aggiungi prezzo di acquisto calcolato
    const transactionWithPrice = {
      ...result,
      purchasePrice: result.eurPaid / result.btcQuantity
    }

    return NextResponse.json(transactionWithPrice, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione transazione DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione transazione DCA' },
      { status: 500 }
    )
  }
}