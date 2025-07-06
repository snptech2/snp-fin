// src/app/api/crypto-portfolios/[id]/transactions/route.ts - FIX CON AUTENTICAZIONE
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'  // ← AGGIUNTO

const prisma = new PrismaClient()

// GET - Lista transazioni per portfolio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione AGGIUNTA
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)

    // Verifica che il portfolio appartenga all'utente
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId, 
        userId  // ← FIX: era userId: 1
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    const transactions = await prisma.cryptoPortfolioTransaction.findMany({
      where: { portfolioId },
      include: {
        asset: true
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Errore recupero transazioni:', error)
    return NextResponse.json({ error: 'Errore recupero transazioni' }, { status: 500 })
  }
}

// POST - Crea transazione
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione AGGIUNTA
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const body = await request.json()

    const {
      type, // "buy" | "sell" | "stake_reward"
      assetSymbol,
      quantity,
      eurValue,
      pricePerUnit,
      broker,
      notes,
      date
    } = body

    // Validazioni
    if (!type || !['buy', 'sell', 'stake_reward'].includes(type)) {
      return NextResponse.json({ error: 'Tipo transazione non valido' }, { status: 400 })
    }

    if (!assetSymbol || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Asset e quantità richiesti' }, { status: 400 })
    }

    // Verifica portfolio CON AUTENTICAZIONE
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId, 
        userId  // ← FIX: era userId: 1
      },
      include: { account: true }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Trova o crea asset
    let asset = await prisma.cryptoPortfolioAsset.findUnique({
      where: { symbol: assetSymbol.toUpperCase() }
    })

    if (!asset) {
      // Auto-crea asset se non esiste
      asset = await prisma.cryptoPortfolioAsset.create({
        data: {
          symbol: assetSymbol.toUpperCase(),
          name: assetSymbol.toUpperCase(),
          decimals: 6,
          isActive: true
        }
      })
    }

    // Calcola valori mancanti
    const finalQuantity = parseFloat(quantity)
    const finalEurValue = eurValue ? parseFloat(eurValue) : (finalQuantity * parseFloat(pricePerUnit || '0'))
    const finalPricePerUnit = pricePerUnit ? parseFloat(pricePerUnit) : (finalEurValue / finalQuantity)

    if (finalEurValue <= 0 || finalPricePerUnit <= 0) {
      return NextResponse.json({ error: 'Valore EUR e prezzo devono essere positivi' }, { status: 400 })
    }

    // Crea transazione
    const transaction = await prisma.cryptoPortfolioTransaction.create({
      data: {
        portfolioId,
        type,
        assetId: asset.id,
        quantity: finalQuantity,
        eurValue: finalEurValue,
        pricePerUnit: finalPricePerUnit,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null
      },
      include: {
        asset: true
      }
    })

    // 🆕 AGGIORNA SALDO ACCOUNT (era commentato)
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
      // Staking rewards aumentano il saldo (guadagno senza costo)
      await prisma.account.update({
        where: { id: portfolio.account.id },
        data: {
          balance: {
            increment: finalEurValue
          }
        }
      })
    }

    // 🆕 RICALCOLA HOLDINGS
    await updateHoldings(portfolioId, asset.id)

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Errore creazione transazione:', error)
    return NextResponse.json({ error: 'Errore creazione transazione' }, { status: 500 })
  }
}

// Funzione helper per aggiornare holdings
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