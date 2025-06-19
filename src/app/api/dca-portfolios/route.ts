// src/app/api/dca-portfolios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista tutti i portafogli DCA
export async function GET() {
  try {
    const portfolios = await prisma.dCAPortfolio.findMany({
      where: { userId: 1 }, // Default user
      include: {
        transactions: true,
        networkFees: true,
        account: true, // ← Include account data
        _count: {
          select: {
            transactions: true,
            networkFees: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcola statistiche per ogni portfolio
    const portfoliosWithStats = portfolios.map(portfolio => {
      const totalBTC = portfolio.transactions.reduce((sum, tx) => sum + tx.btcQuantity, 0)
      const totalEUR = portfolio.transactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
      const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
      const totalFeesBTC = totalFeesSats / 100000000 // Converti sats in BTC
      const netBTC = totalBTC - totalFeesBTC
      const avgPrice = totalBTC > 0 ? totalEUR / totalBTC : 0

      return {
        ...portfolio,
        stats: {
          totalBTC,
          totalEUR,
          totalFeesSats,
          totalFeesBTC,
          netBTC,
          avgPrice,
          transactionCount: portfolio._count.transactions,
          feesCount: portfolio._count.networkFees
        }
      }
    })

    return NextResponse.json(portfoliosWithStats)
  } catch (error) {
    console.error('Errore nel recupero portafogli DCA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero portafogli DCA' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo portafoglio DCA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type = 'dca_bitcoin', accountId } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome portafoglio richiesto' },
        { status: 400 }
      )
    }

    // OBBLIGATORIO: accountId deve essere specificato
    if (!accountId) {
      return NextResponse.json(
        { error: 'Conto di investimento obbligatorio' },
        { status: 400 }
      )
    }

    // Controlla se esiste già un portfolio con lo stesso nome
    const existingPortfolio = await prisma.dCAPortfolio.findFirst({
      where: {
        userId: 1,
        name: name.trim()
      }
    })

    if (existingPortfolio) {
      return NextResponse.json(
        { error: 'Esiste già un portafoglio con questo nome' },
        { status: 400 }
      )
    }

    // Verifica che l'accountId sia un conto di investimento valido
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: 1,
        type: 'investment'
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account di investimento non valido' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.dCAPortfolio.create({
      data: {
        name: name.trim(),
        type,
        userId: 1,
        accountId: accountId
      },
      include: {
        transactions: true,
        networkFees: true,
        account: true
      }
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione portafoglio DCA' },
      { status: 500 }
    )
  }
}