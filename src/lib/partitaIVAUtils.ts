import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function updateRiservaTasseBudget(userId: number, tx?: any) {
  const client = tx || prisma
  
  try {
    // Calcola il totale tasse dovute per tutti gli anni
    const incomes = await client.partitaIVAIncome.findMany({
      where: { userId }
    })
    
    const payments = await client.partitaIVATaxPayment.findMany({
      where: { userId }
    })
    
    const totaleTasseDovute = incomes.reduce((sum: number, income: any) => sum + income.totaleTasse, 0)
    const totaleTassePagate = payments.reduce((sum: number, payment: any) => sum + payment.importo, 0)
    const saldoTasse = Math.max(0, totaleTasseDovute - totaleTassePagate)
    
    // Cerca il budget "RISERVA TASSE" o "Riserva Tasse" (case insensitive)
    let riservaTasseBudget = await client.budget.findFirst({
      where: {
        name: {
          in: ['RISERVA TASSE', 'Riserva Tasse']
        },
        userId
      }
    })
    
    // Se non ci sono entrate P.IVA, rimuovi il budget se esiste
    if (incomes.length === 0) {
      if (riservaTasseBudget) {
        // Shifta le priorità verso il basso per riempire il gap
        await client.budget.updateMany({
          where: {
            userId,
            order: { gt: riservaTasseBudget.order }
          },
          data: {
            order: { decrement: 1 }
          }
        })
        
        // Elimina il budget
        await client.budget.delete({
          where: { id: riservaTasseBudget.id }
        })
      }
      return null
    }
    
    // Se ci sono entrate P.IVA ma non esiste il budget, crealo
    if (!riservaTasseBudget) {
      // Shifta tutte le priorità esistenti di +1
      await client.budget.updateMany({
        where: { userId },
        data: {
          order: { increment: 1 }
        }
      })
      
      // Crea il budget con priorità 1
      riservaTasseBudget = await client.budget.create({
        data: {
          name: 'Riserva Tasse',
          targetAmount: saldoTasse,
          type: 'fixed',
          order: 1,
          color: '#EF4444', // Rosso per indicare tasse
          userId
        }
      })
    } else {
      // Se esiste, aggiorna solo il target amount
      await client.budget.update({
        where: { id: riservaTasseBudget.id },
        data: {
          targetAmount: saldoTasse
        }
      })
    }
    
    return riservaTasseBudget
  } catch (error) {
    console.error('Errore nell\'aggiornamento budget RISERVA TASSE:', error)
    throw error
  }
}

export async function calculatePartitaIVAStats(userId: number, anno?: number) {
  try {
    const currentYear = anno || new Date().getFullYear()
    
    // Ottieni entrate per l'anno specificato
    const incomes = await prisma.partitaIVAIncome.findMany({
      where: {
        userId,
        config: {
          anno: currentYear
        }
      }
    })
    
    // Ottieni pagamenti per l'anno specificato
    const payments = await prisma.partitaIVATaxPayment.findMany({
      where: {
        userId,
        data: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`)
        }
      }
    })
    
    const totaleEntrate = incomes.reduce((sum, income) => sum + income.entrata, 0)
    const totaleTasseDovute = incomes.reduce((sum: number, income: any) => sum + income.totaleTasse, 0)
    const totaleTassePagate = payments.reduce((sum: number, payment: any) => sum + payment.importo, 0)
    const saldoTasse = Math.max(0, totaleTasseDovute - totaleTassePagate)
    
    return {
      anno: currentYear,
      totaleEntrate,
      totaleTasseDovute,
      totaleTassePagate,
      saldoTasse,
      numeroFatture: incomes.length,
      numeroPagamenti: payments.length,
      percentualeTasse: totaleEntrate > 0 ? (totaleTasseDovute / totaleEntrate) * 100 : 0
    }
  } catch (error) {
    console.error('Errore nel calcolo statistiche P.IVA:', error)
    throw error
  }
}