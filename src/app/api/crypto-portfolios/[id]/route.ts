// src/app/api/crypto-portfolios/[id]/route.ts - CON DEBUG INTEGRATO
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC - UNIFICATA con DCA logic + STAKING REWARDS + SWAP + NETWORK FEES
function calculateEnhancedStats(transactions: any[], networkFees: any[] = [], currentPrices: Record<string, number> = {}) {
  const buyTransactions = transactions.filter((tx: any) => tx.type === 'buy' || !tx.type) // 🔧 FIX: Rimuovi swap_in da investimenti
  const sellTransactions = transactions.filter((tx: any) => tx.type === 'sell') // 🔧 FIX: Solo vendite reali
  const swapOutTransactions = transactions.filter((tx: any) => tx.type === 'swap_out') // 🆕 Separato dagli swap
  const stakeRewardTransactions = transactions.filter((tx: any) => tx.type === 'stake_reward')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum: number, tx: any) => sum + tx.eurValue, 0)
  // FIX: Capitale recuperato è limitato all'investimento totale
  const totalSold = sellTransactions.reduce((sum: number, tx: any) => sum + tx.eurValue, 0)
  const capitalRecovered = Math.min(totalSold, totalInvested)
  // 🔧 FIX: Calcolo dinamico staking rewards (valore corrente se eurValue = 0)
  const stakeRewards = stakeRewardTransactions.reduce((sum: number, tx: any) => {
    if (tx.eurValue > 0) {
      // Usa valore del CSV se specificato
      return sum + tx.eurValue
    } else {
      // Calcola valore corrente per rewards con eurValue = 0
      const currentPrice = currentPrices[tx.asset?.symbol] || 0
      const currentValue = tx.quantity * currentPrice
      console.log(`💎 Stake reward ${tx.asset?.symbol}: ${tx.quantity} × €${currentPrice} = €${currentValue}`)
      return sum + currentValue
    }
  }, 0)
  
  // 🆕 NETWORK FEES - Calcoli aggregati
  const totalFeesEur = networkFees.reduce((sum: number, fee: any) => sum + (fee.eurValue || 0), 0)
  const networkFeesCount = networkFees.length

  // 🆕 FEES BY ASSET - Raggruppamento per asset
  const feesByAsset = networkFees.reduce((acc: any, fee: any) => {
    const symbol = fee.asset?.symbol || 'UNKNOWN'
    if (!acc[symbol]) {
      acc[symbol] = {
        quantity: 0,
        eurValue: 0,
        count: 0,
        asset: fee.asset
      }
    }
    acc[symbol].quantity += fee.quantity || 0
    acc[symbol].eurValue += fee.eurValue || 0
    acc[symbol].count += 1
    return acc
  }, {})
  
  // 🆕 Calcolo capital recovered da swap (per statistiche separate)
  const capitalFromSwaps = swapOutTransactions.reduce((sum: number, tx: any) => sum + tx.eurValue, 0)
  
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  // FIX: Profitto realizzato = vendite totali - investimento totale (se positivo)
  const realizedProfit = Math.max(0, totalSold - totalInvested) + stakeRewards

  return {
    totalInvested,
    capitalRecovered, // FIX: Solo vendite reali, NON swap
    capitalFromSwaps, // 🆕 Separato: capitale da swap (informativo)
    effectiveInvestment,
    realizedProfit,
    stakeRewards,
    isFullyRecovered: capitalRecovered >= totalInvested,
    transactionCount: transactions.length,
    buyCount: buyTransactions.length,
    sellCount: sellTransactions.length, // 🔧 FIX: Solo vendite reali
    swapCount: swapOutTransactions.length, // 🆕 Conteggio swap separato
    stakeRewardCount: stakeRewardTransactions.length,
    // 🆕 NETWORK FEES STATS
    totalFeesEur,
    networkFeesCount,
    feesByAsset
  }
}

// 🆕 NUOVA FUNZIONE: Ottieni prezzi correnti per gli asset
async function fetchCurrentPrices(symbols: string[], request: NextRequest): Promise<Record<string, number>> {
  try {
    if (symbols.length === 0) return {}
    
    console.log('🔍 Fetching current prices for:', symbols.join(', '))
    
    // Costruisci URL interno per l'API crypto-prices
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const symbolsParam = symbols.join(',')
    const url = `${baseUrl}/api/crypto-prices?symbols=${symbolsParam}`
    
    // Passa i cookie di autenticazione dalla richiesta originale
    const authCookie = request.headers.get('cookie')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0',
        ...(authCookie ? { 'Cookie': authCookie } : {}),
      },
      // Force fresh data per backend calculations
      cache: 'no-store'
    })

    if (!response.ok) {
      console.warn('⚠️ Errore API crypto-prices:', response.status)
      return {}
    }

    const data = await response.json()
    console.log('✅ Current prices fetched:', data.prices)
    return data.prices || {}
    
  } catch (error) {
    console.error('❌ Errore fetch prezzi correnti:', error)
    return {}
  }
}

// GET - Dettaglio crypto portfolio specifico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const portfolioId = parseInt(params.id)

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: portfolioId, userId }, // 🔄 Sostituito: userId: 1 → userId
      include: {
        account: {
          select: { id: true, name: true, balance: true }
        },
        holdings: {
          include: { asset: true }
        },
        transactions: {
          include: { asset: true },
          orderBy: { date: 'desc' }
        },
        networkFees: {
          include: { asset: true },
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // 🆕 Fetch prezzi correnti per holdings E per staking rewards
    const holdingsSymbols = portfolio.holdings.map(h => h.asset.symbol.toUpperCase())
    const stakeSymbols = portfolio.transactions
      .filter(tx => tx.type === 'stake_reward')
      .map(tx => tx.asset.symbol.toUpperCase())
    const allSymbols = [...new Set([...holdingsSymbols, ...stakeSymbols])]
    const currentPrices = await fetchCurrentPrices(allSymbols, request)

    // 🎯 Applica Enhanced Statistics (con network fees E prezzi correnti)
    const enhancedStats = calculateEnhancedStats(portfolio.transactions, portfolio.networkFees, currentPrices)

    // 🆕 Valore totale calcolato successivamente dai holdings aggiornati (con fees detratte)
    let totalValueEur = 0

    // 🆕 Aggiorna i holdings con i prezzi correnti e network fees
    const holdingsWithCurrentPrices = portfolio.holdings.map(holding => {
      const currentPrice = currentPrices[holding.asset.symbol] || holding.currentPrice || holding.avgPrice
      
      // 🆕 Calcola fees per questo asset
      const assetFees = enhancedStats.feesByAsset[holding.asset.symbol]
      const feesQuantity = assetFees ? assetFees.quantity : 0
      const feesEurValue = assetFees ? assetFees.eurValue : 0
      
      // 🆕 Quantità netta (holdings - fees)
      const netQuantity = Math.max(0, holding.quantity - feesQuantity)
      const netValueEur = netQuantity * currentPrice
      
      return {
        ...holding,
        currentPrice,
        valueEur: netValueEur,
        netQuantity, // 🆕 Quantità dopo fees
        feesQuantity, // 🆕 Fees in questo asset
        feesEurValue, // 🆕 Valore EUR fees
        lastUpdated: new Date().toISOString()
      }
    })

    // 🆕 Calcola il valore totale EUR dai holdings aggiornati (con fees detratte)
    totalValueEur = holdingsWithCurrentPrices.reduce((sum, holding) => sum + holding.valueEur, 0)
    
    // 🆕 Ricalcola unrealized gains e ROI con valore netto
    const unrealizedGainsNet = totalValueEur - enhancedStats.effectiveInvestment
    const totalROINet = enhancedStats.totalInvested > 0 ?
      ((enhancedStats.realizedProfit + unrealizedGainsNet) / enhancedStats.totalInvested) * 100 : 0

    const portfolioWithStats = {
      ...portfolio,
      accountId: portfolio.account.id, // Aggiungi accountId per compatibilità
      type: 'crypto_wallet', // Aggiungi tipo per distinguere da DCA
      holdings: holdingsWithCurrentPrices,
      stats: {
        ...enhancedStats,
        // 🆕 VALORE ATTUALE CORRETTO con prezzi live (netto di fees)
        totalValueEur,
        unrealizedGains: unrealizedGainsNet,
        totalROI: totalROINet,
        holdingsCount: portfolio.holdings.length,
        // 🆕 Aggiungi info sui prezzi
        pricesUpdated: currentPrices && Object.keys(currentPrices).length > 0,
        pricesTimestamp: new Date().toISOString()
      }
    }

    console.log('✅ Crypto portfolio detail with corrected current values')

    return NextResponse.json(portfolioWithStats)

  } catch (error) {
    console.error('💥 Errore API crypto-portfolio detail:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna crypto portfolio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const portfolioId = parseInt(params.id)
    const body = await request.json()
    const { name, description } = body

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome portfolio richiesto' }, { status: 400 })
    }

    // Verifica che il portfolio esista ed appartenga all'utente
    const existingPortfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: portfolioId, userId } // 🔄 Sostituito: userId: 1 → userId
    })

    if (!existingPortfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Controlla se esiste già un altro portfolio con lo stesso nome
    const duplicatePortfolio = await prisma.cryptoPortfolio.findFirst({
      where: {
        userId, // 🔄 Sostituito: userId: 1 → userId
        name: name.trim(),
        id: { not: portfolioId }
      }
    })

    if (duplicatePortfolio) {
      return NextResponse.json({ error: 'Esiste già un portfolio con questo nome' }, { status: 400 })
    }

    const updatedPortfolio = await prisma.cryptoPortfolio.update({
      where: { id: portfolioId },
      data: { 
        name: name.trim(),
        description: description?.trim() || null
      }
    })

    return NextResponse.json(updatedPortfolio)
  } catch (error) {
    console.error('Errore aggiornamento crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore aggiornamento crypto portfolio' }, { status: 500 })
  }
}

// DELETE - Elimina crypto portfolio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const portfolioId = parseInt(params.id)

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    // Verifica che il portfolio esista ed appartenga all'utente
    const existingPortfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: portfolioId, userId } // 🔄 Sostituito: userId: 1 → userId
    })

    if (!existingPortfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Elimina portfolio e dati correlati in una transazione
    await prisma.$transaction([
      prisma.cryptoPortfolioTransaction.deleteMany({ where: { portfolioId } }),
      prisma.cryptoPortfolioHolding.deleteMany({ where: { portfolioId } }),
      prisma.cryptoPortfolio.delete({ where: { id: portfolioId } })
    ])

    return NextResponse.json({ message: 'Portfolio eliminato con successo' })
  } catch (error) {
    console.error('Errore eliminazione crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore eliminazione crypto portfolio' }, { status: 500 })
  }
}