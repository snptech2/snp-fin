// src/app/api/crypto-portfolios/[id]/route.ts - CON DEBUG INTEGRATO
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

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
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // 🎯 Applica Enhanced Statistics
    const enhancedStats = calculateEnhancedStats(portfolio.transactions)

    // 🆕 Fetch prezzi correnti per holdings
    const symbols = portfolio.holdings.map(h => h.asset.symbol.toUpperCase())
    const currentPrices = await fetchCurrentPrices(symbols)

    // 🆕 Calcola valore attuale e unrealized gains
    let totalValueEur = 0
    portfolio.holdings.forEach(holding => {
      const currentPrice = currentPrices[holding.asset.symbol] || holding.currentPrice || holding.avgPrice
      totalValueEur += holding.quantity * currentPrice
    })

    const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment
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