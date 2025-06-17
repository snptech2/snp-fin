import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Colori disponibili per le categorie
const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
  '#F43F5E', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4'
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    const whereClause: any = { userId: 1 }
    if (type && ['income', 'expense'].includes(type)) {
      whereClause.type = type
    }
    
    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore nel recupero delle categorie' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, color } = body
    
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome categoria obbligatorio' },
        { status: 400 }
      )
    }
    
    if (!type || !['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo deve essere "income" o "expense"' },
        { status: 400 }
      )
    }
    
    // Controllo duplicati
    const existing = await prisma.category.findFirst({
      where: {
        userId: 1,
        name: name.trim(),
        type: type
      }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Categoria già esistente per questo tipo' },
        { status: 400 }
      )
    }
    
    // Validazione colore
    const categoryColor = color || CATEGORY_COLORS[0]
    if (categoryColor && !categoryColor.match(/^#[0-9A-F]{6}$/i)) {
      return NextResponse.json(
        { error: 'Colore deve essere in formato esadecimale' },
        { status: 400 }
      )
    }
    
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        color: categoryColor,
        userId: 1
      }
    })
    
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore nella creazione della categoria' },
      { status: 500 }
    )
  }
}
