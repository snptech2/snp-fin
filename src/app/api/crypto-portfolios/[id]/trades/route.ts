// src/app/api/crypto-portfolios/[id]/trades/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { fetchCryptoPrices } from '@/lib/cryptoPrices'

const prisma = new PrismaClient()

// GET - Lista tutti i trades del portfolio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)

    // Verifica portfolio con autenticazione
    const portfolio = await prisma.cryptoPortfolio.findFirst({
      where: { 
        id: portfolioId, 
        userId
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // Ottieni tutti i trades del portfolio
    const trades = await prisma.cryptoTrade.findMany({
      where: { portfolioId },
      include: {
        fromAsset: true,
        toAsset: true,
        openSwap: true,
        closeSwap: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcola P&L live per trades aperti
    const openTrades = trades.filter(trade => trade.status === 'open')
    
    let livePrices: Record<string, number> = {}
    if (openTrades.length > 0) {
      try {
        // Ottieni prezzi sia per asset TO che FROM per calcolare quantità ricomprabile
        const toSymbols = [...new Set(openTrades.map(trade => trade.toAsset.symbol))]
        const fromSymbols = [...new Set(openTrades.map(trade => trade.fromAsset.symbol))]
        const allSymbols = [...new Set([...toSymbols, ...fromSymbols])]
        const pricesResult = await fetchCryptoPrices(allSymbols, userId)
        livePrices = pricesResult.prices
      } catch (error) {
        console.error('Errore ottenimento prezzi live:', error)
      }
    }

    // Calcola P&L live per trades aperti
    const tradesWithLivePnL = trades.map(trade => {
      if (trade.status === 'open' && trade.toQuantity && trade.fromQuantity) {
        const toPrice = livePrices[trade.toAsset.symbol]
        const fromPrice = livePrices[trade.fromAsset.symbol]
        
        if (toPrice && fromPrice) {
          // Valore attuale degli asset TO posseduti
          const currentValue = trade.toQuantity * toPrice
          
          // Quantità di asset FROM che si potrebbe ricomprare
          const potentialFromQuantity = currentValue / fromPrice
          
          // Guadagno/perdita in quantità dell'asset FROM
          const quantityGain = potentialFromQuantity - trade.fromQuantity
          
          // P&L in EUR (mantenuto per compatibilità)
          const livePnL = currentValue - trade.initialValue
          const livePnLPercentage = (livePnL / trade.initialValue) * 100
          
          return {
            ...trade,
            livePnL,
            livePnLPercentage,
            currentValue,
            potentialFromQuantity,
            quantityGain
          }
        }
      }
      
      return trade
    })

    return NextResponse.json({ 
      trades: tradesWithLivePnL
    })

  } catch (error) {
    console.error('Errore ottenimento trades:', error)
    return NextResponse.json({ error: 'Errore ottenimento trades' }, { status: 500 })
  }
}

