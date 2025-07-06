// src/app/api/crypto-portfolios/[id]/recalculate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// POST - Ricalcola tutti gli holdings per il portfolio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)

    // Verifica portfolio CON AUTENTICAZIONE
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId, 
        userId
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Ottieni tutte le transazioni del portfolio
    const transactions = await prisma.cryptoPortfolioTransaction.findMany({
      where: { portfolioId },
      include: { asset: true },
      orderBy: { date: 'asc' }
    })

    // Raggruppa transazioni per asset
    const transactionsByAsset = transactions.reduce((acc, tx) => {
      if (!acc[tx.assetId]) {
        acc[tx.assetId] = []
      }
      acc[tx.assetId].push(tx)
      return acc
    }, {} as Record<number, any[]>)

    // Elimina tutti gli holdings esistenti
    await prisma.cryptoPortfolioHolding.deleteMany({
      where: { portfolioId }
    })

    // Ricalcola holdings per ogni asset
    for (const [assetId, assetTransactions] of Object.entries(transactionsByAsset)) {
      await updateHoldings(portfolioId, parseInt(assetId), assetTransactions)
    }

    return NextResponse.json({ 
      message: 'Holdings ricalcolati con successo',
      assetsProcessed: Object.keys(transactionsByAsset).length
    })

  } catch (error) {
    console.error('Errore ricalcolo holdings:', error)
    return NextResponse.json({ error: 'Errore ricalcolo holdings' }, { status: 500 })
  }
}

// Funzione helper per aggiornare holdings (corretta)
async function updateHoldings(portfolioId: number, assetId: number, transactions?: any[]) {
  try {
    // Se non sono passate transazioni, ottienile dal database
    if (!transactions) {
      transactions = await prisma.cryptoPortfolioTransaction.findMany({
        where: { portfolioId, assetId },
        orderBy: { date: 'asc' }
      })
    }

    let totalQuantity = 0
    let totalInvested = 0
    let realizedGains = 0

    for (const tx of transactions) {
      if (tx.type === 'buy' || tx.type === 'swap_in') {
        totalQuantity += tx.quantity
        totalInvested += tx.eurValue
      } else if (tx.type === 'sell' || tx.type === 'swap_out') {
        const sellQuantity = tx.quantity
        const avgPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0
        const costBasis = sellQuantity * avgPrice
        
        totalQuantity -= sellQuantity
        totalInvested -= costBasis
        realizedGains += (tx.eurValue - costBasis)
      } else if (tx.type === 'stake_reward') {
        // Staking rewards aumentano la quantità senza costo
        totalQuantity += tx.quantity
        // Non aumentano totalInvested (reward gratuito)
        // I reward sono contabilizzati come realizedGains
        realizedGains += tx.eurValue
      }
    }

    const avgPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0

    // Upsert holding
    if (totalQuantity > 0.0000001) {
      await prisma.cryptoPortfolioHolding.upsert({
        where: {
          portfolioId_assetId: {
            portfolioId,
            assetId
          }
        },
        update: {
          quantity: totalQuantity,
          avgPrice,
          totalInvested,
          realizedGains
        },
        create: {
          portfolioId,
          assetId,
          quantity: totalQuantity,
          avgPrice,
          totalInvested,
          realizedGains
        }
      })
    } else {
      // Rimuovi holding se quantità è 0
      await prisma.cryptoPortfolioHolding.deleteMany({
        where: { portfolioId, assetId }
      })
    }
  } catch (error) {
    console.error('Error updating holdings:', error)
  }
}