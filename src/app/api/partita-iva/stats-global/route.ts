import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Statistiche P.IVA globali (tutti gli anni)
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    // 🚀 OTTIMIZZAZIONE: Calcoli SQL invece di JavaScript
    const [incomeAggregates, paymentAggregates] = await Promise.all([
      prisma.partitaIVAIncome.aggregate({
        where: { userId },
        _sum: {
          entrata: true,
          imponibile: true,
          imposta: true,
          contributi: true,
          totaleTasse: true
        },
        _count: {
          id: true
        }
      }),
      prisma.partitaIVATaxPayment.aggregate({
        where: { userId },
        _sum: {
          importo: true
        },
        _count: {
          id: true
        }
      })
    ])
    
    const totaleEntrate = incomeAggregates._sum.entrata || 0
    const totaleImponibile = incomeAggregates._sum.imponibile || 0
    const totaleImposta = incomeAggregates._sum.imposta || 0
    const totaleContributi = incomeAggregates._sum.contributi || 0
    const totaleTasseDovute = incomeAggregates._sum.totaleTasse || 0
    
    const totaleTassePagate = paymentAggregates._sum.importo || 0
    const saldoTasse = totaleTasseDovute - totaleTassePagate
    
    // 🚀 OTTIMIZZAZIONE: Query SQL per statistiche annuali
    const [incomesByYear, paymentsByYear] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          c.anno as year,
          SUM(pii.entrata) as entrate,
          SUM(pii."totaleTasse") as tasse_dovute,
          COUNT(pii.id) as numero_fatture
        FROM "partita_iva_incomes" pii
        JOIN "partita_iva_configs" c ON pii."configId" = c.id
        WHERE pii."userId" = ${userId}
        GROUP BY c.anno
        ORDER BY c.anno
      `,
      prisma.$queryRaw`
        SELECT 
          EXTRACT(YEAR FROM data) as year,
          SUM(importo) as tasse_pagate,
          COUNT(id) as numero_pagamenti
        FROM "partita_iva_tax_payments"
        WHERE "userId" = ${userId}
        GROUP BY EXTRACT(YEAR FROM data)
        ORDER BY year
      `
    ])
    
    // Converti risultati in formato più utilizzabile
    const yearlyStats = {}
    
    // Processa entrate per anno
    incomesByYear.forEach((row: any) => {
      const year = parseInt(row.year)
      yearlyStats[year] = {
        entrate: parseFloat(row.entrate) || 0,
        tasseDovute: parseFloat(row.tasse_dovute) || 0,
        tassePagate: 0,
        numeroFatture: parseInt(row.numero_fatture) || 0,
        numeroPagamenti: 0
      }
    })
    
    // Processa pagamenti per anno
    paymentsByYear.forEach((row: any) => {
      const year = parseInt(row.year)
      if (!yearlyStats[year]) {
        yearlyStats[year] = {
          entrate: 0,
          tasseDovute: 0,
          numeroFatture: 0,
          numeroPagamenti: 0
        }
      }
      yearlyStats[year].tassePagate = parseFloat(row.tasse_pagate) || 0
      yearlyStats[year].numeroPagamenti = parseInt(row.numero_pagamenti) || 0
    })
    
    const allYears = new Set([
      ...incomesByYear.map((row: any) => parseInt(row.year)),
      ...paymentsByYear.map((row: any) => parseInt(row.year))
    ])
    
    // Calcolo percentuale riservata per tasse
    const percentualeTasse = totaleEntrate > 0 ? (totaleTasseDovute / totaleEntrate) * 100 : 0
    
    const globalStats = {
      totali: {
        entrate: totaleEntrate,
        imponibile: totaleImponibile,
        imposta: totaleImposta,
        contributi: totaleContributi,
        tasseDovute: totaleTasseDovute,
        tassePagate: totaleTassePagate,
        saldoTasse: saldoTasse,
        percentualeTasse: percentualeTasse
      },
      conteggi: {
        numeroFatture: incomeAggregates._count.id || 0,
        numeroPagamenti: paymentAggregates._count.id || 0,
        anniAttivi: allYears.size
      },
      perAnno: yearlyStats,
      riepilogo: {
        haEntrate: (incomeAggregates._count.id || 0) > 0,
        haPagamenti: (paymentAggregates._count.id || 0) > 0,
        inRegola: saldoTasse <= 0,
        importoDaRiservare: Math.max(0, saldoTasse)
      }
    }
    
    return NextResponse.json(globalStats)
  } catch (error) {
    console.error('Errore nel calcolo statistiche globali P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nel calcolo delle statistiche globali' },
      { status: 500 }
    )
  }
}