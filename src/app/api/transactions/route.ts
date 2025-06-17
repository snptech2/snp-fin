// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Lista tutte le transazioni con filtri opzionali
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'income' o 'expense'
    const accountId = searchParams.get('accountId')
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Costruisci filtri
    const where: any = {
      userId: 1
    }

    if (type) where.type = type
    if (accountId) where.accountId = parseInt(accountId)
    if (categoryId) where.categoryId = parseInt(categoryId)

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { date: 'desc' },
      take: limit
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Errore nel recupero transazioni:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle transazioni' },
      { status: 500 }
    )
  }
}

// POST - Crea nuova transazione
export async function POST(request: NextRequest) {
  try {
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
      // Crea transazione
      const transaction = await tx.transaction.create({
        data: {
          description: description?.trim() || null,
          amount: parsedAmount,
          date: date ? new Date(date) : new Date(),
          type,
          userId: 1,
          accountId: parseInt(accountId),
          categoryId: parseInt(categoryId)
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

      // Aggiorna saldo del conto
      const balanceChange = type === 'income' ? parsedAmount : -parsedAmount
      await tx.account.update({
        where: { id: parseInt(accountId) },
        data: {
          balance: {
            increment: balanceChange
          },
          updatedAt: new Date()
        }
      })

      return transaction
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione transazione:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della transazione' },
      { status: 500 }
    )
  }
}