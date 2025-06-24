// src/app/api/crypto-portfolios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Dettagli portfolio singolo con holdings e statistiche
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId,
        userId: 1 
      },
      include: {
        account: {
          select: { id: true, name: true, balance: true, type: true }
        },
        holdings: {
          include: { 
            asset: true 
          },
          orderBy: { totalInvested: 'desc' }
        },
        transactions: {
          include: { asset: true },
          orderBy: { date: 'desc' },
          take: 10 // Ultime 10 transazioni per performance
        },
        _count: {
          select: { transactions: true, holdings: true }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Calcola statistiche dettagliate
    const totalValueEur = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0)
    const totalInvested = portfolio.holdings.reduce((sum, h) => sum + h.totalInvested, 0)
    const realizedGains = portfolio.holdings.reduce((sum, h) => sum + h.realizedGains, 0)
    const unrealizedGains = totalValueEur - totalInvested // Senza prezzi live, usiamo avgPrice
    const totalROI = totalInvested > 0 ? ((totalValueEur - totalInvested) / totalInvested) * 100 : 0

    // Aggiungi statistiche al portfolio
    const portfolioWithStats = {
      ...portfolio,
      stats: {
        totalValueEur,
        totalInvested,
        realizedGains,
        unrealizedGains,
        totalROI,
        holdingsCount: portfolio._count.holdings,
        transactionCount: portfolio._count.transactions
      }
    }

    return NextResponse.json(portfolioWithStats)
  } catch (error) {
    console.error('Errore recupero portfolio:', error)
    return NextResponse.json({ error: 'Errore recupero portfolio' }, { status: 500 })
  }
}

// PUT - Aggiorna portfolio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const body = await request.json()

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    const { name, description, isActive } = body

    // Validazioni
    if (name && !name.trim()) {
      return NextResponse.json({ error: 'Nome portfolio non può essere vuoto' }, { status: 400 })
    }

    // Verifica che il portfolio esista e appartenga all'utente
    const existingPortfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId,
        userId: 1 
      }
    })

    if (!existingPortfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Aggiorna solo i campi forniti
    const updateData: any = { updatedAt: new Date() }
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedPortfolio = await prisma.cryptoPortfolio.update({
      where: { id: portfolioId },
      data: updateData,
      include: {
        account: {
          select: { id: true, name: true, balance: true, type: true }
        }
      }
    })

    return NextResponse.json(updatedPortfolio)
  } catch (error) {
    console.error('Errore aggiornamento portfolio:', error)
    return NextResponse.json({ error: 'Errore aggiornamento portfolio' }, { status: 500 })
  }
}

// DELETE - Elimina portfolio (solo se vuoto)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    // Verifica che il portfolio esista e appartenga all'utente
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId,
        userId: 1 
      },
      include: {
        _count: {
          select: { transactions: true, holdings: true }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Verifica che il portfolio sia vuoto
    if (portfolio._count.transactions > 0 || portfolio._count.holdings > 0) {
      return NextResponse.json({ 
        error: 'Impossibile eliminare portfolio con transazioni o holdings esistenti' 
      }, { status: 400 })
    }

    await prisma.cryptoPortfolio.delete({
      where: { id: portfolioId }
    })

    return NextResponse.json({ message: 'Portfolio eliminato con successo' })
  } catch (error) {
    console.error('Errore eliminazione portfolio:', error)
    return NextResponse.json({ error: 'Errore eliminazione portfolio' }, { status: 500 })
  }
}