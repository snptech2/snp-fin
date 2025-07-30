// src/app/api/crypto-portfolios/[id]/trades/[tradeId]/close/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// POST - Chiudi un trade con input manuale della quantità ricevuta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tradeId: string }> }
) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    const tradeId = parseInt(resolvedParams.tradeId)
    const body = await request.json()

    const { receivedQuantity } = body

    if (!receivedQuantity || receivedQuantity <= 0) {
      return NextResponse.json({ error: 'Quantità ricevuta obbligatoria e positiva' }, { status: 400 })
    }

    // Verifica trade esistente e aperto
    const trade = await prisma.cryptoTrade.findFirst({
      where: {
        id: tradeId,
        portfolioId,
        portfolio: { userId },
        status: 'open'
      },
      include: {
        fromAsset: true,
        toAsset: true,
        openSwap: true
      }
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade non trovato o già chiuso' }, { status: 404 })
    }

    // Verifica holdings dell'asset TO (che ora dobbiamo vendere)
    const toHolding = await prisma.cryptoPortfolioHolding.findFirst({
      where: { portfolioId, assetId: trade.toAssetId }
    })

    if (!toHolding || toHolding.quantity < (trade.toQuantity || 0)) {
      return NextResponse.json({ 
        error: `Holdings insufficienti. Disponibili: ${toHolding?.quantity || 0} ${trade.toAsset.symbol}, richiesti: ${trade.toQuantity || 0}` 
      }, { status: 400 })
    }

    // Calcola valore EUR dalla quantità ricevuta (assumiamo stesso valore dell'investimento originale per semplicità)
    const finalValue = trade.initialValue * (receivedQuantity / (trade.fromQuantity || 1))
    
    const currentDate = new Date()

    // Transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crea transazione TRADE_CLOSE
      const tradeCloseTx = await tx.cryptoPortfolioTransaction.create({
        data: {
          portfolioId,
          assetId: trade.toAssetId,
          type: 'trade_close',
          quantity: -(trade.toQuantity || 0), // Vendiamo esattamente la quantità del trade
          eurValue: finalValue,
          pricePerUnit: finalValue / (trade.toQuantity || 1),
          date: currentDate,
          notes: `✅ Trade chiuso: ${trade.toAsset.symbol} → ${trade.fromAsset.symbol} (ricevuto: ${receivedQuantity})`
        }
      })

      // 2. Aggiorna holdings TO (diminuisce della quantità del trade)
      await tx.cryptoPortfolioHolding.update({
        where: { 
          portfolioId_assetId: { portfolioId, assetId: trade.toAssetId }
        },
        data: {
          quantity: { decrement: trade.toQuantity || 0 },
          totalInvested: { decrement: trade.initialValue }
        }
      })

      // 3. Aggiorna holdings FROM (aumenta con quantità ricevuta)
      const existingFromHolding = await tx.cryptoPortfolioHolding.findFirst({
        where: { portfolioId, assetId: trade.fromAssetId }
      })

      if (existingFromHolding) {
        const newQuantity = existingFromHolding.quantity + receivedQuantity
        const newTotalInvested = existingFromHolding.totalInvested + finalValue
        const newAvgPrice = newTotalInvested / newQuantity

        await tx.cryptoPortfolioHolding.update({
          where: { id: existingFromHolding.id },
          data: {
            quantity: newQuantity,
            totalInvested: newTotalInvested,
            avgPrice: newAvgPrice
          }
        })
      } else {
        await tx.cryptoPortfolioHolding.create({
          data: {
            portfolioId,
            assetId: trade.fromAssetId,
            quantity: receivedQuantity,
            totalInvested: finalValue,
            avgPrice: finalValue / receivedQuantity
          }
        })
      }

      // 4. Chiudi il trade con P&L finale
      const realizedPnL = finalValue - trade.initialValue
      const pnLPercentage = (realizedPnL / trade.initialValue) * 100

      const closedTrade = await tx.cryptoTrade.update({
        where: { id: tradeId },
        data: {
          status: 'closed',
          closeSwapId: tradeCloseTx.id,
          closeDate: currentDate,
          finalValue,
          realizedPnL,
          pnLPercentage
        },
        include: {
          fromAsset: true,
          toAsset: true
        }
      })

      return { trade: closedTrade, transaction: tradeCloseTx }
    })

    return NextResponse.json({
      message: 'Trade chiuso con successo',
      trade: result.trade,
      performance: {
        realizedPnL: result.trade.realizedPnL,
        pnLPercentage: result.trade.pnLPercentage,
        duration: Math.round((currentDate.getTime() - trade.openDate.getTime()) / (1000 * 60 * 60 * 24)),
        receivedQuantity
      }
    })

  } catch (error) {
    console.error('Errore chiusura trade:', error)
    return NextResponse.json({ error: 'Errore chiusura trade' }, { status: 500 })
  }
}