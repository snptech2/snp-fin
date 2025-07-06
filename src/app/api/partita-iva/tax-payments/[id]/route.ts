import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRiservaTasseBudget } from '@/lib/partitaIVAUtils'

const prisma = new PrismaClient()

// PUT - Modifica pagamento tasse
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const paymentId = parseInt(params.id)
    const body = await request.json()
    const { data, descrizione, importo, tipo, accountId } = body
    
    // Validazione
    if (!data || !descrizione || !importo) {
      return NextResponse.json(
        { error: 'Data, descrizione e importo sono obbligatori' },
        { status: 400 }
      )
    }
    
    const importoPagamento = parseFloat(importo)
    if (isNaN(importoPagamento) || importoPagamento <= 0) {
      return NextResponse.json(
        { error: 'L\'importo deve essere un numero positivo' },
        { status: 400 }
      )
    }
    
    // Verifica che il pagamento esista e appartenga all'utente
    const existingPayment = await prisma.partitaIVATaxPayment.findFirst({
      where: { id: paymentId, userId },
      include: { account: true }
    })
    
    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Pagamento non trovato' },
        { status: 404 }
      )
    }
    
    // Verifica account se specificato
    let account = null
    if (accountId) {
      account = await prisma.account.findFirst({
        where: { id: parseInt(accountId), userId, type: 'bank' }
      })
      
      if (!account) {
        return NextResponse.json(
          { error: 'Conto bancario non trovato' },
          { status: 404 }
        )
      }
    }
    
    // Aggiorna pagamento e saldi in transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // Se il conto è cambiato, aggiusta i saldi
      if (existingPayment.accountId !== (accountId ? parseInt(accountId) : null)) {
        // Rimuovi dal conto vecchio (ri-aggiungi l'importo)
        if (existingPayment.accountId) {
          await tx.account.update({
            where: { id: existingPayment.accountId },
            data: { balance: { increment: existingPayment.importo } }
          })
          
          // Rimuovi la transazione vecchia
          await tx.transaction.deleteMany({
            where: {
              description: `Tasse - ${existingPayment.descrizione}`,
              accountId: existingPayment.accountId,
              amount: existingPayment.importo,
              type: 'expense',
              userId
            }
          })
        }
        
        // Sottrai dal conto nuovo
        if (account) {
          await tx.account.update({
            where: { id: account.id },
            data: { balance: { decrement: importoPagamento } }
          })
          
          // Trova o crea categoria speciale
          let category = await tx.category.findFirst({
            where: { name: 'Tasse Partita IVA', userId, type: 'expense' }
          })
          
          if (!category) {
            category = await tx.category.create({
              data: {
                name: 'Tasse Partita IVA',
                type: 'expense',
                color: '#EF4444',
                userId
              }
            })
          }
          
          // Crea nuova transazione
          await tx.transaction.create({
            data: {
              description: `Tasse - ${descrizione}`,
              amount: importoPagamento,
              date: new Date(data),
              type: 'expense',
              accountId: account.id,
              categoryId: category.id,
              userId
            }
          })
        }
      } else if (existingPayment.accountId) {
        // Stesso conto, aggiorna solo la differenza
        const differenza = importoPagamento - existingPayment.importo
        if (differenza !== 0) {
          await tx.account.update({
            where: { id: existingPayment.accountId },
            data: { balance: { decrement: differenza } }
          })
          
          // Aggiorna la transazione esistente
          await tx.transaction.updateMany({
            where: {
              description: `Tasse - ${existingPayment.descrizione}`,
              accountId: existingPayment.accountId,
              amount: existingPayment.importo,
              type: 'expense',
              userId
            },
            data: {
              description: `Tasse - ${descrizione}`,
              amount: importoPagamento,
              date: new Date(data)
            }
          })
        }
      }
      
      // Aggiorna il pagamento
      const payment = await tx.partitaIVATaxPayment.update({
        where: { id: paymentId },
        data: {
          data: new Date(data),
          descrizione,
          importo: importoPagamento,
          tipo: tipo || 'generico',
          accountId: accountId ? parseInt(accountId) : null
        },
        include: {
          account: {
            select: { id: true, name: true }
          }
        }
      })
      
      // Aggiorna budget RISERVA TASSE
      await updateRiservaTasseBudget(userId, tx)
      
      return payment
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Errore nella modifica pagamento tasse:', error)
    return NextResponse.json(
      { error: 'Errore nella modifica del pagamento' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina pagamento tasse
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const paymentId = parseInt(params.id)
    
    // Verifica che il pagamento esista e appartenga all'utente
    const existingPayment = await prisma.partitaIVATaxPayment.findFirst({
      where: { id: paymentId, userId },
      include: { account: true }
    })
    
    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Pagamento non trovato' },
        { status: 404 }
      )
    }
    
    // Elimina pagamento e aggiusta saldi in transazione atomica
    await prisma.$transaction(async (tx) => {
      // Se collegato a un conto, ri-aggiungi il saldo e rimuovi la transazione
      if (existingPayment.accountId) {
        await tx.account.update({
          where: { id: existingPayment.accountId },
          data: { balance: { increment: existingPayment.importo } }
        })
        
        // Rimuovi la transazione collegata
        await tx.transaction.deleteMany({
          where: {
            description: `Tasse - ${existingPayment.descrizione}`,
            accountId: existingPayment.accountId,
            amount: existingPayment.importo,
            type: 'expense',
            userId
          }
        })
      }
      
      // Elimina il pagamento
      await tx.partitaIVATaxPayment.delete({
        where: { id: paymentId }
      })
      
      // Aggiorna budget RISERVA TASSE
      await updateRiservaTasseBudget(userId, tx)
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nell\'eliminazione pagamento tasse:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione del pagamento' },
      { status: 500 }
    )
  }
}