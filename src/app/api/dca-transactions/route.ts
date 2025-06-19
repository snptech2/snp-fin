// src/app/api/dca-transactions/route.ts - VERSIONE CORRETTA
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista transazioni DCA (INVARIATO)
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
      purchasePrice: tx.eurPaid / Math.abs(tx.btcQuantity) // 🟠 AGGIORNATO: Math.abs per gestire negative
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

// POST - Crea nuova transazione DCA (AGGIORNATO per supportare vendite)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // 🟠 AGGIUNTO: campo type opzionale
    const { portfolioId, date, type = 'buy', broker, info, btcQuantity, eurPaid, notes } = body

    // Validazioni (INVARIATE)
    if (!portfolioId || !broker || !info || !btcQuantity || !eurPaid) {
      return NextResponse.json(
        { error: 'Campi obbligatori: portfolioId, broker, info, btcQuantity, eurPaid' },
        { status: 400 }
      )
    }

    // 🟠 AGGIORNATO: Validazione per supportare vendite
    if (Math.abs(parseFloat(btcQuantity)) <= 0 || parseFloat(eurPaid) <= 0) {
      return NextResponse.json(
        { error: 'Quantità BTC e Euro devono essere maggiori di zero' },
        { status: 400 }
      )
    }

    // Verifica che il portfolio esista e appartenga all'utente (INVARIATO)
    const portfolio = await prisma.dCAPortfolio.findUnique({
      where: { id: parseInt(portfolioId) },
      include: {
        account: true
      }
    })

    if (!portfolio || portfolio.userId !== 1) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    if (!portfolio.account) {
      return NextResponse.json(
        { error: 'Portfolio non ha un conto di investimento collegato' },
        { status: 400 }
      )
    }

    const btcQty = parseFloat(btcQuantity)
    const eurAmt = parseFloat(eurPaid)

    // 🟠 NUOVO: Validazioni specifiche per tipo
    if (type === 'buy') {
      // ACQUISTO: Verifica liquidità sufficiente (LOGICA ORIGINALE)
      if (portfolio.account.balance < eurAmt) {
        return NextResponse.json(
          { 
            error: 'Liquidità insufficiente',
            currentBalance: portfolio.account.balance,
            required: eurAmt,
            deficit: eurAmt - portfolio.account.balance,
            accountName: portfolio.account.name
          },
          { status: 400 }
        )
      }
    } else if (type === 'sell') {
      // 🟠 NUOVO: VENDITA - Verifica BTC sufficienti
      const existingTransactions = await prisma.dCATransaction.findMany({
        where: { portfolioId: parseInt(portfolioId) }
      })

      let totalBtcHeld = 0
      for (const tx of existingTransactions) {
        totalBtcHeld += tx.btcQuantity // Somma direttamente (positivi e negativi)
      }

      if (totalBtcHeld < btcQty) {
        return NextResponse.json(
          {
            error: 'BTC insufficienti nel portfolio',
            currentBtc: totalBtcHeld,
            required: btcQty,
            deficit: btcQty - totalBtcHeld
          },
          { status: 400 }
        )
      }
    }

    // Crea transazione e aggiorna saldo (AGGIORNATO)
    const result = await prisma.$transaction(async (tx) => {
      // Crea la transazione DCA
      const transaction = await tx.dCATransaction.create({
        data: {
          portfolioId: parseInt(portfolioId),
          date: date ? new Date(date) : new Date(),
          type: type, // 🟠 NUOVO: Salva il tipo
          broker: broker.trim(),
          info: info.trim(),
          btcQuantity: type === 'buy' ? btcQty : -btcQty, // 🟠 NUOVO: Negativo per vendite
          eurPaid: eurAmt,
          notes: notes?.trim() || null,
          accountId: portfolio.account.id
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

      // 🟠 AGGIORNATO: Aggiorna saldo in base al tipo
      if (type === 'buy') {
        // ACQUISTO: Scala i soldi dal conto (LOGICA ORIGINALE)
        await tx.account.update({
          where: { id: portfolio.account.id },
          data: { balance: { decrement: eurAmt } }
        })
      } else {
        // 🟠 NUOVO: VENDITA - Aggiungi i soldi al conto
        await tx.account.update({
          where: { id: portfolio.account.id },
          data: { balance: { increment: eurAmt } }
        })
      }

      return transaction
    })

    // Aggiungi prezzo calcolato (AGGIORNATO)
    const transactionWithPrice = {
      ...result,
      purchasePrice: result.eurPaid / Math.abs(result.btcQuantity) // 🟠 AGGIORNATO: Math.abs
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