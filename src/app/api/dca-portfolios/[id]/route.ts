// src/app/api/dca-portfolios/[id]/route.ts - FIX PREZZO MEDIO
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC - VERSIONE CORRETTA FASE 1
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter((tx: any) => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter((tx: any) => tx.type === 'sell')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum: number, tx: any) => sum + tx.eurPaid, 0)
  const capitalRecovered = sellTransactions.reduce((sum: number, tx: any) => sum + tx.eurPaid, 0)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  const realizedProfit = Math.max(0, capitalRecovered - totalInvested)

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

// GET - Recupera portafoglio DCA specifico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    const portfolio = await prisma.dCAPortfolio.findFirst({
      where: { id, userId }, // 🔄 Sostituito: userId: 1 → userId
      include: {
        account: {
          select: { id: true, name: true, balance: true }
        },
        transactions: {
          orderBy: { date: 'desc' }
        },
        networkFees: true
      }
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portafoglio non trovato' },
        { status: 404 }
      )
    }

    // 🎯 FASE 1: Applica Enhanced Statistics
    const enhancedStats = calculateEnhancedStats(portfolio.transactions)

    // Fee calculations
    const totalFeesSats = portfolio.networkFees.reduce((sum: number, fee: any) => sum + fee.sats, 0)
    const totalFeesBTC = totalFeesSats / 100000000

    // Net BTC (dopo fees)
    const netBTC = Math.max(0, enhancedStats.totalBTC - totalFeesBTC)

    // 🔧 FIX: Prezzo medio di acquisto corretto usando Enhanced logic
    const avgPurchasePrice = enhancedStats.totalInvested > 0 && netBTC > 0 ?
      enhancedStats.totalInvested / netBTC : 0

    // Aggiungi prezzo di acquisto per ogni transazione
    const transactionsWithPrice = portfolio.transactions.map((tx: any) => ({
      ...tx,
      purchasePrice: tx.eurPaid / Math.abs(tx.btcQuantity)
    }))

    // Final stats - Enhanced è source of truth
    const finalStats = {
      ...enhancedStats,
      totalFeesSats,
      totalFeesBTC,
      netBTC,
      avgPurchasePrice,       // 🔧 FIX: Ora calcolato correttamente
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
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

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
    const existingPortfolio = await prisma.dCAPortfolio.findFirst({
      where: { id, userId } // 🔄 Sostituito: userId: 1 → userId
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
        userId, // 🔄 Sostituito: userId: 1 → userId
        name: name.trim(),
        id: { not: id }
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
        isActive: isActive !== undefined ? isActive : existingPortfolio.isActive
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

// DELETE - Elimina portafoglio e transazioni correlate
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portafoglio non valido' },
        { status: 400 }
      )
    }

    // Verifica che il portafoglio esista ed appartenga all'utente
    const existingPortfolio = await prisma.dCAPortfolio.findFirst({
      where: { id, userId } // 🔄 Sostituito: userId: 1 → userId
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portfolio non trovato' },
        { status: 404 }
      )
    }

    // Elimina transazioni correlate e portafoglio in una transazione
    await prisma.$transaction([
      prisma.dCATransaction.deleteMany({ where: { portfolioId: id } }),
      prisma.networkFee.deleteMany({ where: { portfolioId: id } }),
      prisma.dCAPortfolio.delete({ where: { id } })
    ])

    return NextResponse.json({ message: 'Portafoglio eliminato con successo' })
  } catch (error) {
    console.error('Errore nell\'eliminazione portafoglio:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione portafoglio' },
      { status: 500 }
    )
  }
}