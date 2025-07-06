// src/app/api/crypto-portfolios/[id]/swap/[swapPairId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// DELETE - Elimina swap (entrambe le transazioni)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; swapPairId: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const swapPairId = parseInt(resolvedParams.swapPairId)

    // Verifica portfolio CON AUTENTICAZIONE
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId, 
        userId
      },
      include: { account: true }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Trova entrambe le transazioni dello swap
    const swapTransactions = await prisma.cryptoPortfolioTransaction.findMany({
      where: {
        portfolioId,
        OR: [
          { id: swapPairId },
          { swapPairId: swapPairId }
        ]
      },
      include: { asset: true }
    })

    if (swapTransactions.length === 0) {
      return NextResponse.json({ error: 'Swap non trovato' }, { status: 404 })
    }

    const assetsToRecalculate = new Set<number>()

    // Elimina tutte le transazioni dello swap e reversa i saldi
    await prisma.$transaction(async (tx) => {
      for (const transaction of swapTransactions) {
        // Colleziona asset da ricalcolare
        assetsToRecalculate.add(transaction.assetId)

        // Reversa effetto sul saldo account
        if (transaction.type === 'swap_out') {
          // Era swap_out: restituisci EUR al saldo (come una vendita reversa)
          await tx.account.update({
            where: { id: portfolio.account.id },
            data: {
              balance: {
                increment: transaction.eurValue
              }
            }
          })
        } else if (transaction.type === 'swap_in') {
          // Era swap_in: togli EUR dal saldo (come un acquisto reverso)
          await tx.account.update({
            where: { id: portfolio.account.id },
            data: {
              balance: {
                decrement: transaction.eurValue
              }
            }
          })
        }

        // Elimina la transazione
        await tx.cryptoPortfolioTransaction.delete({
          where: { id: transaction.id }
        })
      }
    })

    // 🆕 RICALCOLA AUTOMATICAMENTE HOLDINGS per tutti gli asset coinvolti
    for (const assetId of assetsToRecalculate) {
      await updateHoldings(portfolioId, assetId)
    }

    return NextResponse.json({ 
      message: 'Swap eliminato con successo',
      deletedTransactions: swapTransactions.length,
      assetsRecalculated: assetsToRecalculate.size
    })

  } catch (error) {
    console.error('Errore eliminazione swap:', error)
    return NextResponse.json({ error: 'Errore eliminazione swap' }, { status: 500 })
  }
}

// Funzione helper per aggiornare holdings (copiata e corretta)
async function updateHoldings(portfolioId: number, assetId: number) {
  try {
    // Calcola holdings dalle transazioni
    const transactions = await prisma.cryptoPortfolioTransaction.findMany({
      where: { portfolioId, assetId },
      orderBy: { date: 'asc' }
    })

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