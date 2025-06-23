import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Enhanced Statistics Calculator (INVARIATO)
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter(tx => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  // 💰 INVESTIMENTI E RECUPERI
  const totalInvested = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.eurPaid), 0)
  const capitalRecovered = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.eurPaid), 0)
  
  // 📈 PROFITTI/PERDITE REALIZZATI
  const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBuyEUR = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.eurPaid), 0)
  const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellEUR = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.eurPaid), 0)
  
  // Prezzo medio di acquisto
  const avgBuyPrice = totalBuyBTC > 0 ? totalBuyEUR / totalBuyBTC : 0
  
  // Calcolo profitti realizzati
  const realizedGains = totalSellBTC > 0 ? totalSellEUR - (totalSellBTC * avgBuyPrice) : 0
  const realizedLoss = realizedGains < 0 ? Math.abs(realizedGains) : 0
  const realizedGainsNet = Math.max(0, realizedGains)
  
  // 🎯 METRICHE AVANZATE
  const effectiveInvestment = totalInvested - capitalRecovered
  const remainingCostBasis = Math.max(0, effectiveInvestment)
  const isFullyRecovered = capitalRecovered >= totalInvested
  const freeBTCAmount = isFullyRecovered ? totalBuyBTC - totalSellBTC : 0
  
  // 📊 BTC HOLDINGS
  const totalBTC = totalBuyBTC - totalSellBTC
  const totalEUR = totalBuyEUR - totalSellEUR
  
  // 🔄 LEGACY COMPATIBILITY
  const legacyNetCashFlow = totalSellEUR - totalBuyEUR
  const legacyActualInvestment = Math.max(0, totalBuyEUR - totalSellEUR)

  return {
    // 🆕 ENHANCED FIELDS
    totalInvested,
    capitalRecovered,
    realizedGains: realizedGainsNet,
    realizedLoss,
    remainingCostBasis,
    effectiveInvestment,
    isFullyRecovered,
    freeBTCAmount,
    hasRealizedGains: realizedGainsNet > 0,
    hasRealizedLoss: realizedLoss > 0,
    realizedROI: totalInvested > 0 ? (realizedGains / totalInvested) * 100 : 0,
    
    // 📊 BTC METRICS
    totalBTC,
    totalEUR,
    totalBuyBTC,
    totalBuyEUR,
    totalSellBTC,
    totalSellEUR,
    avgBuyPrice,
    
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

// PUT - Aggiorna portafoglio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { name, isActive } = body

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
      data: { 
        name: name.trim(),
        isActive: isActive !== undefined ? isActive : existingPortfolio.isActive,
        updatedAt: new Date()
      },
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

    return NextResponse.json(updatedPortfolio)
  } catch (error) {
    console.error('Errore nell\'aggiornamento portafoglio:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del portafoglio' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina portafoglio
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
      where: { id, userId: 1 },
      include: {
        transactions: true,
        networkFees: true
      }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // Verifica se ci sono transazioni collegate
    const transactionCount = await prisma.dCATransaction.count({
      where: { portfolioId: id }
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { 
          error: `Impossibile cancellare: il portafoglio contiene ${transactionCount} transazioni. Cancella prima tutte le transazioni.` 
        },
        { status: 400 }
      )
    }

    // Cancella prima le fee di rete
    await prisma.networkFee.deleteMany({
      where: { portfolioId: id }
    })

    // Poi cancella il portfolio
    await prisma.dCAPortfolio.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Portafoglio eliminato con successo',
      name: existingPortfolio.name
    })
  } catch (error) {
    console.error('Errore nell\'eliminazione portafoglio:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione del portafoglio' },
      { status: 500 }
    )
  }
}