// src/app/api/crypto-portfolios/[id]/trades/[tradeId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()


// DELETE - Cancella un trade e ripristina holdings
export async function DELETE(
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

    // Verifica trade esistente
    const trade = await prisma.cryptoTrade.findFirst({
      where: {
        id: tradeId,
        portfolioId,
        portfolio: { userId }
      },
      include: {
        fromAsset: true,
        toAsset: true,
        openSwap: true,
        closeSwap: true
      }
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade non trovato' }, { status: 404 })
    }

    // Transazione atomica per cancellare tutto
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ripristina holdings FROM (aggiungi fromQuantity)
      if (trade.fromQuantity) {
        const fromHolding = await tx.cryptoPortfolioHolding.findFirst({
          where: { portfolioId, assetId: trade.fromAssetId }
        })

        if (fromHolding) {
          const newQuantity = fromHolding.quantity + trade.fromQuantity
          const newTotalInvested = fromHolding.totalInvested + trade.initialValue
          const newAvgPrice = newTotalInvested / newQuantity

          await tx.cryptoPortfolioHolding.update({
            where: { id: fromHolding.id },
            data: {
              quantity: newQuantity,
              totalInvested: newTotalInvested,
              avgPrice: newAvgPrice
            }
          })
        } else {
          // Crea holding se non esiste
          await tx.cryptoPortfolioHolding.create({
            data: {
              portfolioId,
              assetId: trade.fromAssetId,
              quantity: trade.fromQuantity,
              totalInvested: trade.initialValue,
              avgPrice: trade.initialValue / trade.fromQuantity
            }
          })
        }
      }

      // 2. Rimuovi holdings TO (sottrai toQuantity)
      if (trade.toQuantity) {
        const toHolding = await tx.cryptoPortfolioHolding.findFirst({
          where: { portfolioId, assetId: trade.toAssetId }
        })

        if (toHolding) {
          const newQuantity = Math.max(0, toHolding.quantity - trade.toQuantity)
          
          if (newQuantity === 0) {
            // Cancella holding se quantità diventa 0
            await tx.cryptoPortfolioHolding.delete({
              where: { id: toHolding.id }
            })
          } else {
            const valueToRemove = (trade.toQuantity / toHolding.quantity) * toHolding.totalInvested
            const newTotalInvested = Math.max(0, toHolding.totalInvested - valueToRemove)
            const newAvgPrice = newQuantity > 0 ? newTotalInvested / newQuantity : 0

            await tx.cryptoPortfolioHolding.update({
              where: { id: toHolding.id },
              data: {
                quantity: newQuantity,
                totalInvested: newTotalInvested,
                avgPrice: newAvgPrice
              }
            })
          }
        }
      }

      // 3. Cancella transazioni collegate
      if (trade.openSwapId) {
        await tx.cryptoPortfolioTransaction.delete({
          where: { id: trade.openSwapId }
        })
      }

      if (trade.closeSwapId) {
        await tx.cryptoPortfolioTransaction.delete({
          where: { id: trade.closeSwapId }
        })
      }

      // 4. Cancella il trade
      await tx.cryptoTrade.delete({
        where: { id: tradeId }
      })

      return { success: true }
    })

    return NextResponse.json({
      message: 'Trade cancellato con successo',
      restoredHoldings: {
        fromAsset: trade.fromAsset.symbol,
        fromQuantity: trade.fromQuantity,
        toAsset: trade.toAsset.symbol,
        toQuantity: trade.toQuantity
      }
    })

  } catch (error) {
    console.error('Errore cancellazione trade:', error)
    return NextResponse.json({ error: 'Errore cancellazione trade' }, { status: 500 })
  }
}