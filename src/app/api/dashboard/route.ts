// src/app/api/dashboard/route.ts - API unificata per dashboard performance
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// Helper function to fetch DCA portfolios with calculated stats
async function fetchDCAPortfoliosInternal(request: NextRequest) {
  try {
    // Build internal API URL 
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/dca-portfolios`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0',
        'Cookie': request.headers.get('cookie') || '',
      },
      cache: 'no-store'
    })
    
    if (response.ok) {
      return await response.json()
    } else {
      console.error('Failed to fetch DCA portfolios:', response.status)
      return []
    }
  } catch (error) {
    console.error('Error fetching DCA portfolios:', error)
    return []
  }
}

// Helper function to fetch Crypto portfolios with calculated stats
async function fetchCryptoPortfoliosInternal(request: NextRequest) {
  try {
    // Build internal API URL 
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/crypto-portfolios`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0',
        'Cookie': request.headers.get('cookie') || '',
      },
      cache: 'no-store'
    })
    
    if (response.ok) {
      return await response.json()
    } else {
      console.error('Failed to fetch crypto portfolios:', response.status)
      return []
    }
  } catch (error) {
    console.error('Error fetching crypto portfolios:', error)
    return []
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
      dcaPortfolios,
      cryptoPortfolios,
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
      
      // DCA Portfolios - fetch from API to get calculated stats
      fetchDCAPortfoliosInternal(request),
      
      // Crypto Portfolios - fetch from API to get calculated stats
      fetchCryptoPortfoliosInternal(request),
      
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
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const response = await fetch(`${baseUrl}/api/bitcoin-price`, {
            method: 'GET',
            headers: {
              'User-Agent': 'SNP-Finance-App/1.0',
              'Cookie': request.headers.get('cookie') || '',
            },
            cache: 'no-store'
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('₿ Bitcoin price fetched:', data.btcPrice)
            return data
          } else {
            console.error('Failed to fetch Bitcoin price:', response.status)
            return null
          }
        } catch (error) {
          console.error('Error fetching Bitcoin price:', error)
          return null
        }
      })()
    ])

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
    
    // Calculate Enhanced Cash Flow totals from all portfolios
    const allPortfolios = [...(dcaPortfolios || []), ...(cryptoPortfolios || [])]
    
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
          value = p.stats?.totalValueEur || 0
          console.log(`💎 ${p.name} (crypto_wallet) has totalValueEur: €${p.stats?.totalValueEur}`)
        } else if (p.type === 'dca_bitcoin' && btcPrice?.btcPrice) {
          // Calcola valore DCA usando prezzo Bitcoin corrente
          const netBTC = p.stats?.netBTC || 0
          value = netBTC * btcPrice.btcPrice
          console.log(`💎 ${p.name} (dca_bitcoin) netBTC: ${netBTC} × €${btcPrice.btcPrice} = €${value}`)
        } else if (p.type === 'dca_bitcoin') {
          console.log(`⚠️ ${p.name} (dca_bitcoin) - Bitcoin price NOT available!`)
        }
        console.log(`💎 ${p.name} (${p.type}) final currentValue: €${value}`)
        return sum + value
      }, 0),
      netBTC: allPortfolios.reduce((sum, p) => {
        const value = p.stats?.netBTC || 0
        if (value > 0) console.log(`₿ ${p.name} netBTC: ${value}`)
        return sum + value
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
        crypto: cryptoPortfolios
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