// src/app/api/dca-portfolios/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 🔧 FIXED: Funzione per calcolare Enhanced Cash Flow Statistics (corretta)
function calculateEnhancedStats(transactions: any[]) {
  // Separa acquisti e vendite
  const buyTransactions = transactions.filter(tx => tx.type === 'buy')
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  // Calcoli base
  const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBuyEUR = buyTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
  const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellEUR = sellTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)

  // 🎯 ENHANCED CASH FLOW LOGIC - CORRETTA
  const totalInvested = totalBuyEUR // Investimento fisso (non cambia mai)
  const capitalRecovered = Math.min(totalInvested, totalSellEUR) // Quanto ho ripreso del mio investimento
  
  // 🔧 FIX: Le perdite realizzate esistono solo se ho venduto qualcosa E venduto per meno dell'investimento
  const realizedLoss = totalSellEUR > 0 ? Math.max(0, totalInvested - totalSellEUR) : 0
  
  // 🔧 FIX: I profitti realizzati esistono solo se ho venduto per più dell'investimento
  const realizedGains = totalSellEUR > totalInvested ? totalSellEUR - totalInvested : 0

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
    
    // ✨ ENHANCED FIELDS - CORRETTI
    totalInvested,           // Investimento totale effettivo
    capitalRecovered,        // Capitale recuperato dall'investimento
    realizedGains,          // 🔧 Profitti realizzati (corretti)
    realizedLoss,           // 🔧 Perdite realizzate (corrette)
    remainingCostBasis,     // Costo base dei BTC rimasti
    effectiveInvestment,    // Soldi ancora a rischio
    
    // 🎯 STATUS FLAGS
    isFullyRecovered,       // Investimento completamente recuperato
    freeBTCAmount,         // BTC "gratuiti"
    hasRealizedGains,      // Ha profitti realizzati
    hasRealizedLoss,       // Ha perdite realizzate
    
    // 📈 PERFORMANCE METRICS
    realizedROI: totalInvested > 0 ? ((realizedGains - realizedLoss) / totalInvested) * 100 : 0,
    
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

    // Verifica che l'account esista e sia di tipo investment
    const account = await prisma.account.findFirst({
      where: {
        id: parseInt(accountId),
        userId: 1,
        type: 'investment'
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Conto di investimento non trovato o non valido' },
        { status: 404 }
      )
    }

    const portfolio = await prisma.dCAPortfolio.create({
      data: {
        name: name.trim(),
        type,
        userId: 1, // Default user ID
        accountId: parseInt(accountId),
        isActive: true
      },
      include: {
        account: true
      }
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione portafoglio DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione del portafoglio' },
      { status: 500 }
    )
  }
}