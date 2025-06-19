// src/app/api/dca-portfolios/route.ts - CON METODO CASH FLOW
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista tutti i portafogli DCA con calcolo Cash Flow
export async function GET() {
  try {
    const portfolios = await prisma.dCAPortfolio.findMany({
      where: { userId: 1 }, // Default user
      include: {
        transactions: true,
        networkFees: true,
        account: true,
        _count: {
          select: {
            transactions: true,
            networkFees: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 🔄 NUOVO: Calcola statistiche con metodo Cash Flow per ogni portfolio
    const portfoliosWithStats = portfolios.map(portfolio => {
      // Separa acquisti e vendite
      const buyTransactions = portfolio.transactions.filter(tx => tx.type === 'buy')
      const sellTransactions = portfolio.transactions.filter(tx => tx.type === 'sell')

      // Totali acquisti e vendite
      const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
      const totalBuyEUR = buyTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
      const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
      const totalSellEUR = sellTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)

      // BTC totali (acquisti - vendite)
      const totalBTC = totalBuyBTC - totalSellBTC
      
      // 💰 CASH FLOW NETTO: Quanto ho speso al netto
      const netCashFlow = totalBuyEUR - totalSellEUR

      // 🎯 LOGICA CASH FLOW: Se negativo o zero = investimento 0€
      const actualInvestment = Math.max(0, netCashFlow)

      // Fee di rete
      const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
      const totalFeesBTC = totalFeesSats / 100000000
      const netBTC = totalBTC - totalFeesBTC

      // Prezzo medio di acquisto (solo sui BTC comprati)
      const avgPurchasePrice = totalBuyBTC > 0 ? totalBuyEUR / totalBuyBTC : 0

      return {
        ...portfolio,
        stats: {
          // 🔄 NUOVI CAMPI CASH FLOW
          totalBuyBTC,
          totalBuyEUR,
          totalSellBTC,
          totalSellEUR,
          netCashFlow,
          actualInvestment, // 🎯 Investimento reale secondo cash flow
          isFreeBTC: actualInvestment <= 0, // 🎉 Flag "BTC Gratuiti"
          
          // 📊 CAMPI ESISTENTI (per compatibilità)
          totalBTC,
          totalEUR: actualInvestment, // 🔄 CAMBIATO: ora usa actualInvestment
          totalFeesSats,
          totalFeesBTC,
          netBTC,
          avgPrice: avgPurchasePrice, // 🔄 CAMBIATO: prezzo medio di acquisto
          
          // 📈 CONTATORI
          transactionCount: portfolio._count.transactions,
          feesCount: portfolio._count.networkFees,
          buyCount: buyTransactions.length,
          sellCount: sellTransactions.length
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