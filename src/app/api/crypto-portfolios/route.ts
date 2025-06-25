// src/app/api/crypto-portfolios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista crypto portfolios con statistiche di base
export async function GET(request: NextRequest) {
  try {
    // Prima verifica se le tabelle esistono
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
          _count: {
            select: { transactions: true, holdings: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Calcola statistiche semplici per ogni portfolio
      const portfoliosWithStats = portfolios.map(portfolio => {
        const totalValueEur = portfolio.holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0)
        const totalInvested = portfolio.holdings.reduce((sum, h) => sum + h.totalInvested, 0)
        const realizedGains = portfolio.holdings.reduce((sum, h) => sum + h.realizedGains, 0)

        return {
          ...portfolio,
          stats: {
            totalValueEur,
            totalInvested,
            realizedGains,
            unrealizedGains: 0, // Calcoleremo dopo con prezzi live
            totalROI: totalInvested > 0 ? ((totalValueEur - totalInvested) / totalInvested) * 100 : 0,
            holdingsCount: portfolio._count.holdings,
            transactionCount: portfolio._count.transactions
          }
        }
      })

      return NextResponse.json(portfoliosWithStats)
    } catch (dbError) {
      // Se le tabelle non esistono ancora, ritorna array vuoto
      console.log('Tabelle crypto portfolio non esistono ancora, ritornando array vuoto')
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Errore nel recupero crypto portfolios:', error)
    return NextResponse.json({ error: 'Errore nel recupero crypto portfolios' }, { status: 500 })
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
      return NextResponse.json({ error: 'Conto di investimento richiesto' }, { status: 400 })
    }

    // Verifica che l'account esista e sia di tipo investment
    const account = await prisma.account.findFirst({
      where: {
        id: parseInt(accountId),
        userId: 1,
        type: 'investment'
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Conto di investimento non trovato o non valido' }, { status: 404 })
    }

    try {
      // Prova a creare il portfolio
      const portfolio = await prisma.cryptoPortfolio.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          userId: 1,
          accountId: parseInt(accountId)
        },
        include: {
          account: {
            select: { id: true, name: true, balance: true }
          }
        }
      })

      return NextResponse.json(portfolio, { status: 201 })
    } catch (createError: any) {
      console.error('Errore nella creazione del portfolio:', createError)
      
      // Se la tabella non esiste
      if (createError?.code === 'P2021') {
        return NextResponse.json({ 
          error: 'Database non ancora configurato. Esegui la migration del database prima di creare portfolio.' 
        }, { status: 500 })
      }
      
      throw createError
    }
  } catch (error) {
    console.error('Errore nella creazione crypto portfolio:', error)
    return NextResponse.json({ error: 'Errore nella creazione del portfolio' }, { status: 500 })
  }
}