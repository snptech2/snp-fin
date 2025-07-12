// src/app/api/dashboard/route.ts - API unificata per dashboard performance
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// Calculate Enhanced Cash Flow stats for DCA portfolios
function calculateDCAEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter((tx: any) => tx.type === 'buy' || !tx.type)
  const sellTransactions = transactions.filter((tx: any) => tx.type === 'sell')

  const totalInvested = buyTransactions.reduce((sum: number, tx: any) => sum + tx.eurPaid, 0)
  const totalSold = sellTransactions.reduce((sum: number, tx: any) => sum + tx.eurPaid, 0)
  
  const capitalRecovered = Math.min(totalSold, totalInvested)
  const realizedProfit = Math.max(0, totalSold - totalInvested)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)

  const totalBuyBTC = buyTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.btcQuantity), 0)
  const totalSellBTC = sellTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.btcQuantity), 0)
  const totalBTC = totalBuyBTC - totalSellBTC

  const isFullyRecovered = capitalRecovered >= totalInvested
  const freeBTCAmount = isFullyRecovered ? totalBTC : 0

  const transactionCount = transactions.length
  const buyCount = buyTransactions.length
  const sellCount = sellTransactions.length

  return {
    totalInvested,
    capitalRecovered,
    effectiveInvestment,
    realizedProfit,
    totalBuyBTC,
    totalSellBTC,
    totalBTC,
    isFullyRecovered,
    freeBTCAmount,
    transactionCount,
    buyCount,
    sellCount
  }
}

// Calculate Enhanced Cash Flow stats for Crypto portfolios
function calculateCryptoEnhancedStats(transactions: any[]) {
  const buyTransactions = transactions.filter(tx => tx.type === 'buy')
  const sellTransactions = transactions.filter(tx => tx.type === 'sell')

  const totalInvested = buyTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
  const totalSold = sellTransactions.reduce((sum, tx) => sum + tx.eurValue, 0)
  const capitalRecovered = Math.min(totalSold, totalInvested)
  const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
  const realizedProfit = Math.max(0, totalSold - totalInvested)

  const isFullyRecovered = capitalRecovered >= totalInvested

  return {
    totalInvested,
    capitalRecovered,
    effectiveInvestment,
    realizedProfit,
    isFullyRecovered,
    transactionCount: transactions.length,
    buyCount: buyTransactions.length,
    sellCount: sellTransactions.length
  }
}

// GET - Dashboard data unificata (riduce da 8 a 1 chiamata HTTP)
export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    console.log('🚀 Dashboard API - Fetching unified data for user:', userId)
    
    // 🚀 OTTIMIZZAZIONE: Query parallele lato server invece di chiamate HTTP
    const [
      accounts,
      dcaPortfoliosRaw,
      cryptoPortfoliosRaw,
      budgetsResponse,
      recentTransactions,
      partitaIVAStats,
      nonCurrentAssets,
      credits,
      btcPrice
    ] = await Promise.all([
      // Accounts
      prisma.account.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
          isDefault: true
        }
      }),
      
      // DCA Portfolios - direct database query
      prisma.dCAPortfolio.findMany({
        where: { userId },
        include: {
          account: {
            select: { id: true, name: true, balance: true }
          },
          transactions: {
            orderBy: { date: 'desc' }
          },
          networkFees: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Crypto Portfolios - direct database query
      prisma.cryptoPortfolio.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          account: {
            select: { id: true, name: true, balance: true }
          },
          holdings: {
            select: {
              id: true,
              quantity: true,
              avgPrice: true,
              totalInvested: true,
              realizedGains: true,
              asset: {
                select: { id: true, symbol: true, name: true, decimals: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Budgets - Fetch raw budgets, we'll calculate allocations later
      prisma.budget.findMany({
        where: { userId },
        orderBy: { order: 'asc' }
      }),
      
      // Recent transactions (only 5)
      prisma.transaction.findMany({
        where: { userId },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, type: true, color: true } }
        },
        orderBy: { date: 'desc' },
        take: 5
      }),
      
      // Partita IVA stats - safely handle missing tables
      Promise.resolve(null).then(async () => {
        try {
          // Check if tables exist by trying a simple query first
          const testQuery = await prisma.$queryRaw`SELECT 1 FROM "partita_iva_incomes" LIMIT 1`;
          
          const [incomeAgg, paymentAgg] = await Promise.all([
            prisma.partitaIVAIncome.aggregate({
              where: { userId },
              _sum: {
                entrata: true,
                imponibile: true,
                imposta: true,
                contributi: true,
                totaleTasse: true
              },
              _count: { id: true }
            }),
            prisma.partitaIVATaxPayment.aggregate({
              where: { userId },
              _sum: { importo: true },
              _count: { id: true }
            })
          ]);
          
          const totaleTasseDovute = incomeAgg._sum.totaleTasse || 0
          const totaleTassePagate = paymentAgg._sum.importo || 0
          const saldoTasse = totaleTasseDovute - totaleTassePagate
          
          return {
            totali: {
              entrate: incomeAgg._sum.entrata || 0,
              imponibile: incomeAgg._sum.imponibile || 0,
              imposta: incomeAgg._sum.imposta || 0,
              contributi: incomeAgg._sum.contributi || 0,
              tasseDovute: totaleTasseDovute,
              tassePagate: totaleTassePagate,
              saldoTasse: saldoTasse,
              percentualeTasse: (incomeAgg._sum.entrata || 0) > 0 ? 
                (totaleTasseDovute / (incomeAgg._sum.entrata || 1)) * 100 : 0
            },
            conteggi: {
              numeroFatture: incomeAgg._count.id || 0,
              numeroPagamenti: paymentAgg._count.id || 0,
              anniAttivi: 0
            },
            riepilogo: {
              haEntrate: (incomeAgg._count.id || 0) > 0,
              haPagamenti: (paymentAgg._count.id || 0) > 0,
              inRegola: saldoTasse <= 0,
              importoDaRiservare: Math.max(0, saldoTasse)
            }
          }
        } catch (error) {
          console.log('PartitaIVA tables not found, skipping...');
          return null;
        }
      }),
      
      // Non current assets - safely handle missing tables
      prisma.nonCurrentAsset.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          value: true
        }
      }).catch(() => []),
      
      // Credits - safely handle missing tables  
      prisma.credit.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          amount: true
        }
      }).catch(() => []),
      
      // Bitcoin price for DCA calculations
      (async () => {
        try {
          // Try to fetch bitcoin price from cache or external API
          // For now, we'll return null and handle it gracefully
          return null
        } catch (error) {
          console.error('Error fetching Bitcoin price:', error)
          return null
        }
      })()
    ])

    // 🎯 Process DCA Portfolios with Enhanced Statistics
    const dcaPortfolios = dcaPortfoliosRaw.map(portfolio => {
      const enhancedStats = calculateDCAEnhancedStats(portfolio.transactions)

      // Fee calculations
      const totalFeesSats = portfolio.networkFees.reduce((sum: number, fee: any) => sum + fee.sats, 0)
      const totalFeesBTC = totalFeesSats / 100000000

      // Net BTC (after fees)
      const netBTC = Math.max(0, enhancedStats.totalBTC - totalFeesBTC)

      // Average purchase price calculation
      const avgPurchasePrice = enhancedStats.totalInvested > 0 && netBTC > 0 ?
        enhancedStats.totalInvested / netBTC : 0

      const finalStats = {
        ...enhancedStats,
        totalFeesSats,
        totalFeesBTC,
        netBTC,
        avgPurchasePrice,
        feesCount: portfolio.networkFees.length
      }

      return {
        ...portfolio,
        type: 'dca_bitcoin',
        stats: finalStats
      }
    })

    // 🎯 Process Crypto Portfolios with Enhanced Statistics
    // First, fetch crypto transactions for portfolios that have holdings
    const cryptoPortfolioIds = cryptoPortfoliosRaw.filter(p => p.holdings.length > 0).map(p => p.id)
    const cryptoTransactions = cryptoPortfolioIds.length > 0 ? await prisma.cryptoPortfolioTransaction.findMany({
      where: { portfolioId: { in: cryptoPortfolioIds } },
      select: {
        id: true,
        portfolioId: true,
        type: true,
        quantity: true,
        eurValue: true,
        pricePerUnit: true,
        date: true,
        assetId: true
      },
      orderBy: { date: 'desc' }
    }) : []

    // Group crypto transactions by portfolio
    const cryptoTransactionGroups = cryptoTransactions.reduce((acc, tx) => {
      if (!acc[tx.portfolioId]) acc[tx.portfolioId] = []
      acc[tx.portfolioId].push(tx)
      return acc
    }, {} as Record<number, typeof cryptoTransactions>)

    const cryptoPortfolios = cryptoPortfoliosRaw.map(portfolio => {
      const portfolioTransactions = cryptoTransactionGroups[portfolio.id] || []
      const enhancedStats = calculateCryptoEnhancedStats(portfolioTransactions)

      // Calculate total value using avgPrice from holdings (current prices would require API call)
      let totalValueEur = 0
      const holdingsWithValue = portfolio.holdings.map(holding => {
        const valueEur = holding.quantity * holding.avgPrice
        totalValueEur += valueEur
        return {
          ...holding,
          valueEur,
          currentPrice: holding.avgPrice // Using avgPrice as fallback
        }
      })

      // Calculate unrealized gains and ROI
      const unrealizedGains = totalValueEur - enhancedStats.effectiveInvestment
      const totalROI = enhancedStats.totalInvested > 0 ?
        ((enhancedStats.realizedProfit + unrealizedGains) / enhancedStats.totalInvested) * 100 : 0

      const finalStats = {
        ...enhancedStats,
        totalValueEur,
        unrealizedGains,
        totalROI,
        holdingsCount: portfolio.holdings.length
      }

      return {
        ...portfolio,
        accountId: portfolio.account.id,
        type: 'crypto_wallet',
        holdings: holdingsWithValue,
        stats: finalStats
      }
    })

    // 🎯 Fetch current prices for crypto portfolios to align with individual APIs
    const allCryptoSymbols = new Set<string>()
    cryptoPortfolios.forEach(portfolio => {
      portfolio.holdings.forEach(holding => {
        allCryptoSymbols.add(holding.asset.symbol.toUpperCase())
      })
    })

    let cryptoCurrentPrices: Record<string, number> = {}
    
    if (allCryptoSymbols.size > 0) {
      try {
        const { fetchCryptoPrices } = await import('@/lib/cryptoPrices')
        const symbolsArray = Array.from(allCryptoSymbols)
        const cryptoPricesResult = await fetchCryptoPrices(symbolsArray, userId, false)
        cryptoCurrentPrices = cryptoPricesResult.prices || {}
        console.log('✅ Dashboard crypto prices fetched:', Object.keys(cryptoCurrentPrices).length, 'symbols')
      } catch (error) {
        console.warn('⚠️ Dashboard error fetching crypto prices, using avgPrice fallback:', error)
      }
    }

    // 🎯 Recalculate crypto portfolios with current prices for accurate dashboard totals
    const cryptoPortfoliosWithCurrentPrices = cryptoPortfolios.map(portfolio => {
      let totalValueEur = 0
      const holdingsWithCurrentPrices = portfolio.holdings.map(holding => {
        const currentPrice = cryptoCurrentPrices[holding.asset.symbol.toUpperCase()] || holding.avgPrice
        const valueEur = holding.quantity * currentPrice
        totalValueEur += valueEur
        return {
          ...holding,
          valueEur,
          currentPrice
        }
      })

      // Update stats with current value
      const updatedStats = {
        ...portfolio.stats,
        totalValueEur,
        unrealizedGains: totalValueEur - portfolio.stats.effectiveInvestment,
        totalROI: portfolio.stats.totalInvested > 0 ?
          ((portfolio.stats.realizedProfit + (totalValueEur - portfolio.stats.effectiveInvestment)) / portfolio.stats.totalInvested) * 100 : 0
      }

      return {
        ...portfolio,
        holdings: holdingsWithCurrentPrices,
        stats: updatedStats
      }
    })

    // 📊 Calculate totals server-side
    const bankLiquidity = accounts
      .filter(account => account.type === 'bank')
      .reduce((sum, account) => sum + account.balance, 0)

    const investmentLiquidity = accounts
      .filter(account => account.type === 'investment')
      .reduce((sum, account) => sum + account.balance, 0)

    const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, asset) => sum + asset.value, 0)
    const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0)

    // 📊 Calculate portfolio values and Enhanced Cash Flow
    console.log('🔍 DCA Portfolios found:', dcaPortfolios.length)
    console.log('🔍 Crypto Portfolios found:', cryptoPortfolios.length)
    console.log('💰 Bitcoin price available:', btcPrice?.btcPrice || 'NOT AVAILABLE')
    
    // Calculate Enhanced Cash Flow totals from all portfolios (use updated crypto portfolios with current prices)
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfoliosWithCurrentPrices]
    
    const enhancedCashFlow = allPortfolios.length > 0 ? {
      totalInvested: allPortfolios.reduce((sum, p) => {
        const value = p.stats?.totalInvested || 0
        console.log(`💰 ${p.name} totalInvested: €${value}`)
        return sum + value
      }, 0),
      capitalRecovered: allPortfolios.reduce((sum, p) => {
        const value = p.stats?.capitalRecovered || 0
        console.log(`🔄 ${p.name} capitalRecovered: €${value}`)
        return sum + value
      }, 0),
      effectiveInvestment: allPortfolios.reduce((sum, p) => {
        const value = p.stats?.effectiveInvestment || 0
        console.log(`⚠️ ${p.name} effectiveInvestment: €${value}`)
        return sum + value
      }, 0),
      realizedProfit: allPortfolios.reduce((sum, p) => {
        const value = p.stats?.realizedProfit || 0
        console.log(`🎯 ${p.name} realizedProfit: €${value}`)
        return sum + value
      }, 0),
      totalValueEur: allPortfolios.reduce((sum, p) => {
        let value = 0
        if (p.type === 'crypto_wallet') {
          value = (p.stats as any)?.totalValueEur || 0
          console.log(`💎 ${p.name} (crypto_wallet) has totalValueEur: €${value}`)
        } else if (p.type === 'dca_bitcoin' && btcPrice?.btcPrice) {
          // For now, we'll skip BTC price calculation since btcPrice is null
          // This will be handled by the frontend with real-time BTC price
          value = 0
          console.log(`⚠️ ${p.name} (dca_bitcoin) - Bitcoin price calculation skipped in dashboard API`)
        } else if (p.type === 'dca_bitcoin') {
          console.log(`⚠️ ${p.name} (dca_bitcoin) - Bitcoin price NOT available!`)
        }
        console.log(`💎 ${p.name} (${p.type}) final currentValue: €${value}`)
        return sum + value
      }, 0),
      netBTC: allPortfolios.reduce((sum, p) => {
        if (p.type === 'dca_bitcoin') {
          const value = (p.stats as any)?.netBTC || 0
          if (value > 0) console.log(`₿ ${p.name} netBTC: ${value}`)
          return sum + value
        }
        return sum
      }, 0),
      // Aggiungi flag per indicare se ha recuperato tutto
      isFullyRecovered: allPortfolios.length > 0 && allPortfolios.every(p => p.stats?.isFullyRecovered || false)
    } : null

    console.log('📊 Enhanced Cash Flow Totals:', enhancedCashFlow)

    // Budget calculations - FIX: Calculate allocated amounts for each budget
    const totalBudgetTarget = budgetsResponse.reduce((sum, budget) => sum + budget.targetAmount, 0)
    
    // Calculate budget allocation using same logic as budgets API
    const totalLiquidityForBudgets = bankLiquidity + investmentLiquidity  // Include investment accounts
    let remainingAmount = totalLiquidityForBudgets
    let actualTotalAllocated = 0
    
    // Process budgets and add allocatedAmount to each
    const allocatedBudgets = []
    
    // First pass: allocate fixed budgets in order
    for (const budget of budgetsResponse.filter(b => b.type === 'fixed')) {
      const allocated = Math.min(budget.targetAmount, remainingAmount)
      remainingAmount -= allocated
      actualTotalAllocated += allocated
      
      allocatedBudgets.push({
        ...budget,
        allocatedAmount: allocated,
        percentage: budget.targetAmount > 0 ? (allocated / budget.targetAmount) * 100 : 0,
        isDeficit: allocated < budget.targetAmount
      })
    }
    
    // Second pass: allocate unlimited budgets
    const unlimitedBudgets = budgetsResponse.filter(b => b.type === 'unlimited')
    if (unlimitedBudgets.length > 0) {
      const amountPerUnlimited = remainingAmount / unlimitedBudgets.length
      
      for (const budget of unlimitedBudgets) {
        allocatedBudgets.push({
          ...budget,
          allocatedAmount: amountPerUnlimited,
          percentage: 100, // Unlimited budgets are always "complete"
          isDeficit: false
        })
        actualTotalAllocated += amountPerUnlimited
      }
    }
    
    const totalBudgetAllocated = actualTotalAllocated

    const dashboardData = {
      accounts,
      portfolios: {
        dca: dcaPortfolios,
        crypto: cryptoPortfoliosWithCurrentPrices
      },
      budgets: allocatedBudgets, // Use budgets with calculated allocations
      transactions: recentTransactions,
      partitaIVA: partitaIVAStats,
      nonCurrentAssets,
      credits,
      enhancedCashFlow,
      totals: {
        bankLiquidity,
        investmentLiquidity,
        totalNonCurrentAssets,
        totalCredits,
        // FIX: Include holdings value nel patrimonio totale
        totalPatrimony: bankLiquidity + investmentLiquidity + (enhancedCashFlow?.totalValueEur || 0) + totalNonCurrentAssets + totalCredits,
        budgetAllocated: totalBudgetAllocated,
        budgetRemaining: bankLiquidity - totalBudgetAllocated,
        // Aggiungi valore holdings per compatibilità con frontend
        holdingsValue: enhancedCashFlow?.totalValueEur || 0
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId,
        queriesExecuted: 8 // Number of parallel queries
      }
    }

    console.log('✅ Dashboard unified data fetched successfully')
    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('💥 Dashboard API error:', error)
    return NextResponse.json(
      { 
        error: 'Errore nel caricamento dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}