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
    const body = await request.json()
    const { date, broker, info, btcQuantity, eurPaid, notes } = body

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID transazione non valido' },
        { status: 400 }
      )
    }

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

    // Verifica che la transazione esista e appartenga all'utente
    const existingTransaction = await prisma.dCATransaction.findFirst({
      where: { 
        id,
        portfolio: { userId: 1 }
      },
      include: {
        portfolio: true
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    const updatedTransaction = await prisma.dCATransaction.update({
      where: { id },
      data: {
        date: date ? new Date(date) : existingTransaction.date,
        broker: broker.trim(),
        info: info.trim(),
        btcQuantity: parseFloat(btcQuantity),
        eurPaid: parseFloat(eurPaid),
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

    // Aggiungi prezzo di acquisto calcolato
    const transactionWithPrice = {
      ...updatedTransaction,
      purchasePrice: updatedTransaction.eurPaid / updatedTransaction.btcQuantity
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

    // Verifica che la transazione esista e appartenga all'utente
    const existingTransaction = await prisma.dCATransaction.findFirst({
      where: { 
        id,
        portfolio: { userId: 1 }
      },
      include: {
        portfolio: {
          select: {
            name: true
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

    await prisma.dCATransaction.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Transazione cancellata con successo',
      portfolio: existingTransaction.portfolio.name
    })
  } catch (error) {
    console.error('Errore nella cancellazione transazione DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione transazione DCA' },
      { status: 500 }
    )
  }
}