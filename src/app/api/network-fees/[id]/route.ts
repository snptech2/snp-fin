// src/app/api/network-fees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Aggiorna fee di rete
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { sats, date, description } = body

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID fee non valido' },
        { status: 400 }
      )
    }

    // Validazioni
    if (!sats) {
      return NextResponse.json(
        { error: 'Campo obbligatorio: sats' },
        { status: 400 }
      )
    }

    if (sats <= 0) {
      return NextResponse.json(
        { error: 'Fee in sats deve essere maggiore di zero' },
        { status: 400 }
      )
    }

    // Verifica che la fee esista e appartenga all'utente
    const existingFee = await prisma.networkFee.findFirst({
      where: { 
        id,
        portfolio: { userId: 1 }
      },
      include: {
        portfolio: true
      }
    })

    if (!existingFee) {
      return NextResponse.json(
        { error: 'Fee di rete non trovata' },
        { status: 404 }
      )
    }

    const updatedFee = await prisma.networkFee.update({
      where: { id },
      data: {
        sats: parseInt(sats),
        date: date ? new Date(date) : existingFee.date,
        description: description?.trim() || null
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

    // Aggiungi conversione in BTC
    const feeWithBTC = {
      ...updatedFee,
      btcAmount: updatedFee.sats / 100000000
    }

    return NextResponse.json(feeWithBTC)
  } catch (error) {
    console.error('Errore nell\'aggiornamento fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento fee di rete' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella fee di rete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID fee non valido' },
        { status: 400 }
      )
    }

    // Verifica che la fee esista e appartenga all'utente
    const existingFee = await prisma.networkFee.findFirst({
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

    if (!existingFee) {
      return NextResponse.json(
        { error: 'Fee di rete non trovata' },
        { status: 404 }
      )
    }

    await prisma.networkFee.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Fee di rete cancellata con successo',
      portfolio: existingFee.portfolio.name
    })
  } catch (error) {
    console.error('Errore nella cancellazione fee di rete:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione fee di rete' },
      { status: 500 }
    )
  }
}