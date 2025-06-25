// src/app/api/crypto-portfolios/route.ts - FIXED VERSION CON LOGICA DCA
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista crypto portfolios con statistiche corrette (COPIATO LOGICA DCA)
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
        transactions: true, // ✅ AGGIUNTO: serve per calcolare stats corrette
        _count: {
          select: { transactions: true, holdings: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // ✅ FIX: Calcola statistiche corrette per ogni portfolio (LOGICA DCA)
    const portfoliosWithStats = await Promise.all(portfolios.map(async portfolio => {
      // ✅ COPIA LOGICA DCA: Separa acquisti e vendite
      const buyTransactions = portfolio.transactions.filter(tx => tx.type === 'buy')
      const sellTransactions = portfolio.transactions.filter(tx => tx.type === 'sell')

      // ✅ COPIA LOGICA DCA: Investimento totale = TUTTE le transazioni buy storiche
      const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
      
      // ✅ COPIA LOGICA DCA: Profitti realizzati = somma dai holdings
      const realizedGains = portfolio.holdings.reduce((sum, h) => sum + h.realizedGains, 0)
      
      // ✅ COPIA LOGICA DCA: Valore attuale = holdings attuali
      const totalValueEur = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0)
      
      // ✅ COPIA LOGICA DCA: Plus/Minus non realizzati = differenza
      const unrealizedGains = totalValueEur - (totalInvested - buyTransactions.filter(tx => 
        // Sottrai l'investimento per gli asset venduti completamente
        !portfolio.holdings.find(h => h.assetId === tx.assetId)
      ).reduce((sum, tx) => sum + tx.eurValue, 0))
      
      // ✅ COPIA LOGICA DCA: ROI totale = (profitti + non realizzati) / investimento totale
      const totalGains = realizedGains + unrealizedGains
      const totalROI = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0

      return {
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
    }))

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