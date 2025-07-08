// src/app/api/dashboard/route.ts - API unificata per dashboard performance
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

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
      credits
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
      
      // DCA Portfolios
      prisma.dCAPortfolio.findMany({
        where: { userId, isActive: true },
        include: {
          account: { select: { id: true, name: true, balance: true } },
          transactions: {
            orderBy: { date: 'desc' },
            select: {
              id: true,
              date: true,
              type: true,
              btcQuantity: true,
              eurPaid: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Crypto Portfolios - ottimizzato
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
      
      // Budgets
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
      }).catch(() => [])
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

    // Budget calculations
    const totalBudgetTarget = budgetsResponse.reduce((sum, budget) => sum + budget.targetAmount, 0)
    const totalBudgetAllocated = Math.min(bankLiquidity, totalBudgetTarget)

    const dashboardData = {
      accounts,
      portfolios: {
        dca: dcaPortfolios,
        crypto: cryptoPortfolios
      },
      budgets: budgetsResponse,
      transactions: recentTransactions,
      partitaIVA: partitaIVAStats,
      nonCurrentAssets,
      credits,
      totals: {
        bankLiquidity,
        investmentLiquidity,
        totalNonCurrentAssets,
        totalCredits,
        totalPatrimony: bankLiquidity + investmentLiquidity + totalNonCurrentAssets + totalCredits,
        budgetAllocated: totalBudgetAllocated,
        budgetRemaining: bankLiquidity - totalBudgetAllocated
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