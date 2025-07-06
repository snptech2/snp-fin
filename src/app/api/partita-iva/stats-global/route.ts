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
    
    // Ottieni tutte le entrate P.IVA per tutti gli anni
    const allIncomes = await prisma.partitaIVAIncome.findMany({
      where: { userId },
      include: { config: true }
    })
    
    // Ottieni tutti i pagamenti tasse per tutti gli anni
    const allPayments = await prisma.partitaIVATaxPayment.findMany({
      where: { userId }
    })
    
    // Calcoli aggregati globali
    const totaleEntrate = allIncomes.reduce((sum, income) => sum + income.entrata, 0)
    const totaleImponibile = allIncomes.reduce((sum, income) => sum + income.imponibile, 0)
    const totaleImposta = allIncomes.reduce((sum, income) => sum + income.imposta, 0)
    const totaleContributi = allIncomes.reduce((sum, income) => sum + income.contributi, 0)
    const totaleTasseDovute = allIncomes.reduce((sum, income) => sum + income.totaleTasse, 0)
    
    const totaleTassePagate = allPayments.reduce((sum, payment) => sum + payment.importo, 0)
    const saldoTasse = totaleTasseDovute - totaleTassePagate
    
    // Statistiche per anno
    const yearlyStats = {}
    
    // Raggruppa per anno le entrate
    const incomesByYear = allIncomes.reduce((acc, income) => {
      const year = income.config.anno
      if (!acc[year]) acc[year] = []
      acc[year].push(income)
      return acc
    }, {})
    
    // Raggruppa per anno i pagamenti
    const paymentsByYear = allPayments.reduce((acc, payment) => {
      const year = new Date(payment.data).getFullYear()
      if (!acc[year]) acc[year] = []
      acc[year].push(payment)
      return acc
    }, {})
    
    // Calcola statistiche per ogni anno
    const allYears = new Set([
      ...Object.keys(incomesByYear).map(y => parseInt(y)),
      ...Object.keys(paymentsByYear).map(y => parseInt(y))
    ])
    
    allYears.forEach(year => {
      const yearIncomes = incomesByYear[year] || []
      const yearPayments = paymentsByYear[year] || []
      
      yearlyStats[year] = {
        entrate: yearIncomes.reduce((sum, income) => sum + income.entrata, 0),
        tasseDovute: yearIncomes.reduce((sum, income) => sum + income.totaleTasse, 0),
        tassePagate: yearPayments.reduce((sum, payment) => sum + payment.importo, 0),
        numeroFatture: yearIncomes.length,
        numeroPagamenti: yearPayments.length
      }
    })
    
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
        numeroFatture: allIncomes.length,
        numeroPagamenti: allPayments.length,
        anniAttivi: allYears.size
      },
      perAnno: yearlyStats,
      riepilogo: {
        haEntrate: allIncomes.length > 0,
        haPagamenti: allPayments.length > 0,
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