// src/app/api/dca-portfolios/route.ts - ENHANCED CASH FLOW VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Funzione per calcolare Enhanced Cash Flow Statistics (same as individual)
function calculateEnhancedStats(transactions: any[]) {
  // Separa acquisti e vendite
  const buyTransactions = transactions.filter(tx => tx.type === 'buy')
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  // Calcoli base
  const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBuyEUR = buyTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
  const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellEUR = sellTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)

  // 🎯 ENHANCED CASH FLOW LOGIC
  const totalInvested = totalBuyEUR // Investimento fisso (non cambia mai)
  const capitalRecovered = Math.min(totalInvested, totalSellEUR) // Quanto ho ripreso del mio investimento
  const realizedGains = Math.max(0, totalSellEUR - totalInvested) // Profitti realizzati
  const realizedLoss = Math.max(0, totalInvested - totalSellEUR) // Perdite realizzate (se applicable)

  // BTC calculations
  const totalBTC = totalBuyBTC - totalSellBTC
  const isFullyRecovered = capitalRecovered >= totalInvested
  const remainingCostBasis = isFullyRecovered ? 0 : (totalInvested - capitalRecovered)
  const effectiveInvestment = totalInvested - capitalRecovered // Soldi ancora "a rischio"
  
  // Status flags
  const freeBTCAmount = isFullyRecovered ? totalBTC : 0
  const hasRealizedGains = realizedGains > 0
  const hasRealizedLoss = realizedLoss > 0

  // Legacy compatibility (per non rompere UI esistente)
  const legacyNetCashFlow = totalBuyEUR - totalSellEUR
  const legacyActualInvestment = Math.max(0, legacyNetCashFlow)

  return {
    // 📊 ORIGINAL FIELDS (compatibility)
    totalBuyBTC,
    totalBuyEUR,
    totalSellBTC,
    totalSellEUR,
    totalBTC,
    totalEUR: effectiveInvestment, // 🔄 CHANGED: now represents "money still at risk"
    
    // ✨ ENHANCED FIELDS
    totalInvested,           // Investimento totale effettivo
    capitalRecovered,        // Capitale recuperato dall'investimento
    realizedGains,          // Profitti realizzati
    realizedLoss,           // Perdite realizzate
    remainingCostBasis,     // Costo base dei BTC rimasti
    effectiveInvestment,    // Soldi ancora a rischio
    
    // 🎯 STATUS FLAGS
    isFullyRecovered,       // Investimento completamente recuperato
    freeBTCAmount,         // BTC "gratuiti"
    hasRealizedGains,      // Ha profitti realizzati
    hasRealizedLoss,       // Ha perdite realizzate
    
    // 📈 PERFORMANCE METRICS
    realizedROI: totalInvested > 0 ? (realizedGains / totalInvested) * 100 : 0,
    
    // 🔄 LEGACY (backward compatibility)
    netCashFlow: legacyNetCashFlow,
    actualInvestment: legacyActualInvestment,
    isFreeBTC: legacyActualInvestment <= 0,
    
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

    // 🔄 ENHANCED: Calcola statistiche con Enhanced Cash Flow per ogni portfolio
    const portfoliosWithEnhancedStats = portfolios.map(portfolio => {
      // Enhanced Stats per il portfolio
      const enhancedStats = calculateEnhancedStats(portfolio.transactions)

      // Fee di rete
      const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
      const totalFeesBTC = totalFeesSats / 100000000
      const netBTC = enhancedStats.totalBTC - totalFeesBTC

      // Prezzo medio di acquisto
      const avgPurchasePrice = enhancedStats.totalBuyBTC > 0 ? 
        enhancedStats.totalBuyEUR / enhancedStats.totalBuyBTC : 0

      // Final stats con Enhanced + Fees
      const finalStats = {
        ...enhancedStats,
        totalFeesSats,
        totalFeesBTC,
        netBTC,
        avgPrice: avgPurchasePrice,
        feesCount: portfolio._count.networkFees
      }

      return {
        ...portfolio,
        stats: finalStats
      }
    })

    return NextResponse.json(portfoliosWithEnhancedStats)
  } catch (error) {
    console.error('Errore nel recupero portafogli DCA:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero portafogli DCA' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo portafoglio DCA (unchanged)
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

    // Verifica che l'account esista ed sia di tipo investimento
    const account = await prisma.account.findUnique({
      where: { id: parseInt(accountId) }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Conto di investimento non trovato' },
        { status: 400 }
      )
    }

    if (account.type !== 'investment') {
      return NextResponse.json(
        { error: 'Il conto deve essere di tipo investimento' },
        { status: 400 }
      )
    }

    const newPortfolio = await prisma.dCAPortfolio.create({
      data: {
        name: name.trim(),
        type,
        userId: 1,
        accountId: parseInt(accountId)
      },
      include: {
        account: true,
        _count: {
          select: {
            transactions: true,
            networkFees: true
          }
        }
      }
    })

    // Portfolio appena creato avrà stats vuote
    const emptyStats = {
      totalBuyBTC: 0,
      totalBuyEUR: 0,
      totalSellBTC: 0,
      totalSellEUR: 0,
      totalBTC: 0,
      totalEUR: 0,
      totalInvested: 0,
      capitalRecovered: 0,
      realizedGains: 0,
      realizedLoss: 0,
      remainingCostBasis: 0,
      effectiveInvestment: 0,
      isFullyRecovered: false,
      freeBTCAmount: 0,
      hasRealizedGains: false,
      hasRealizedLoss: false,
      realizedROI: 0,
      netCashFlow: 0,
      actualInvestment: 0,
      isFreeBTC: false,
      transactionCount: 0,
      buyCount: 0,
      sellCount: 0,
      totalFeesSats: 0,
      totalFeesBTC: 0,
      netBTC: 0,
      avgPrice: 0,
      feesCount: 0
    }

    return NextResponse.json({
      ...newPortfolio,
      transactions: [],
      networkFees: [],
      stats: emptyStats
    })
  } catch (error) {
    console.error('Errore nella creazione portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione portafoglio DCA' },
      { status: 500 }
    )
  }
}