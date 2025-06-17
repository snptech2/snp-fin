// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista tutte le categorie
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: 1 },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Errore nel recupero categorie:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle categorie' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova categoria
export async function POST(request: NextRequest) {
  try {
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

    // Controlla se nome già esiste per questo tipo
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        type,
        userId: 1
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Nome categoria già esistente' },
        { status: 400 }
      )
    }

    // Crea categoria
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        userId: 1
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione categoria:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della categoria' },
      { status: 500 }
    )
  }
}