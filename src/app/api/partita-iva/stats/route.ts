import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Statistiche P.IVA
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { searchParams } = new URL(request.url)
    const anno = searchParams.get('anno') || new Date().getFullYear().toString()
    
    // Ottieni tutte le entrate P.IVA per l'anno
    const incomes = await prisma.partitaIVAIncome.findMany({
      where: {
        userId,
        config: {
          anno: parseInt(anno)
        }
      },
      include: {
        config: true
      }
    })
    
    // Ottieni tutti i pagamenti tasse per l'anno
    const payments = await prisma.partitaIVATaxPayment.findMany({
      where: {
        userId,
        data: {
          gte: new Date(`${anno}-01-01`),
          lt: new Date(`${parseInt(anno) + 1}-01-01`)
        }
      }
    })
    
    // Calcoli aggregati
    const totaleEntrate = incomes.reduce((sum, income) => sum + income.entrata, 0)
    const totaleImponibile = incomes.reduce((sum, income) => sum + income.imponibile, 0)
    const totaleImposta = incomes.reduce((sum, income) => sum + income.imposta, 0)
    const totaleContributi = incomes.reduce((sum, income) => sum + income.contributi, 0)
    const totaleTasseDovute = incomes.reduce((sum, income) => sum + income.totaleTasse, 0)
    
    const totaleTassePagate = payments.reduce((sum, payment) => sum + payment.importo, 0)
    const saldoTasse = totaleTasseDovute - totaleTassePagate
    
    // Statistiche per mese
    const monthlyStats = {}
    for (let month = 1; month <= 12; month++) {
      const monthIncomes = incomes.filter(income => 
        new Date(income.dataIncasso).getMonth() + 1 === month
      )
      const monthPayments = payments.filter(payment => 
        new Date(payment.data).getMonth() + 1 === month
      )
      
      monthlyStats[month] = {
        entrate: monthIncomes.reduce((sum, income) => sum + income.entrata, 0),
        tasseDovute: monthIncomes.reduce((sum, income) => sum + income.totaleTasse, 0),
        tassePagate: monthPayments.reduce((sum, payment) => sum + payment.importo, 0),
        numeroFatture: monthIncomes.length,
        numeroPagamenti: monthPayments.length
      }
    }
    
    // Configurazione corrente per l'anno
    const config = await prisma.partitaIVAConfig.findUnique({
      where: {
        anno_userId: {
          anno: parseInt(anno),
          userId
        }
      }
    })
    
    // Calcolo percentuale riservata per tasse
    const percentualeTasse = totaleEntrate > 0 ? (totaleTasseDovute / totaleEntrate) * 100 : 0
    
    const stats = {
      anno: parseInt(anno),
      config,
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
        numeroFatture: incomes.length,
        numeroPagamenti: payments.length
      },
      mensili: monthlyStats,
      riepilogo: {
        haEntrate: incomes.length > 0,
        haPagamenti: payments.length > 0,
        inRegola: saldoTasse <= 0,
        importoDaRiservare: Math.max(0, saldoTasse)
      }
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Errore nel calcolo statistiche P.IVA:', error)
    return NextResponse.json(
      { error: 'Errore nel calcolo delle statistiche' },
      { status: 500 }
    )
  }
}