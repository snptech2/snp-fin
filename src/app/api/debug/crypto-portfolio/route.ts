// src/app/api/debug/crypto-portfolio/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// 🔍 DEBUG API: Analizza in dettaglio le transazioni di un crypto portfolio
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const params = await context.params
    const portfolioId = parseInt(params.id)

    if (isNaN(portfolioId)) {
      return NextResponse.json({ error: 'ID portfolio non valido' }, { status: 400 })
    }

    // Recupera portfolio con tutte le transazioni
    const portfolio = await prisma.cryptoPortfolio.findUnique({
      where: { id: portfolioId, userId },
      include: {
        transactions: {
          include: { asset: true },
          orderBy: { date: 'asc' }
        },
        holdings: {
          include: { asset: true }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio non trovato' }, { status: 404 })
    }

    // 🔍 ANALISI DETTAGLIATA DELLE TRANSAZIONI
    console.log(`\n🔍 DEBUG PORTFOLIO: ${portfolio.name} (ID: ${portfolioId})`)
    console.log(`📊 Totale transazioni: ${portfolio.transactions.length}`)

    const analysis = {
      portfolioInfo: {
        id: portfolio.id,
        name: portfolio.name,
        totalTransactions: portfolio.transactions.length
      },
      transactions: [],
      calculations: {
        buyTransactions: [],
        sellTransactions: [],
        totals: {
          totalInvested: 0,
          capitalRecovered: 0,
          effectiveInvestment: 0,
          realizedProfit: 0
        }
      },
      holdings: portfolio.holdings.map(h => ({
        asset: h.asset.symbol,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        totalInvested: h.totalInvested,
        realizedGains: h.realizedGains
      }))
    }

    // Analizza ogni transazione
    let runningInvested = 0
    let runningRecovered = 0

    portfolio.transactions.forEach((tx, index) => {
      const transactionData = {
        index: index + 1,
        id: tx.id,
        date: tx.date.toISOString().split('T')[0],
        type: tx.type,
        asset: tx.asset.symbol,
        quantity: tx.quantity,
        eurValue: tx.eurValue,
        pricePerUnit: tx.pricePerUnit,
        notes: tx.notes || '-'
      } as any

      (analysis.transactions as any[]).push(transactionData)

      if (tx.type === 'buy') {
        runningInvested += (tx as any).eurValue
        (analysis.calculations.buyTransactions as any[]).push({
          ...transactionData,
          runningInvested
        })
        console.log(`${index + 1}. 💰 BUY ${tx.quantity} ${tx.asset.symbol} = €${tx.eurValue} | Total Invested: €${runningInvested}`)
      } else if (tx.type === 'sell') {
        runningRecovered += (tx as any).eurValue
        (analysis.calculations.sellTransactions as any[]).push({
          ...transactionData,
          runningRecovered
        })
        console.log(`${index + 1}. 💸 SELL ${tx.quantity} ${tx.asset.symbol} = €${tx.eurValue} | Total Recovered: €${runningRecovered}`)
      }
    })

    // 🧮 CALCOLI ENHANCED CASH FLOW
    const buyTransactions = portfolio.transactions.filter(tx => tx.type === 'buy')
    const sellTransactions = portfolio.transactions.filter(tx => tx.type === 'sell')

    const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
    const capitalRecovered = sellTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
    const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
    const realizedProfit = Math.max(0, capitalRecovered - totalInvested)
    const isFullyRecovered = capitalRecovered >= totalInvested

    analysis.calculations.totals = {
      totalInvested,
      capitalRecovered,
      effectiveInvestment,
      realizedProfit,
      isFullyRecovered
    } as any

    console.log(`\n📊 ENHANCED CASH FLOW RESULTS:`)
    console.log(`💰 Total Invested: €${totalInvested}`)
    console.log(`🔄 Capital Recovered: €${capitalRecovered}`)
    console.log(`⚠️  Effective Investment (Soldi a Rischio): €${effectiveInvestment}`)
    console.log(`💹 Realized Profit: €${realizedProfit}`)
    console.log(`✅ Fully Recovered: ${isFullyRecovered}`)

    // 🚨 VERIFICA INCONSISTENZE
    const warnings = []
    
    if (effectiveInvestment < 0) {
      warnings.push("🚨 ATTENZIONE: effectiveInvestment negativo! Dovrebbe essere 0.")
    }
    
    if (capitalRecovered > totalInvested && realizedProfit !== (capitalRecovered - totalInvested)) {
      warnings.push("🚨 ATTENZIONE: realizedProfit non corrisponde al calcolo!")
    }

    if (buyTransactions.length === 0 && totalInvested > 0) {
      warnings.push("🚨 ATTENZIONE: Nessun acquisto ma totalInvested > 0!")
    }

    (analysis as any).warnings = warnings

    // 🔍 SUMMARY PER DEBUG
    const summary = {
      scenario: "Portfolio qwe dovrebbe avere:",
      expected: {
        totalInvested: "820€ (150€ SOL + 670€ ETH)",
        capitalRecovered: "950€ (vendita 8 SOL)",
        effectiveInvestment: "0€ (perché 950 > 820)",
        realizedProfit: "130€ (950 - 820)"
      },
      actual: analysis.calculations.totals,
      discrepancy: {
        totalInvested: totalInvested - 820,
        capitalRecovered: capitalRecovered - 950,
        effectiveInvestment: effectiveInvestment - 0
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      summary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Errore DEBUG crypto portfolio:', error)
    return NextResponse.json({
      error: 'Errore durante il debug',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 })
  }
}