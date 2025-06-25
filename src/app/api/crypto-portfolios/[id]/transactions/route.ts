// src/app/api/crypto-portfolios/[id]/transactions/route.ts - ENHANCED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista transazioni per portfolio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)

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
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const body = await request.json()

    const {
      type, // "buy" | "sell"
      assetSymbol,
      quantity,
      eurValue,
      pricePerUnit,
      broker,
      notes,
      date
    } = body

    // Validazioni
    if (!type || !['buy', 'sell'].includes(type)) {
      return NextResponse.json({ error: 'Tipo transazione non valido' }, { status: 400 })
    }

    if (!assetSymbol || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Asset e quantità richiesti' }, { status: 400 })
    }

    // Verifica portfolio
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: portfolioId, userId: 1 }
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

    const result = await prisma.$transaction(async (tx) => {
      // Crea transazione
      const transaction = await tx.cryptoPortfolioTransaction.create({
        data: {
          portfolioId,
          assetId: asset.id,
          type,
          quantity: finalQuantity,
          eurValue: finalEurValue,
          pricePerUnit: finalPricePerUnit,
          broker: broker || null,
          notes: notes || null,
          date: date ? new Date(date) : new Date()
        },
        include: { asset: true }
      })

      // Aggiorna holding
      await updateHolding(tx, portfolioId, asset.id, type, finalQuantity, finalEurValue)

      return transaction
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Errore creazione transazione:', error)
    return NextResponse.json({ error: 'Errore creazione transazione' }, { status: 500 })
  }
}

// PUT - Modifica transazione specifica
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const { searchParams } = new URL(request.url)
    const transactionId = parseInt(searchParams.get('transactionId') || '0')
    
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId richiesto come query parameter' }, { status: 400 })
    }

    const body = await request.json()
    const {
      type,
      assetSymbol,
      quantity,
      eurValue,
      pricePerUnit,
      broker,
      notes,
      date
    } = body

    // Validazioni
    if (!type || !['buy', 'sell'].includes(type)) {
      return NextResponse.json({ error: 'Tipo transazione non valido' }, { status: 400 })
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Quantità richiesta' }, { status: 400 })
    }

    // Verifica che la transazione esista e appartenga all'utente
    const existingTransaction = await prisma.cryptoPortfolioTransaction.findFirst({
      where: { 
        id: transactionId,
        portfolioId,
        portfolio: { userId: 1 }
      },
      include: { asset: true }
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    // Trova asset (deve esistere se stiamo modificando)
    let asset = await prisma.cryptoPortfolioAsset.findUnique({
      where: { symbol: assetSymbol.toUpperCase() }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset non trovato' }, { status: 404 })
    }

    // Calcola valori
    const finalQuantity = parseFloat(quantity)
    const finalEurValue = eurValue ? parseFloat(eurValue) : (finalQuantity * parseFloat(pricePerUnit || '0'))
    const finalPricePerUnit = pricePerUnit ? parseFloat(pricePerUnit) : (finalEurValue / finalQuantity)

    const result = await prisma.$transaction(async (tx) => {
      // Prima: rimuovi l'impatto della vecchia transazione sui holdings
      await revertHoldingUpdate(tx, portfolioId, existingTransaction)

      // Poi: aggiorna la transazione
      const updatedTransaction = await tx.cryptoPortfolioTransaction.update({
        where: { id: transactionId },
        data: {
          type,
          assetId: asset.id,
          quantity: finalQuantity,
          eurValue: finalEurValue,
          pricePerUnit: finalPricePerUnit,
          broker: broker || null,
          notes: notes || null,
          date: date ? new Date(date) : new Date(),
          updatedAt: new Date()
        },
        include: { asset: true }
      })

      // Infine: applica il nuovo impatto sui holdings
      await updateHolding(tx, portfolioId, asset.id, type, finalQuantity, finalEurValue)

      return updatedTransaction
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Errore modifica transazione:', error)
    return NextResponse.json({ error: 'Errore modifica transazione' }, { status: 500 })
  }
}

// DELETE - Elimina transazione specifica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const { searchParams } = new URL(request.url)
    const transactionId = parseInt(searchParams.get('transactionId') || '0')

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId richiesto come query parameter' }, { status: 400 })
    }

    // Verifica che la transazione esista e appartenga all'utente
    const transaction = await prisma.cryptoPortfolioTransaction.findFirst({
      where: { 
        id: transactionId,
        portfolioId,
        portfolio: { userId: 1 }
      },
      include: { asset: true }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Prima: rimuovi l'impatto sui holdings
      await revertHoldingUpdate(tx, portfolioId, transaction)

      // Poi: elimina la transazione
      await tx.cryptoPortfolioTransaction.delete({
        where: { id: transactionId }
      })

      return { message: 'Transazione eliminata con successo' }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Errore eliminazione transazione:', error)
    return NextResponse.json({ error: 'Errore eliminazione transazione' }, { status: 500 })
  }
}

// Helper per rimuovere l'impatto di una transazione sui holdings
async function revertHoldingUpdate(tx: any, portfolioId: number, transaction: any) {
  const existingHolding = await tx.cryptoPortfolioHolding.findUnique({
    where: {
      portfolioId_assetId: { portfolioId, assetId: transaction.assetId }
    }
  })

  if (!existingHolding) return // Nessun holding da aggiornare

  if (transaction.type === 'buy') {
    // Rimuovi l'acquisto: sottrai quantità e valore
    const newQuantity = Math.max(0, existingHolding.quantity - transaction.quantity)
    const newTotalInvested = Math.max(0, existingHolding.totalInvested - transaction.eurValue)

    if (newQuantity === 0) {
      await tx.cryptoPortfolioHolding.delete({
        where: { id: existingHolding.id }
      })
    } else {
      const newAvgPrice = newTotalInvested > 0 ? newTotalInvested / newQuantity : 0
      await tx.cryptoPortfolioHolding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: newQuantity,
          avgPrice: newAvgPrice,
          totalInvested: newTotalInvested,
          lastUpdated: new Date()
        }
      })
    }
  } else if (transaction.type === 'sell') {
    // Rimuovi la vendita: aggiungi quantità indietro
    const newQuantity = existingHolding.quantity + transaction.quantity
    const addedValue = transaction.quantity * existingHolding.avgPrice
    const realizedGain = transaction.eurValue - addedValue

    await tx.cryptoPortfolioHolding.update({
      where: { id: existingHolding.id },
      data: {
        quantity: newQuantity,
        totalInvested: existingHolding.totalInvested + addedValue,
        realizedGains: existingHolding.realizedGains - realizedGain,
        lastUpdated: new Date()
      }
    })
  }
}

// Helper per aggiornare holding (esistente, mantenuto uguale)
async function updateHolding(tx: any, portfolioId: number, assetId: number, type: string, quantity: number, eurValue: number) {
  const existingHolding = await tx.cryptoPortfolioHolding.findUnique({
    where: {
      portfolioId_assetId: { portfolioId, assetId }
    }
  })

  if (type === 'buy') {
    if (existingHolding) {
      // Aggiorna holding esistente con media ponderata
      const newTotalInvested = existingHolding.totalInvested + eurValue
      const newTotalQuantity = existingHolding.quantity + quantity
      const newAvgPrice = newTotalQuantity > 0 ? newTotalInvested / newTotalQuantity : 0

      await tx.cryptoPortfolioHolding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: newTotalQuantity,
          avgPrice: newAvgPrice,
          totalInvested: newTotalInvested,
          lastUpdated: new Date()
        }
      })
    } else {
      // Crea nuovo holding
      await tx.cryptoPortfolioHolding.create({
        data: {
          portfolioId,
          assetId,
          quantity,
          avgPrice: eurValue > 0 ? eurValue / quantity : 0,
          totalInvested: eurValue,
          realizedGains: 0
        }
      })
    }
  } else if (type === 'sell' && existingHolding) {
    // Vendita
    const newQuantity = Math.max(0, existingHolding.quantity - quantity)
    const soldValue = quantity * existingHolding.avgPrice
    const realizedGain = eurValue - soldValue

    if (newQuantity === 0) {
      // Elimina holding se quantità = 0
      await tx.cryptoPortfolioHolding.delete({
        where: { id: existingHolding.id }
      })
    } else {
      // Aggiorna holding
      await tx.cryptoPortfolioHolding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: newQuantity,
          totalInvested: Math.max(0, existingHolding.totalInvested - soldValue),
          realizedGains: existingHolding.realizedGains + realizedGain,
          lastUpdated: new Date()
        }
      })
    }
  }
}