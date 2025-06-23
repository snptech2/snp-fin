// src/app/api/dca-portfolios/[id]/route.ts - ENHANCED CASH FLOW VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Funzione per calcolare Enhanced Cash Flow Statistics
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
    totalInvested,           // 1000€ (sempre fisso)
    capitalRecovered,        // 1000€ (quanto recuperato dell'investimento)
    realizedGains,          // 1000€ (profitti realizzati)
    realizedLoss,           // 0€ (perdite realizzate)
    remainingCostBasis,     // 0€ (costo base dei BTC rimasti)
    effectiveInvestment,    // 0€ (soldi ancora a rischio)
    
    // 🎯 STATUS FLAGS
    isFullyRecovered,       // true (investimento completamente recuperato)
    freeBTCAmount,         // 0.005 (BTC "gratuiti")
    hasRealizedGains,      // true
    hasRealizedLoss,       // false
    
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

// GET - Recupera portafoglio singolo con Enhanced Stats
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
        },
        account: {
          select: {
            id: true,
            name: true,
            balance: true
          }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Calcola Enhanced Statistics
    const enhancedStats = calculateEnhancedStats(portfolio.transactions)

    // Fee di rete
    const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
    const totalFeesBTC = totalFeesSats / 100000000
    const netBTC = enhancedStats.totalBTC - totalFeesBTC

    // Prezzo medio di acquisto (solo sui BTC comprati)
    const avgPurchasePrice = enhancedStats.totalBuyBTC > 0 ? 
      enhancedStats.totalBuyEUR / enhancedStats.totalBuyBTC : 0

    // Aggiungi prezzo di acquisto per ogni transazione
    const transactionsWithPrice = portfolio.transactions.map(tx => ({
      ...tx,
      purchasePrice: tx.eurPaid / Math.abs(tx.btcQuantity)
    }))

    // Final stats con Enhanced + Legacy + Fees
    const finalStats = {
      ...enhancedStats,
      totalFeesSats,
      totalFeesBTC,
      netBTC,
      avgPrice: avgPurchasePrice,
      feesCount: portfolio.networkFees.length
    }

    const portfolioWithStats = {
      ...portfolio,
      transactions: transactionsWithPrice,
      stats: finalStats
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

// PUT - Aggiorna portafoglio (unchanged)
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

    // Verifica che il portafoglio esista ed appartenga all'utente
    const existingPortfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Controlla se esiste già un altro portfolio con lo stesso nome
    const duplicatePortfolio = await prisma.dCAPortfolio.findFirst({
      where: {
        userId: 1,
        name: name.trim(),
        id: { not: id } // Esclude il portfolio corrente
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
        networkFees: true,
        account: true
      }
    })

    return NextResponse.json(updatedPortfolio)
  } catch (error) {
    console.error('Errore nell\'aggiornamento portafoglio:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento portafoglio' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina portafoglio (unchanged)
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

    // Verifica che il portafoglio esista ed appartenga all'utente
    const existingPortfolio = await prisma.dCAPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    await prisma.dCAPortfolio.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Portafoglio eliminato con successo' })
  } catch (error) {
    console.error('Errore nell\'eliminazione portafoglio:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione portafoglio' },
      { status: 500 }
    )
  }
}