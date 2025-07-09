import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// POST - Ricalcola i saldi di tutti i conti basandosi sulle transazioni
export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    console.log('🔄 Inizio ricalcolo saldi per utente:', userId)

    // Ottieni tutti i conti dell'utente
    const accounts = await prisma.account.findMany({
      where: { userId }
    })

    console.log(`📊 Trovati ${accounts.length} conti da ricalcolare`)

    const results = []

    // Ricalcola il saldo per ogni conto
    for (const account of accounts) {
      console.log(`💳 Ricalcolo saldo per conto: ${account.name} (ID: ${account.id})`)

      // Ottieni tutte le transazioni per questo conto
      const transactions = await prisma.transaction.findMany({
        where: { 
          accountId: account.id,
          userId 
        }
      })

      console.log(`  📝 Trovate ${transactions.length} transazioni`)

      // Calcola il saldo basandosi sulle transazioni
      let calculatedBalance = 0
      let incomeTotal = 0
      let expenseTotal = 0

      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          calculatedBalance += transaction.amount
          incomeTotal += transaction.amount
        } else if (transaction.type === 'expense') {
          calculatedBalance -= transaction.amount
          expenseTotal += transaction.amount
        }
      }

      // Ottieni tutti i trasferimenti che coinvolgono questo conto
      const transfersOut = await prisma.transfer.findMany({
        where: { 
          fromAccountId: account.id,
          userId 
        }
      })

      const transfersIn = await prisma.transfer.findMany({
        where: { 
          toAccountId: account.id,
          userId 
        }
      })

      console.log(`  🔄 Trovati ${transfersOut.length} trasferimenti in uscita`)
      console.log(`  🔄 Trovati ${transfersIn.length} trasferimenti in entrata`)

      // Applica i trasferimenti al saldo
      let transferOutTotal = 0
      let transferInTotal = 0

      for (const transfer of transfersOut) {
        calculatedBalance -= transfer.amount
        transferOutTotal += transfer.amount
      }

      for (const transfer of transfersIn) {
        calculatedBalance += transfer.amount
        transferInTotal += transfer.amount
      }

      // Aggiorna il saldo nel database
      const oldBalance = account.balance
      await prisma.account.update({
        where: { id: account.id },
        data: { balance: calculatedBalance }
      })

      const result = {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        oldBalance,
        newBalance: calculatedBalance,
        difference: calculatedBalance - oldBalance,
        breakdown: {
          income: incomeTotal,
          expenses: expenseTotal,
          transfersIn: transferInTotal,
          transfersOut: transferOutTotal,
          transactionCount: transactions.length,
          transferCount: transfersIn.length + transfersOut.length
        }
      }

      results.push(result)

      console.log(`  ✅ Saldo aggiornato: ${oldBalance} → ${calculatedBalance} (diff: ${calculatedBalance - oldBalance})`)
    }

    // Calcola i totali
    const summary = {
      accountsProcessed: results.length,
      totalOldBalance: results.reduce((sum, r) => sum + r.oldBalance, 0),
      totalNewBalance: results.reduce((sum, r) => sum + r.newBalance, 0),
      totalDifference: results.reduce((sum, r) => sum + r.difference, 0),
      totals: {
        income: results.reduce((sum, r) => sum + r.breakdown.income, 0),
        expenses: results.reduce((sum, r) => sum + r.breakdown.expenses, 0),
        transfersIn: results.reduce((sum, r) => sum + r.breakdown.transfersIn, 0),
        transfersOut: results.reduce((sum, r) => sum + r.breakdown.transfersOut, 0)
      }
    }

    console.log('✅ Ricalcolo completato:', summary)

    return NextResponse.json({
      success: true,
      message: 'Saldi ricalcolati con successo',
      summary,
      details: results
    })

  } catch (error) {
    console.error('💥 Errore nel ricalcolo saldi:', error)
    return NextResponse.json(
      { error: 'Errore nel ricalcolo dei saldi' },
      { status: 500 }
    )
  }
}