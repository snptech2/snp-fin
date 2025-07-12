// src/app/api/crypto-portfolios/route.ts - FIX COMPLETO CON PREZZI CORRENTI
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC per Crypto Portfolios (UNIFICATA)
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter(tx => tx.type === 'buy')
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')
  const swapOutTransactions = transactions.filter(tx => tx.type === 'swap_out')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
  // FIX: Capitale recuperato è limitato all'investimento totale
  const totalSold = sellTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
  const capitalRecovered = Math.min(totalSold, totalInvested)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  // FIX: Profitto realizzato = vendite totali - investimento totale (se positivo)
  const realizedProfit = Math.max(0, totalSold - totalInvested)

  // Status
  const isFullyRecovered = capitalRecovered >= totalInvested

  return {
    // 🆕 ENHANCED CASH FLOW FIELDS (source of truth)
    totalInvested,           // Invariante - somma storica di tutti i buy
    capitalRecovered,        // Somma di tutti i sell 
    effectiveInvestment,     // Denaro ancora "a rischio"
    realizedProfit,          // Solo se capitalRecovered > totalInvested
    isFullyRecovered,        // Flag se ho recuperato tutto l'investimento
    
    // 📊 COUNTERS
    transactionCount: transactions.length,
    buyCount: buyTransactions.length,
    sellCount: sellTransactions.length
  }
}

// Note: fetchCurrentPrices removed to avoid HTTP internal calls that fail in production
// Using avgPrice from holdings as fallback for consistent calculations

// GET - Lista crypto portfolios con Enhanced Statistics e PREZZI CORRENTI
export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    // 🚀 OTTIMIZZAZIONE: Query separate invece di include massivo
    const portfolios = await prisma.cryptoPortfolio.findMany({
      where: { userId, isActive: true }, // Filtra solo portfolio attivi
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        account: {
          select: { id: true, name: true, balance: true }
        },
        holdings: {
          select: {
            id: true,
            quantity: true,
            avgPrice: true,
            totalInvested: true,
            realizedGains: true,
            asset: {
              select: { id: true, symbol: true, name: true, decimals: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 🚀 OTTIMIZZAZIONE: Fetch transazioni solo per portfolio con holdings
    const portfolioIds = portfolios.filter(p => p.holdings.length > 0).map(p => p.id)
    const transactionsByPortfolio = portfolioIds.length > 0 ? await prisma.cryptoPortfolioTransaction.findMany({
      where: { portfolioId: { in: portfolioIds } },
      select: {
        id: true,
        portfolioId: true,
        type: true,
        quantity: true,
        eurValue: true,
        pricePerUnit: true,
        date: true,
        assetId: true
      },
      orderBy: { date: 'desc' }
    }) : []

    // Raggruppa transazioni per portfolio
    const transactionGroups = transactionsByPortfolio.reduce((acc, tx) => {
      if (!acc[tx.portfolioId]) acc[tx.portfolioId] = []
      acc[tx.portfolioId].push(tx)
      return acc
    }, {} as Record<number, typeof transactionsByPortfolio>)

    // Fetch current prices using localhost to avoid NEXTAUTH_URL issues in production
    const allSymbols = new Set<string>()
    portfolios.forEach(portfolio => {
      portfolio.holdings.forEach(holding => {
        allSymbols.add(holding.asset.symbol.toUpperCase())
      })
    })

    let currentPrices: Record<string, number> = {}
    
    if (allSymbols.size > 0) {
      try {
        const symbolsParam = Array.from(allSymbols).join(',')
        const response = await fetch(`http://localhost:3000/api/crypto-prices?symbols=${symbolsParam}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'SNP-Finance-App/1.0',
            'Cookie': request.headers.get('cookie') || '',
          },
          cache: 'no-store'
        })
        
        if (response.ok) {
          const data = await response.json()
          currentPrices = data.prices || {}
          console.log('✅ Current prices fetched via localhost:', Object.keys(currentPrices).length, 'symbols')
        } else {
          console.warn('⚠️ Failed to fetch prices via localhost, using avgPrice fallback')
        }
      } catch (error) {
        console.warn('⚠️ Error fetching prices via localhost, using avgPrice fallback:', error)
      }
    }

    // 🎯 FASE 1: Applica Enhanced Statistics + Current Prices
    const portfoliosWithEnhancedStats = portfolios.map(portfolio => {
      const portfolioTransactions = transactionGroups[portfolio.id] || []
      const enhancedStats = calculateEnhancedStats(portfolioTransactions)

      // Calculate current value using fetched prices or avgPrice as fallback
      let totalValueEur = 0
      const holdingsWithCurrentPrices = portfolio.holdings.map(holding => {
        const currentPrice = currentPrices[holding.asset.symbol.toUpperCase()] || holding.avgPrice
        const valueEur = holding.quantity * currentPrice
        totalValueEur += valueEur

        return {
          ...holding,
          currentPrice,
          valueEur,
          lastUpdated: new Date().toISOString()
        }
      })

      // 🆕 Calcola unrealized gains e ROI usando Enhanced logic
      const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment
      const totalROI = enhancedStats.totalInvested > 0 ?
        ((enhancedStats.realizedProfit + unrealizedGains) / enhancedStats.totalInvested) * 100 : 0

      const finalStats = {
        ...enhancedStats,
        totalValueEur,      // 🆕 Valore attuale usando prezzi correnti
        unrealizedGains,    // 🆕 Guadagni/perdite non realizzati
        totalROI,           // 🆕 ROI usando Enhanced logic
        holdingsCount: portfolio.holdings.length
      }

      return {
        ...portfolio,
        accountId: portfolio.account.id, // Aggiungi accountId per compatibilità
        type: 'crypto_wallet', // Aggiungi tipo per distinguere da DCA
        holdings: holdingsWithCurrentPrices,
        stats: finalStats
      }
    })

    console.log(`✅ Crypto portfolios list with Enhanced stats and ${Object.keys(currentPrices).length > 0 ? 'current' : 'avgPrice'} prices`)

    return NextResponse.json(portfoliosWithEnhancedStats)
  } catch (error) {
    console.error('💥 Errore recupero crypto portfolios:', error)
    return NextResponse.json({ error: 'Errore recupero crypto portfolios' }, { status: 500 })
  }
}

// POST - Crea nuovo crypto portfolio
export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { name, description, accountId } = body

    // Validazioni
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome portfolio richiesto' }, { status: 400 })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account collegato richiesto' }, { status: 400 })
    }

    // Verifica che l'account esista e sia di investimento
    const account = await prisma.account.findFirst({
      where: { 
        id: parseInt(accountId), 
        userId, // 🔄 Sostituito: userId: 1 → userId
        type: 'investment'
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account di investimento non trovato' }, { status: 404 })
    }

    // Verifica che non esista già un portfolio con lo stesso nome
    const existingPortfolio = await prisma.cryptoPortfolio.findFirst({
      where: {
        userId, // 🔄 Sostituito: userId: 1 → userId
        name: name.trim()
      }
    })

    if (existingPortfolio) {
      return NextResponse.json({ error: 'Esiste già un portfolio con questo nome' }, { status: 400 })
    }

    const portfolio = await prisma.cryptoPortfolio.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId, // 🔄 Sostituito: userId: 1 → userId
        accountId: parseInt(accountId)
      },
      include: {
        account: {
          select: { id: true, name: true, balance: true }
        }
      }
    })

    return NextResponse.json(portfolio, { status: 201 })
  } catch (error) {
    console.error('Errore creazione crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore creazione crypto portfolio' }, { status: 500 })
  }
}