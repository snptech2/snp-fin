// src/app/api/dca-transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Aggiorna transazione DCA
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { date, broker, info, btcQuantity, eurPaid, notes } = await request.json()

    // Validazioni
    if (!broker || !info || !btcQuantity || !eurPaid) {
      return NextResponse.json(
        { error: 'Campi obbligatori: broker, info, btcQuantity, eurPaid' },
        { status: 400 }
      )
    }

    if (btcQuantity <= 0 || eurPaid <= 0) {
      return NextResponse.json(
        { error: 'Quantità BTC e Euro pagati devono essere maggiori di zero' },
        { status: 400 }
      )
    }

    // Recupera transazione esistente con portfolio e account
    const existingTransaction = await prisma.dCATransaction.findFirst({
      where: { 
        id,
        portfolio: { userId: 1 }
      },
      include: {
        portfolio: {
          include: {
            account: true
          }
        }
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    if (!existingTransaction.portfolio.account) {
      return NextResponse.json(
        { error: 'Portfolio non ha un conto di investimento collegato' },
        { status: 400 }
      )
    }

    // Calcola la differenza di importo
    const newAmount = parseFloat(eurPaid)
    const oldAmount = existingTransaction.eurPaid
    const difference = newAmount - oldAmount

    // Se l'importo è aumentato, controlla se c'è liquidità sufficiente
    if (difference > 0) {
      if (existingTransaction.portfolio.account.balance < difference) {
        return NextResponse.json(
          { 
            error: 'Liquidità insufficiente per l\'aumento',
            currentBalance: existingTransaction.portfolio.account.balance,
            required: difference,
            deficit: difference - existingTransaction.portfolio.account.balance,
            accountName: existingTransaction.portfolio.account.name
          },
          { status: 400 }
        )
      }
    }

    // Aggiorna transazione e saldo in una transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna la transazione
      const updatedTransaction = await tx.dCATransaction.update({
        where: { id },
        data: {
          date: date ? new Date(date) : existingTransaction.date,
          broker: broker.trim(),
          info: info.trim(),
          btcQuantity: parseFloat(btcQuantity),
          eurPaid: newAmount,
          notes: notes?.trim() || null
        },
        include: {
          portfolio: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Se c'è una differenza, aggiorna il saldo
      if (difference !== 0) {
        await tx.account.update({
          where: { id: existingTransaction.portfolio.account.id },
          data: { balance: { decrement: difference } }
        })
      }

      return updatedTransaction
    })

    // Aggiungi prezzo di acquisto calcolato
    const transactionWithPrice = {
      ...result,
      purchasePrice: result.eurPaid / result.btcQuantity
    }

    return NextResponse.json(transactionWithPrice)
  } catch (error) {
    console.error('Errore nell\'aggiornamento transazione DCA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento transazione DCA' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella transazione DCA
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID transazione non valido' },
        { status: 400 }
      )
    }

    // Recupera transazione con account collegato
    const existingTransaction = await prisma.dCATransaction.findFirst({
      where: { 
        id,
        portfolio: { userId: 1 }
      },
      include: {
        portfolio: {
          include: {
            account: true
          }
        }
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Cancella transazione e ripristina saldo in una transazione atomica
    await prisma.$transaction(async (tx) => {
      // Se c'è un account collegato, ripristina il saldo
      if (existingTransaction.portfolio.account) {
        await tx.account.update({
          where: { id: existingTransaction.portfolio.account.id },
          data: { balance: { increment: existingTransaction.eurPaid } }
        })
      }

      // Cancella la transazione
      await tx.dCATransaction.delete({
        where: { id }
      })
    })

    return NextResponse.json({ 
      message: 'Transazione cancellata con successo',
      refundedAmount: existingTransaction.eurPaid,
      accountName: existingTransaction.portfolio.account?.name || 'Nessun conto collegato'
    })
  } catch (error) {
    console.error('Errore nella cancellazione transazione DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione transazione DCA' },
      { status: 500 }
    )
  }
}