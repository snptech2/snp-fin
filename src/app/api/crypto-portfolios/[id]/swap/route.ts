// src/app/api/crypto-portfolios/[id]/swap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// POST - Crea swap tra due asset
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
    const body = await request.json()

    const {
      fromAsset,
      toAsset,
      fromQuantity,
      toQuantity,
      date,
      notes
    } = body

    // Validazioni
    if (!fromAsset || !toAsset || !fromQuantity || !toQuantity) {
      return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
    }

    if (fromQuantity <= 0 || toQuantity <= 0) {
      return NextResponse.json({ error: 'Le quantità devono essere positive' }, { status: 400 })
    }

    if (fromAsset.toUpperCase() === toAsset.toUpperCase()) {
      return NextResponse.json({ error: 'Non puoi fare swap dello stesso asset' }, { status: 400 })
    }

    // Verifica portfolio CON AUTENTICAZIONE
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId, 
        userId
      },
      include: { 
        account: true,
        holdings: {
          include: { asset: true }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Verifica che l'utente abbia abbastanza del fromAsset
    const fromHolding = portfolio.holdings.find(h => h.asset.symbol.toUpperCase() === fromAsset.toUpperCase())
    
    if (!fromHolding) {
      return NextResponse.json({ error: `Non possiedi ${fromAsset}` }, { status: 400 })
    }

    if (fromHolding.quantity < parseFloat(fromQuantity)) {
      return NextResponse.json({ 
        error: `Quantità insufficiente. Hai ${fromHolding.quantity} ${fromAsset}, richiesti ${fromQuantity}` 
      }, { status: 400 })
    }

    // Trova o crea asset FROM
    let fromAssetRecord = await prisma.cryptoPortfolioAsset.findUnique({
      where: { symbol: fromAsset.toUpperCase() }
    })

    if (!fromAssetRecord) {
      return NextResponse.json({ error: `Asset ${fromAsset} non trovato` }, { status: 404 })
    }

    // Trova o crea asset TO
    let toAssetRecord = await prisma.cryptoPortfolioAsset.findUnique({
      where: { symbol: toAsset.toUpperCase() }
    })

    if (!toAssetRecord) {
      toAssetRecord = await prisma.cryptoPortfolioAsset.create({
        data: {
          symbol: toAsset.toUpperCase(),
          name: toAsset.toUpperCase(),
          decimals: 6,
          isActive: true
        }
      })
    }

    // Calcola il valore EUR equivalente per il tasso di cambio
    const fromValue = fromHolding.avgPrice * parseFloat(fromQuantity)
    const toValue = fromValue // Assumiamo valore equivalente per swap
    const toPricePerUnit = toValue / parseFloat(toQuantity)

    const swapDate = date ? new Date(date) : new Date()

    // Crea le due transazioni swap_out e swap_in usando una transazione database
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crea transazione SWAP_OUT (vendita dell'asset FROM)
      const swapOutTransaction = await tx.cryptoPortfolioTransaction.create({
        data: {
          portfolioId,
          type: 'swap_out',
          assetId: fromAssetRecord.id,
          quantity: parseFloat(fromQuantity),
          eurValue: fromValue,
          pricePerUnit: fromHolding.avgPrice,
          date: swapDate,
          notes: notes?.trim() || `Swap ${fromAsset} → ${toAsset}`
        },
        include: { asset: true }
      })

      // 2. Crea transazione SWAP_IN (acquisto dell'asset TO)
      const swapInTransaction = await tx.cryptoPortfolioTransaction.create({
        data: {
          portfolioId,
          type: 'swap_in',
          assetId: toAssetRecord.id,
          quantity: parseFloat(toQuantity),
          eurValue: toValue,
          pricePerUnit: toPricePerUnit,
          date: swapDate,
          notes: notes?.trim() || `Swap ${fromAsset} → ${toAsset}`,
          swapPairId: swapOutTransaction.id
        },
        include: { asset: true }
      })

      // 3. Collega le transazioni swap
      await tx.cryptoPortfolioTransaction.update({
        where: { id: swapOutTransaction.id },
        data: { swapPairId: swapInTransaction.id }
      })

      return { swapOutTransaction, swapInTransaction }
    })

    // 🆕 RICALCOLA HOLDINGS per entrambi gli asset
    await updateHoldings(portfolioId, fromAssetRecord.id)
    await updateHoldings(portfolioId, toAssetRecord.id)

    return NextResponse.json({
      message: 'Swap completato con successo',
      swapOut: result.swapOutTransaction,
      swapIn: result.swapInTransaction
    }, { status: 201 })

  } catch (error) {
    console.error('Errore creazione swap:', error)
    return NextResponse.json({ error: 'Errore creazione swap' }, { status: 500 })
  }
}

// Funzione helper per aggiornare holdings (copiata e adattata per swap)
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