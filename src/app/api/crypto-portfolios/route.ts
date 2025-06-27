// src/app/api/crypto-portfolios/route.ts - FIX COMPLETO CON PREZZI CORRENTI
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

// GET - Lista crypto portfolios con Enhanced Statistics e PREZZI CORRENTI
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

    // 🆕 Raccoglie tutti i simboli unici dai holdings
    const allSymbols = Array.from(new Set(
      portfolios.flatMap(p => p.holdings.map(h => h.asset.symbol))
    ))
    
    // 🆕 Ottieni prezzi correnti per tutti gli asset
    const currentPrices = await fetchCurrentPrices(allSymbols)
    
    // 🎯 FIX CRITICO: Calcola Enhanced statistics con PREZZI CORRENTI
    const portfoliosWithStats = portfolios.map(portfolio => {
      // Applica Enhanced Cash Flow Logic
      const enhancedStats = calculateEnhancedStats(portfolio.transactions)

      // 🚨 FIX PRINCIPALE: Calcola valore attuale con PREZZI CORRENTI
      const totalValueEur = portfolio.holdings.reduce((sum, h) => {
        const currentPrice = currentPrices[h.asset.symbol] || h.currentPrice || h.avgPrice
        const holdingValue = h.quantity * currentPrice
        
        console.log(`💰 ${h.asset.symbol}: ${h.quantity} × €${currentPrice} = €${holdingValue}`)
        return sum + holdingValue
      }, 0)
      
      console.log(`📊 Portfolio ${portfolio.name} - Total Value: €${totalValueEur}`)
      
      // 🔧 FIX: Calcola unrealized gains usando Enhanced logic
      const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment

      // 🔧 FIX: ROI totale usando Enhanced logic  
      const totalROI = enhancedStats.totalInvested > 0 ? 
        ((enhancedStats.realizedProfit + unrealizedGains) / enhancedStats.totalInvested) * 100 : 0

      return {
        ...portfolio,
        type: 'crypto_wallet', // Identificativo per il frontend
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
    })

    console.log('✅ Crypto portfolios LIST with corrected current values:', portfoliosWithStats.length)

    return NextResponse.json(portfoliosWithStats)

  } catch (error) {
    console.error('💥 Errore API crypto-portfolios LIST:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}