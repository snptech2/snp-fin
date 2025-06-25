// src/app/api/dca-portfolios/[id]/route.ts - FASE 1 FIX
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 🎯 ENHANCED CASH FLOW LOGIC - VERSIONE CORRETTA FASE 1
function calculateEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter(tx => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  // 🔧 FIX FASE 1: Applica esattamente la logica Enhanced definita nei documenti
  const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
  const capitalRecovered = sellTransactions.reduce((sum, tx) => sum + tx.eurPaid, 0)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  const realizedProfit = Math.max(0, capitalRecovered - totalInvested)

  // BTC calculations
  const totalBuyBTC = buyTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellBTC = sellTransactions.reduce((sum, tx) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBTC = totalBuyBTC - totalSellBTC

  // Advanced metrics
  const isFullyRecovered = capitalRecovered >= totalInvested
  const freeBTCAmount = isFullyRecovered ? totalBTC : 0
  
  // Average purchase price
  const avgPurchasePrice = totalBuyBTC > 0 ? totalInvested / totalBuyBTC : 0

  return {
    // 🆕 ENHANCED CASH FLOW FIELDS (source of truth)
    totalInvested,           // Invariante - somma storica di tutti i buy
    capitalRecovered,        // Somma di tutti i sell
    effectiveInvestment,     // Denaro ancora "a rischio"
    realizedProfit,          // Solo se capitalRecovered > totalInvested
    isFullyRecovered,        // Flag se ho recuperato tutto l'investimento
    
    // 📊 BTC METRICS
    totalBTC,
    totalBuyBTC,
    totalSellBTC,
    avgPurchasePrice,
    freeBTCAmount,          // BTC "gratis" se fully recovered
    
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

    // 🎯 FASE 1: Applica Enhanced Statistics 
    const enhancedStats = calculateEnhancedStats(portfolio.transactions)

    // Fee di rete
    const totalFeesSats = portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0)
    const totalFeesBTC = totalFeesSats / 100000000
    const netBTC = enhancedStats.totalBTC - totalFeesBTC

    // Aggiungi prezzo di acquisto per ogni transazione
    const transactionsWithPrice = portfolio.transactions.map(tx => ({
      ...tx,
      purchasePrice: tx.eurPaid / Math.abs(tx.btcQuantity)
    }))

    // Final stats - Enhanced è source of truth
    const finalStats = {
      ...enhancedStats,
      totalFeesSats,
      totalFeesBTC,
      netBTC,
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