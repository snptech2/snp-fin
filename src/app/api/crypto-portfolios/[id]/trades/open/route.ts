// src/app/api/crypto-portfolios/[id]/trades/open/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// POST - Apri un trade direttamente (crea i swap automaticamente)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { fromAssetId, toAssetSymbol, fromQuantity, toQuantity, notes } = body

    // Validazioni
    if (!fromAssetId || !toAssetSymbol || !fromQuantity || !toQuantity) {
      return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 })
    }

    if (fromQuantity <= 0 || toQuantity <= 0) {
      return NextResponse.json({ error: 'Le quantità devono essere positive' }, { status: 400 })
    }

    // Verifica portfolio
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { id: portfolioId, userId }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Verifica asset FROM esistente
    const fromAsset = await prisma.cryptoPortfolioAsset.findFirst({ 
      where: { id: fromAssetId } 
    })

    if (!fromAsset) {
      return NextResponse.json({ error: 'Asset di origine non trovato' }, { status: 404 })
    }

    // Trova o crea asset TO basato sul simbolo
    let toAsset = await prisma.cryptoPortfolioAsset.findFirst({
      where: { symbol: toAssetSymbol.toUpperCase() }
    })

    if (!toAsset) {
      // Crea nuovo asset se non esiste
      toAsset = await prisma.cryptoPortfolioAsset.create({
        data: {
          symbol: toAssetSymbol.toUpperCase(),
          name: toAssetSymbol.toUpperCase(), // Per ora usa simbolo come nome
          decimals: 6,
          isActive: true
        }
      })
    }

    const toAssetId = toAsset.id

    // Verifica holdings sufficienti
    const holding = await prisma.cryptoPortfolioHolding.findFirst({
      where: { portfolioId, assetId: fromAssetId }
    })

    if (!holding || holding.quantity < fromQuantity) {
      return NextResponse.json({ 
        error: `Holdings insufficienti. Disponibili: ${holding?.quantity || 0} ${fromAsset.symbol}` 
      }, { status: 400 })
    }

    // Calcola prezzo unitario per i swap
    const fromPricePerUnit = 0 // Sarà calcolato dal valore EUR del holding
    const toPricePerUnit = 0   // Sarà impostato dopo

    // Stima valore EUR dal holding esistente
    const eurValueFromSwap = (fromQuantity / holding.quantity) * holding.totalInvested
    const toPricePerUnitCalculated = eurValueFromSwap / toQuantity

    const currentDate = new Date()

    // Transazione: tutto in una sola operazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crea trade record
      const trade = await tx.cryptoTrade.create({
        data: {
          portfolioId,
          fromAssetId,
          toAssetId,
          fromQuantity,
          toQuantity,
          status: 'open',
          openDate: currentDate,
          initialValue: eurValueFromSwap,
          notes: notes?.trim() || `Trade ${fromAsset.symbol} → ${toAsset.symbol}`
        }
      })

      // 2. Crea transazione TRADE_OPEN (invece di swap_out)
      const tradeOpenTx = await tx.cryptoPortfolioTransaction.create({
        data: {
          portfolioId,
          assetId: fromAssetId,
          type: 'trade_open',
          quantity: -fromQuantity, // Negativo perché esce
          eurValue: eurValueFromSwap,
          pricePerUnit: eurValueFromSwap / fromQuantity,
          date: currentDate,
          notes: notes || `🎯 Trade aperto: ${fromAsset.symbol} → ${toAsset.symbol}`
        }
      })

      // 3. Aggiorna openSwapId del trade
      await tx.cryptoTrade.update({
        where: { id: trade.id },
        data: { openSwapId: tradeOpenTx.id }
      })

      // 4. Aggiorna holdings FROM (diminuisce)
      await tx.cryptoPortfolioHolding.update({
        where: { 
          portfolioId_assetId: { portfolioId, assetId: fromAssetId }
        },
        data: {
          quantity: { decrement: fromQuantity },
          totalInvested: { decrement: eurValueFromSwap }
        }
      })

      // 5. Aggiorna/Crea holdings TO (aumenta)
      const existingToHolding = await tx.cryptoPortfolioHolding.findFirst({
        where: { portfolioId, assetId: toAssetId }
      })

      if (existingToHolding) {
        // Calcola nuovo prezzo medio
        const newTotalQuantity = existingToHolding.quantity + toQuantity
        const newTotalInvested = existingToHolding.totalInvested + eurValueFromSwap
        const newAvgPrice = newTotalInvested / newTotalQuantity

        await tx.cryptoPortfolioHolding.update({
          where: { id: existingToHolding.id },
          data: {
            quantity: newTotalQuantity,
            totalInvested: newTotalInvested,
            avgPrice: newAvgPrice
          }
        })
      } else {
        // Crea nuovo holding
        await tx.cryptoPortfolioHolding.create({
          data: {
            portfolioId,
            assetId: toAssetId,
            quantity: toQuantity,
            totalInvested: eurValueFromSwap,
            avgPrice: toPricePerUnitCalculated
          }
        })
      }

      // Ritorna il trade creato
      const tradeWithRelations = await tx.cryptoTrade.findUnique({
        where: { id: trade.id },
        include: {
          fromAsset: true,
          toAsset: true,
          openSwap: true
        }
      })

      return { trade: tradeWithRelations, transaction: tradeOpenTx }
    })

    return NextResponse.json({
      message: 'Trade aperto con successo',
      trade: result.trade,
      transaction: result.transaction
    }, { status: 201 })

  } catch (error) {
    console.error('Errore apertura trade:', error)
    return NextResponse.json({ error: 'Errore apertura trade' }, { status: 500 })
  }
}