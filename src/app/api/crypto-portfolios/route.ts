// src/app/api/crypto-portfolios/route.ts - FASE 1 FIX
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC per Crypto Portfolios (UNIFICATA)
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter(tx => tx.type === 'buy')
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
  const capitalRecovered = sellTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  const realizedProfit = Math.max(0, capitalRecovered - totalInvested)

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

// GET - Lista crypto portfolios con Enhanced Statistics
export async function GET(request: NextRequest) {
  try {
    const portfolios = await prisma.cryptoPortfolio.findMany({
      where: { userId: 1 },
      include: {
        account: {
          select: { id: true, name: true, balance: true }
        },
        holdings: {
          include: { asset: true }
        },
        transactions: true, // ✅ CRITICO: serve per calcolare Enhanced stats
        _count: {
          select: { transactions: true, holdings: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 🎯 FIX FASE 1: Calcola Enhanced statistics per ogni portfolio
    const portfoliosWithStats = portfolios.map(portfolio => {
      // Applica Enhanced Cash Flow Logic
      const enhancedStats = calculateEnhancedStats(portfolio.transactions)

      // Calcola valore attuale dei holdings (prezzo corrente - per ora usa avgPrice)
      const totalValueEur = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0)
      
      // 🔧 FIX: Calcola unrealized gains usando Enhanced logic
      const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment

      // 🔧 FIX: ROI totale usando Enhanced logic  
      const totalROI = enhancedStats.totalInvested > 0 ? 
        ((enhancedStats.realizedProfit + unrealizedGains) / enhancedStats.totalInvested) * 100 : 0

      return {
        ...portfolio,
        stats: {
          // Enhanced Cash Flow fields (source of truth)
          ...enhancedStats,
          
          // Derived calculations
          totalValueEur,
          unrealizedGains,
          totalROI,
          
          // Counts
          holdingsCount: portfolio._count.holdings
        }
      }
    })

    return NextResponse.json(portfoliosWithStats)
  } catch (error) {
    console.error('Errore recupero crypto portfolios:', error)
    return NextResponse.json({ error: 'Errore recupero crypto portfolios' }, { status: 500 })
  }
}

// POST - Crea nuovo crypto portfolio
export async function POST(request: NextRequest) {
  try {
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
        userId: 1,
        type: 'investment'
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account di investimento non trovato' }, { status: 404 })
    }

    // Verifica che non esista già un portfolio con lo stesso nome
    const existingPortfolio = await prisma.cryptoPortfolio.findFirst({
      where: {
        userId: 1,
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
    console.error('Errore creazione crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore creazione crypto portfolio' }, { status: 500 })
  }
}