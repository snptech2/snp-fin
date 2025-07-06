// src/app/api/dca-portfolios/route.ts - FIX ENHANCED LOGIC COMPLETO
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC - CORRETTA ✅
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter((tx: any) => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter((tx: any) => tx.type === 'sell')

  // 🔧 FIX ENHANCED CASH FLOW: Logica finanziaria corretta
  const totalInvested = buyTransactions.reduce((sum: number, tx: any) => sum + tx.eurPaid, 0)
  const totalSold = sellTransactions.reduce((sum: number, tx: any) => sum + tx.eurPaid, 0)
  
  // ✅ CORREZIONE: capitalRecovered non può mai superare totalInvested
  const capitalRecovered = Math.min(totalSold, totalInvested)
  
  // ✅ CORREZIONE: realizedProfit è solo la parte di vendite che supera l'investimento
  const realizedProfit = Math.max(0, totalSold - totalInvested)
  
  // ✅ CORREZIONE: effectiveInvestment basato sul capitalRecovered corretto
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)

  // BTC calculations
  const totalBuyBTC = buyTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellBTC = sellTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBTC = totalBuyBTC - totalSellBTC

  // Advanced metrics
  const isFullyRecovered = capitalRecovered >= totalInvested
  const freeBTCAmount = isFullyRecovered ? totalBTC : 0

  // Counters
  const transactionCount = transactions.length
  const buyCount = buyTransactions.length
  const sellCount = sellTransactions.length

  return {
    totalInvested,
    capitalRecovered,
    effectiveInvestment,
    realizedProfit,
    totalBuyBTC,
    totalSellBTC,
    totalBTC,
    isFullyRecovered,
    freeBTCAmount,
    transactionCount,
    buyCount,
    sellCount
  }
}

// GET - Recupera tutti i portafogli DCA
export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const portfolios = await prisma.dCAPortfolio.findMany({
      where: { userId }, // 🔄 Sostituito: userId: 1 → userId
      include: {
        account: {
          select: { id: true, name: true, balance: true }
        },
        transactions: {
          orderBy: { date: 'desc' }
        },
        networkFees: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // 🎯 FASE 1: Applica Enhanced Statistics a tutti i portfolio
    const portfoliosWithEnhancedStats = portfolios.map(portfolio => {
      const enhancedStats = calculateEnhancedStats(portfolio.transactions)

      // Fee calculations
      const totalFeesSats = portfolio.networkFees.reduce((sum: number, fee: any) => sum + fee.sats, 0)
      const totalFeesBTC = totalFeesSats / 100000000

      // Net BTC (dopo fees)
      const netBTC = Math.max(0, enhancedStats.totalBTC - totalFeesBTC)

      // 🔧 FIX: Prezzo medio di acquisto corretto usando Enhanced logic
      const avgPurchasePrice = enhancedStats.totalInvested > 0 && netBTC > 0 ?
        enhancedStats.totalInvested / netBTC : 0

      // Final stats - Enhanced è source of truth
      const finalStats = {
        ...enhancedStats,
        totalFeesSats,
        totalFeesBTC,
        netBTC,
        avgPurchasePrice,    // 🔧 FIX: Ora calcolato correttamente
        feesCount: portfolio.networkFees.length
      }

      return {
        ...portfolio,
        stats: finalStats
      }
    })

    return NextResponse.json(portfoliosWithEnhancedStats)
  } catch (error) {
    console.error('Errore recupero DCA portfolios:', error)
    return NextResponse.json({ error: 'Errore recupero DCA portfolios' }, { status: 500 })
  }
}

// POST - Crea nuovo portafoglio DCA
export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { name, accountId } = body

    // Validazioni
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome portafoglio richiesto' }, { status: 400 })
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
    const existingPortfolio = await prisma.dCAPortfolio.findFirst({
      where: {
        userId, // 🔄 Sostituito: userId: 1 → userId
        name: name.trim()
      }
    })

    if (existingPortfolio) {
      return NextResponse.json({ error: 'Esiste già un portfolio con questo nome' }, { status: 400 })
    }

    const portfolio = await prisma.dCAPortfolio.create({
      data: {
        name: name.trim(),
        type: 'dca_bitcoin',      // 🔧 FIX: Campo obbligatorio dal schema
        userId, // 🔄 Sostituito: userId: 1 → userId
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
    console.error('Errore creazione DCA portfolio:', error)
    return NextResponse.json({ error: 'Errore creazione DCA portfolio' }, { status: 500 })
  }
}