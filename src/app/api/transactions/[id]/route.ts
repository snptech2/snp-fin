// src/app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Dettagli singola transazione
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = parseInt(params.id)

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: 1
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
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = parseInt(params.id)
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
        userId: 1
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Verifica che account e categoria esistano
    const [account, category] = await Promise.all([
      prisma.account.findFirst({
        where: { id: parseInt(accountId), userId: 1 }
      }),
      prisma.category.findFirst({
        where: { id: parseInt(categoryId), userId: 1, type }
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

    // Inizia transazione database
    const result = await prisma.$transaction(async (tx) => {
      // Ripristina il saldo precedente nel conto vecchio
      const oldBalanceChange = existingTransaction.type === 'income' 
        ? -existingTransaction.amount 
        : existingTransaction.amount

      await tx.account.update({
        where: { id: existingTransaction.accountId },
        data: {
          balance: {
            increment: oldBalanceChange
          }
        }
      })

      // Aggiorna transazione
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          description: description?.trim() || null,
          amount: parsedAmount,
          date: date ? new Date(date) : existingTransaction.date,
          type,
          accountId: parseInt(accountId),
          categoryId: parseInt(categoryId),
          updatedAt: new Date()
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

      // Applica nuovo saldo al conto (potrebbe essere diverso)
      const newBalanceChange = type === 'income' ? parsedAmount : -parsedAmount
      await tx.account.update({
        where: { id: parseInt(accountId) },
        data: {
          balance: {
            increment: newBalanceChange
          },
          updatedAt: new Date()
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
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = parseInt(params.id)

    // Recupera transazione esistente
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: 1
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Inizia transazione database
    await prisma.$transaction(async (tx) => {
      // Ripristina il saldo nel conto
      const balanceChange = existingTransaction.type === 'income' 
        ? -existingTransaction.amount 
        : existingTransaction.amount

      await tx.account.update({
        where: { id: existingTransaction.accountId },
        data: {
          balance: {
            increment: balanceChange
          },
          updatedAt: new Date()
        }
      })

      // Cancella transazione
      await tx.transaction.delete({
        where: { id: transactionId }
      })
    })

    return NextResponse.json({ message: 'Transazione cancellata con successo' })
  } catch (error) {
    console.error('Errore nella cancellazione transazione:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della transazione' },
      { status: 500 }
    )
  }
}