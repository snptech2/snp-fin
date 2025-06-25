// src/app/api/dca-portfolios/route.ts - FIX PREZZO MEDIO
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC - UNIFICATA con [id]/route.ts
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter(tx => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
  const capitalRecovered = sellTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  const realizedProfit = Math.max(0, capitalRecovered - totalInvested)

  // BTC calculations
  const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBTC = totalBuyBTC - totalSellBTC

  // Advanced metrics
  const isFullyRecovered = capitalRecovered >= totalInvested
  const freeBTCAmount = isFullyRecovered ? totalBTC : 0

  return {
    // 🆕 ENHANCED CASH FLOW FIELDS (source of truth)
    totalInvested,           // Invariante - somma storica di tutti i buy
    capitalRecovered,        // Somma di tutti i sell
    effectiveInvestment,     // Denaro ancora "a rischio"
    realizedProfit,          // Solo se capitalRecovered > totalInvested
    isFullyRecovered,        // Flag se ho recuperato tutto l'investimento
    
    // 📊 BTC METRICS
    totalBTC,
    totalBuyBTC,
    totalSellBTC,
    freeBTCAmount,          // BTC "gratis" se fully recovered
    
    // 📊 COUNTERS
    transactionCount: transactions.length,
    buyCount: buyTransactions.length,
    sellCount: sellTransactions.length
  }
}

// GET - Lista tutti i portafogli DCA con Enhanced Cash Flow
export async function GET() {
  try {
    const portfolios = await prisma.dCAPortfolio.findMany({
      where: { userId: 1 },
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

    // 🎯 FASE 1: Calcola Enhanced statistics per ogni portfolio
    const portfoliosWithEnhancedStats = portfolios.map(portfolio => {
      // Applica Enhanced Cash Flow Logic
      const enhancedStats = calculateEnhancedStats(portfolio.transactions)

      // Fee di rete
      const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
      const totalFeesBTC = totalFeesSats / 100000000
      const netBTC = enhancedStats.totalBTC - totalFeesBTC

      // 🔧 FIX: Calcola prezzo medio sui BTC NETTI, non sui BTC comprati totali
      const avgPurchasePrice = netBTC > 0 ? enhancedStats.totalInvested / netBTC : 0

      // Final stats - Enhanced è source of truth
      const finalStats = {
        ...enhancedStats,
        totalFeesSats,
        totalFeesBTC,
        netBTC,
        avgPurchasePrice,    // 🔧 FIX: Ora calcolato correttamente
        feesCount: portfolio.networkFees.length
      }

      return {
        ...portfolio,
        stats: finalStats
      }
    })

    return NextResponse.json(portfoliosWithEnhancedStats)
  } catch (error) {
    console.error('Errore recupero DCA portfolios:', error)
    return NextResponse.json({ error: 'Errore recupero DCA portfolios' }, { status: 500 })
  }
}

// POST - Crea nuovo portafoglio DCA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, accountId } = body

    // Validazioni
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome portafoglio richiesto' }, { status: 400 })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account collegato richiesto' }, { status: 400 })
    }

    // Verifica che l'account esista e sia di investimento
    const account = await prisma.account.findFirst({
      where: { 
        id: parseInt(accountId), 
        userId: 1,
        type: 'investment'
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account di investimento non trovato' }, { status: 404 })
    }

    // Verifica che non esista già un portfolio con lo stesso nome
    const existingPortfolio = await prisma.dCAPortfolio.findFirst({
      where: {
        userId: 1,
        name: name.trim()
      }
    })

    if (existingPortfolio) {
      return NextResponse.json({ error: 'Esiste già un portfolio con questo nome' }, { status: 400 })
    }

    const portfolio = await prisma.dCAPortfolio.create({
      data: {
        name: name.trim(),
        userId: 1,
        accountId: parseInt(accountId),
        isActive: true
      },
      include: {
        account: {
          select: { id: true, name: true, balance: true }
        }
      }
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error) {
    console.error('Errore creazione DCA portfolio:', error)
    return NextResponse.json({ error: 'Errore creazione DCA portfolio' }, { status: 500 })
  }
}