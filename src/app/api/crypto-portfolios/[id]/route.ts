// src/app/api/crypto-portfolios/[id]/route.ts - FIXED VERSION CON LOGICA DCA
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Dettagli portfolio singolo con statistiche corrette (COPIATO LOGICA DCA)
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
          orderBy: { date: 'desc' }
        },
        _count: {
          select: { transactions: true, holdings: true }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // ✅ FIX: Calcola statistiche corrette (COPIA LOGICA DCA)
    const buyTransactions = portfolio.transactions.filter(tx => tx.type === 'buy')
    const sellTransactions = portfolio.transactions.filter(tx => tx.type === 'sell')

    // ✅ COPIA LOGICA DCA: Investimento totale = TUTTE le transazioni buy storiche
    const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
    
    // ✅ COPIA LOGICA DCA: Profitti realizzati = somma dai holdings
    const realizedGains = portfolio.holdings.reduce((sum, h) => sum + h.realizedGains, 0)
    
    // ✅ COPIA LOGICA DCA: Valore attuale = holdings attuali
    const totalValueEur = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0)
    
    // ✅ COPIA LOGICA DCA: Plus/Minus non realizzati
    const investmentInCurrentHoldings = portfolio.holdings.reduce((sum, h) => sum + h.totalInvested, 0)
    const unrealizedGains = totalValueEur - investmentInCurrentHoldings
    
    // ✅ COPIA LOGICA DCA: ROI totale = (profitti + non realizzati) / investimento totale
    const totalGains = realizedGains + unrealizedGains
    const totalROI = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0

    // Aggiungi statistiche al portfolio
    const portfolioWithStats = {
      ...portfolio,
      stats: {
        totalValueEur,
        totalInvested, // ✅ FIX: Ora usa investimento storico totale
        realizedGains,
        unrealizedGains,
        totalROI, // ✅ FIX: Ora calcolato correttamente
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