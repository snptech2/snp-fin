// src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Aggiorna categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id)
    const body = await request.json()
    const { name, type } = body

    // Validazione
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nome e tipo sono obbligatori' },
        { status: 400 }
      )
    }

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json(
        { error: 'Il tipo deve essere "income" o "expense"' },
        { status: 400 }
      )
    }

    // Verifica se categoria esiste
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: 1
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      )
    }

    // Controlla se nome già esiste (escludendo questa categoria)
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        type,
        userId: 1,
        id: { not: categoryId }
      }
    })

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'Nome categoria già esistente' },
        { status: 400 }
      )
    }

    // Aggiorna categoria
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        type,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Errore nell\'aggiornamento categoria:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della categoria' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id)

    // Verifica se categoria esiste
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: 1
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      )
    }

    // Verifica se categoria ha transazioni associate
    const transactionCount = await prisma.transaction.count({
      where: { categoryId }
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: `Impossibile cancellare. La categoria ha ${transactionCount} transazioni associate.` },
        { status: 400 }
      )
    }

    // Cancella categoria
    await prisma.category.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({ message: 'Categoria cancellata con successo' })
  } catch (error) {
    console.error('Errore nella cancellazione categoria:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della categoria' },
      { status: 500 }
    )
  }
}