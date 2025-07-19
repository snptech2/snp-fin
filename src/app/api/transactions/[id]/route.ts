// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

// GET - Dettagli singola transazione
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const resolvedParams = await context.params
    const transactionId = parseInt(resolvedParams.id)

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      },
      include: {
        account: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, type: true }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Errore nel recupero transazione:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero della transazione' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna transazione
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const resolvedParams = await context.params
    const transactionId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { description, amount, date, accountId, categoryId, type } = body

    // Validazione
    if (!amount || !accountId || !categoryId || !type) {
      return NextResponse.json(
        { error: 'Amount, accountId, categoryId e type sono obbligatori' },
        { status: 400 }
      )
    }

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json(
        { error: 'Il tipo deve essere "income" o "expense"' },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Importo deve essere un numero positivo' },
        { status: 400 }
      )
    }

    // Recupera transazione esistente
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Verifica che account e categoria esistano e appartengano all'utente
    const [account, category] = await Promise.all([
      prisma.account.findFirst({
        where: { id: parseInt(accountId), userId }
      }),
      prisma.category.findFirst({
        where: { id: parseInt(categoryId), userId, type }
      })
    ])

    if (!account) {
      return NextResponse.json(
        { error: 'Conto non trovato' },
        { status: 404 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria non trovata o tipo non corrispondente' },
        { status: 404 }
      )
    }

    // Aggiorna transazione e saldi in una transazione DB
    const result = await prisma.$transaction(async (tx) => {
      // Revert old balance change
      const oldBalanceChange = existingTransaction.type === 'income' 
        ? -existingTransaction.amount 
        : existingTransaction.amount

      await tx.account.update({
        where: { id: existingTransaction.accountId },
        data: { balance: { increment: oldBalanceChange } }
      })

      // Apply new balance change
      const newBalanceChange = type === 'income' ? parsedAmount : -parsedAmount

      await tx.account.update({
        where: { id: parseInt(accountId) },
        data: { balance: { increment: newBalanceChange } }
      })

      // Update transaction
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          description: description || null,
          amount: parsedAmount,
          date: date ? new Date(date) : existingTransaction.date,
          type,
          accountId: parseInt(accountId),
          categoryId: parseInt(categoryId)
        },
        include: {
          account: {
            select: { id: true, name: true }
          },
          category: {
            select: { id: true, name: true, type: true, color: true }
          }
        }
      })

      return updatedTransaction
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Errore nell\'aggiornamento transazione:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della transazione' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella transazione
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const resolvedParams = await context.params
    const transactionId = parseInt(resolvedParams.id)

    // Recupera transazione esistente con relazione transferGain
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      },
      include: {
        transferGain: true
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }
    
    // Se la transazione è collegata a un trasferimento, cancelleremo anche quello
    const hasLinkedTransfer = existingTransaction.transferGain !== null

    // Cancella transazione e aggiorna saldo in una transazione DB
    await prisma.$transaction(async (tx) => {
      // Se c'è un trasferimento collegato, cancellalo prima
      if (hasLinkedTransfer && existingTransaction.transferGain) {
        const transfer = existingTransaction.transferGain
        
        // Calcola l'investimento originale completo: trasferimento + guadagni
        const originalInvestment = transfer.amount + existingTransaction.amount
        
        // Ripristina i saldi del trasferimento
        // FROM account: ripristina l'investimento originale completo
        await tx.account.update({
          where: { id: transfer.fromAccountId },
          data: { balance: { increment: originalInvestment } }
        })
        
        // TO account: rimuovi solo il capitale trasferito (i guadagni li rimuoviamo sotto)
        await tx.account.update({
          where: { id: transfer.toAccountId },
          data: { balance: { decrement: transfer.amount } }
        })
        
        // Cancella il trasferimento
        await tx.transfer.delete({
          where: { id: transfer.id }
        })
      }
      
      // Revert balance change della transazione
      const balanceChange = existingTransaction.type === 'income' 
        ? -existingTransaction.amount 
        : existingTransaction.amount

      await tx.account.update({
        where: { id: existingTransaction.accountId },
        data: { balance: { increment: balanceChange } }
      })

      // Delete transaction
      await tx.transaction.delete({
        where: { id: transactionId }
      })
    })

    return NextResponse.json({ 
      success: true,
      linkedTransferDeleted: hasLinkedTransfer 
    })
  } catch (error) {
    console.error('Errore nella cancellazione transazione:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della transazione' },
      { status: 500 }
    )
  }
}