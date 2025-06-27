// src/app/api/crypto-portfolios/[id]/route.ts - CON DEBUG INTEGRATO
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC - UNIFICATA con DCA logic
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter((tx: any) => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter((tx: any) => tx.type === 'sell')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum: number, tx: any) => sum + tx.eurValue, 0)
  const capitalRecovered = sellTransactions.reduce((sum: number, tx: any) => sum + tx.eurValue, 0)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  const realizedProfit = Math.max(0, capitalRecovered - totalInvested)

  return {
    totalInvested,
    capitalRecovered,
    effectiveInvestment,
    realizedProfit,
    isFullyRecovered: capitalRecovered >= totalInvested,
    transactionCount: transactions.length,
    buyCount: buyTransactions.length,
    sellCount: sellTransactions.length
  }
}

// 🆕 NUOVA FUNZIONE: Ottieni prezzi correnti per gli asset
async function fetchCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    if (symbols.length === 0) return {}
    
    console.log('🔍 Fetching current prices for:', symbols.join(', '))
    
    // Costruisci URL interno per l'API crypto-prices
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const symbolsParam = symbols.join(',')
    const url = `${baseUrl}/api/crypto-prices?symbols=${symbolsParam}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0',
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

// 🔍 FUNZIONE DEBUG: Analizza transazioni in dettaglio
function debugTransactions(portfolio: any) {
  console.log(`\n🔍 DEBUG PORTFOLIO: ${portfolio.name} (ID: ${portfolio.id})`)
  console.log(`📊 Totale transazioni: ${portfolio.transactions.length}`)

  const analysis = {
    portfolioInfo: {
      id: portfolio.id,
      name: portfolio.name,
      totalTransactions: portfolio.transactions.length
    },
    transactions: [],
    calculations: {
      buyTransactions: [],
      sellTransactions: []
    }
  }

  // Analizza ogni transazione
  let runningInvested = 0
  let runningRecovered = 0

  portfolio.transactions.forEach((tx: any, index: number) => {
    const transactionData = {
      index: index + 1,
      id: tx.id,
      date: tx.date.toISOString().split('T')[0],
      type: tx.type,
      asset: tx.asset.symbol,
      quantity: tx.quantity,
      eurValue: tx.eurValue,
      pricePerUnit: tx.pricePerUnit,
      notes: tx.notes || '-'
    }

    analysis.transactions.push(transactionData)

    if (tx.type === 'buy') {
      runningInvested += tx.eurValue
      analysis.calculations.buyTransactions.push({
        ...transactionData,
        runningInvested
      })
      console.log(`${index + 1}. 💰 BUY ${tx.quantity} ${tx.asset.symbol} = €${tx.eurValue} | Total Invested: €${runningInvested}`)
    } else if (tx.type === 'sell') {
      runningRecovered += tx.eurValue
      analysis.calculations.sellTransactions.push({
        ...transactionData,
        runningRecovered
      })
      console.log(`${index + 1}. 💸 SELL ${tx.quantity} ${tx.asset.symbol} = €${tx.eurValue} | Total Recovered: €${runningRecovered}`)
    }
  })

  // 🧮 CALCOLI ENHANCED CASH FLOW
  const enhancedStats = calculateEnhancedStats(portfolio.transactions)

  console.log(`\n📊 ENHANCED CASH FLOW RESULTS:`)
  console.log(`💰 Total Invested: €${enhancedStats.totalInvested}`)
  console.log(`🔄 Capital Recovered: €${enhancedStats.capitalRecovered}`)
  console.log(`⚠️  Effective Investment (Soldi a Rischio): €${enhancedStats.effectiveInvestment}`)
  console.log(`💹 Realized Profit: €${enhancedStats.realizedProfit}`)
  console.log(`✅ Fully Recovered: ${enhancedStats.isFullyRecovered}`)

  // 🔍 SUMMARY PER DEBUG
  const summary = {
    scenario: "Portfolio qwe dovrebbe avere:",
    expected: {
      totalInvested: "820€ (150€ SOL + 670€ ETH)",
      capitalRecovered: "950€ (vendita 8 SOL)",
      effectiveInvestment: "0€ (perché 950 > 820)",
      realizedProfit: "130€ (950 - 820)"
    },
    actual: enhancedStats,
    discrepancy: {
      totalInvested: enhancedStats.totalInvested - 820,
      capitalRecovered: enhancedStats.capitalRecovered - 950,
      effectiveInvestment: enhancedStats.effectiveInvestment - 0
    }
  }

  return { analysis, summary, enhancedStats }
}

// GET - Recupera crypto portfolio specifico con PREZZI CORRENTI e DEBUG
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug') === 'true'

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portfolio non valido' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.cryptoPortfolio.findUnique({
      where: { id, userId: 1 },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            balance: true
          }
        },
        holdings: {
          include: {
            asset: true
          },
          orderBy: { id: 'desc' }
        },
        transactions: {
          include: {
            asset: true
          },
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio non trovato' },
        { status: 404 }
      )
    }

    // 🔍 DEBUG MODE: Se richiesto, esegui debug dettagliato
    if (debug) {
      const debugData = debugTransactions(portfolio)
      return NextResponse.json({
        success: true,
        debugMode: true,
        ...debugData,
        timestamp: new Date().toISOString()
      })
    }

    // 🆕 Ottieni prezzi correnti per tutti gli asset nel portfolio
    const symbols = portfolio.holdings.map(h => h.asset.symbol)
    const currentPrices = await fetchCurrentPrices(symbols)
    
    // 🎯 FASE 1: Applica Enhanced Statistics 
    const enhancedStats = calculateEnhancedStats(portfolio.transactions)

    // 🚨 FIX PRINCIPALE: Calcola valore attuale con PREZZI CORRENTI
    const totalValueEur = portfolio.holdings.reduce((sum: number, h: any) => {
      const currentPrice = currentPrices[h.asset.symbol] || h.currentPrice || h.avgPrice
      const holdingValue = h.quantity * currentPrice
      
      console.log(`💰 ${h.asset.symbol}: ${h.quantity} × €${currentPrice} = €${holdingValue}`)
      return sum + holdingValue
    }, 0)
    
    console.log(`📊 Portfolio ${portfolio.name} Detail - Total Value: €${totalValueEur}`)
    
    // 🔧 FIX: Calcola unrealized gains usando Enhanced logic
    const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment

    // 🔧 FIX: ROI totale usando Enhanced logic  
    const totalROI = enhancedStats.totalInvested > 0 ? 
      ((enhancedStats.realizedProfit + unrealizedGains) / enhancedStats.totalInvested) * 100 : 0

    // 🆕 Aggiorna i holdings con i prezzi correnti ottenuti
    const holdingsWithCurrentPrices = portfolio.holdings.map(holding => ({
      ...holding,
      currentPrice: currentPrices[holding.asset.symbol] || holding.currentPrice || holding.avgPrice,
      valueEur: holding.quantity * (currentPrices[holding.asset.symbol] || holding.currentPrice || holding.avgPrice),
      lastUpdated: new Date().toISOString()
    }))

    const portfolioWithStats = {
      ...portfolio,
      holdings: holdingsWithCurrentPrices,
      stats: {
        ...enhancedStats,
        // 🆕 VALORE ATTUALE CORRETTO con prezzi live
        totalValueEur,
        unrealizedGains,
        totalROI,
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