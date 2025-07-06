// src/app/api/crypto-portfolios/[id]/transactions/[transactionId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Modifica transazione esistente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const transactionId = parseInt(resolvedParams.transactionId)
    const body = await request.json()

    const {
      type, // "buy" | "sell" | "stake_reward"
      assetSymbol,
      quantity,
      eurValue,
      date,
      notes
    } = body

    // Validazioni
    if (!type || !['buy', 'sell', 'stake_reward'].includes(type)) {
      return NextResponse.json({ error: 'Tipo transazione non valido' }, { status: 400 })
    }

    if (!assetSymbol || !quantity || quantity <= 0 || !eurValue || eurValue <= 0) {
      return NextResponse.json({ error: 'Asset, quantità e valore EUR richiesti' }, { status: 400 })
    }

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

    // Verifica transazione esistente
    const existingTransaction = await prisma.cryptoPortfolioTransaction.findFirst({
      where: { 
        id: transactionId,
        portfolioId
      },
      include: { asset: true }
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    // Trova o crea asset
    let asset = await prisma.cryptoPortfolioAsset.findUnique({
      where: { symbol: assetSymbol.toUpperCase() }
    })

    if (!asset) {
      asset = await prisma.cryptoPortfolioAsset.create({
        data: {
          symbol: assetSymbol.toUpperCase(),
          name: assetSymbol.toUpperCase(),
          decimals: 6,
          isActive: true
        }
      })
    }

    // Calcola valori
    const finalQuantity = parseFloat(quantity)
    const finalEurValue = parseFloat(eurValue)
    const finalPricePerUnit = finalEurValue / finalQuantity

    // 🔄 REVERSA LA TRANSAZIONE ORIGINALE dal saldo account
    if (existingTransaction.type === 'buy') {
      // Era buy: restituisci EUR al saldo
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            increment: existingTransaction.eurValue
          }
        }
      })
    } else if (existingTransaction.type === 'sell') {
      // Era sell: rimuovi EUR dal saldo
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            decrement: existingTransaction.eurValue
          }
        }
      })
    } else if (existingTransaction.type === 'stake_reward') {
      // Era stake_reward: rimuovi EUR dal saldo
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            decrement: existingTransaction.eurValue
          }
        }
      })
    }

    // Aggiorna la transazione
    const updatedTransaction = await prisma.cryptoPortfolioTransaction.update({
      where: { id: transactionId },
      data: {
        type,
        assetId: asset.id,
        quantity: finalQuantity,
        eurValue: finalEurValue,
        pricePerUnit: finalPricePerUnit,
        date: date ? new Date(date) : existingTransaction.date,
        notes: notes?.trim() || null
      },
      include: {
        asset: true
      }
    })

    // 🆕 APPLICA LA NUOVA TRANSAZIONE al saldo account
    if (type === 'buy') {
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            decrement: finalEurValue
          }
        }
      })
    } else if (type === 'sell') {
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            increment: finalEurValue
          }
        }
      })
    } else if (type === 'stake_reward') {
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            increment: finalEurValue
          }
        }
      })
    }

    // 🆕 RICALCOLA HOLDINGS per l'asset originale (se diverso)
    if (existingTransaction.assetId !== asset.id) {
      await updateHoldings(portfolioId, existingTransaction.assetId)
    }
    
    // 🆕 RICALCOLA HOLDINGS per il nuovo asset
    await updateHoldings(portfolioId, asset.id)

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Errore modifica transazione:', error)
    return NextResponse.json({ error: 'Errore modifica transazione' }, { status: 500 })
  }
}

// DELETE - Elimina transazione
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const transactionId = parseInt(resolvedParams.transactionId)

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

    // Verifica transazione esistente
    const existingTransaction = await prisma.cryptoPortfolioTransaction.findFirst({
      where: { 
        id: transactionId,
        portfolioId
      },
      include: { asset: true }
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    // 🔄 REVERSA LA TRANSAZIONE dal saldo account
    if (existingTransaction.type === 'buy') {
      // Era buy: restituisci EUR al saldo
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            increment: existingTransaction.eurValue
          }
        }
      })
    } else if (existingTransaction.type === 'sell') {
      // Era sell: rimuovi EUR dal saldo
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            decrement: existingTransaction.eurValue
          }
        }
      })
    } else if (existingTransaction.type === 'stake_reward') {
      // Era stake_reward: rimuovi EUR dal saldo
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            decrement: existingTransaction.eurValue
          }
        }
      })
    }

    // Elimina la transazione
    await prisma.cryptoPortfolioTransaction.delete({
      where: { id: transactionId }
    })

    // 🆕 RICALCOLA HOLDINGS per l'asset
    await updateHoldings(portfolioId, existingTransaction.assetId)

    return NextResponse.json({ message: 'Transazione eliminata con successo' })
  } catch (error) {
    console.error('Errore eliminazione transazione:', error)
    return NextResponse.json({ error: 'Errore eliminazione transazione' }, { status: 500 })
  }
}

// Funzione helper per aggiornare holdings (copiata e migliorata dal file transactions/route.ts)
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