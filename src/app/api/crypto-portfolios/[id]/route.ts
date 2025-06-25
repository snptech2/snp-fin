// src/app/api/crypto-portfolios/[id]/route.ts
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
    realizedProfit
  }
}

// GET - Recupera crypto portfolio specifico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

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

    // 🎯 FASE 1: Applica Enhanced Statistics 
    const enhancedStats = calculateEnhancedStats(portfolio.transactions)

    // Calcola valore attuale dei holdings (usa avgPrice come fallback)
    const totalValueEur = portfolio.holdings.reduce((sum: number, h: any) => sum + (h.quantity * h.avgPrice), 0)
    
    // 🔧 FIX: Calcola unrealized gains usando Enhanced logic
    const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment

    // 🔧 FIX: ROI totale usando Enhanced logic  
    const totalROI = enhancedStats.totalInvested > 0 ?
      ((enhancedStats.realizedProfit + unrealizedGains) / enhancedStats.totalInvested) * 100 : 0

    // Final stats - Enhanced è source of truth
    const finalStats = {
      ...enhancedStats,
      totalValueEur,
      unrealizedGains,
      totalROI,
      holdingsCount: portfolio.holdings.length
    }

    const portfolioWithStats = {
      ...portfolio,
      stats: finalStats
    }

    return NextResponse.json(portfolioWithStats)
  } catch (error) {
    console.error('Errore nel recupero crypto portfolio:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero crypto portfolio' },
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
    const id = parseInt(params.id)
    const body = await request.json()
    const { name, description, isActive } = body

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portfolio non valido' },
        { status: 400 }
      )
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome portfolio richiesto' },
        { status: 400 }
      )
    }

    // Verifica che il portfolio esista ed appartenga all'utente
    const existingPortfolio = await prisma.cryptoPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portfolio non trovato' },
        { status: 404 }
      )
    }

    // Controlla se esiste già un altro portfolio con lo stesso nome
    const duplicatePortfolio = await prisma.cryptoPortfolio.findFirst({
      where: {
        userId: 1,
        name: name.trim(),
        id: { not: id }
      }
    })

    if (duplicatePortfolio) {
      return NextResponse.json(
        { error: 'Esiste già un portfolio con questo nome' },
        { status: 400 }
      )
    }

    const updatedPortfolio = await prisma.cryptoPortfolio.update({
      where: { id },
      data: { 
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
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
    console.error('Errore aggiornamento crypto portfolio:', error)
    return NextResponse.json(
      { error: 'Errore aggiornamento crypto portfolio' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina crypto portfolio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID portfolio non valido' },
        { status: 400 }
      )
    }

    // Verifica che il portfolio esista ed appartenga all'utente
    const existingPortfolio = await prisma.cryptoPortfolio.findUnique({
      where: { id, userId: 1 }
    })

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portfolio non trovato' },
        { status: 404 }
      )
    }

    // Elimina portfolio e tutte le relazioni (cascade delete dovrebbe gestire)
    await prisma.cryptoPortfolio.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Portfolio eliminato con successo' })
  } catch (error) {
    console.error('Errore eliminazione crypto portfolio:', error)
    return NextResponse.json(
      { error: 'Errore eliminazione crypto portfolio' },
      { status: 500 }
    )
  }
}