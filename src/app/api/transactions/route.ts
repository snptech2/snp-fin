// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Lista tutte le transazioni con filtri opzionali
export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'income' o 'expense'
    const accountId = searchParams.get('accountId')
    const categoryId = searchParams.get('categoryId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50') // Ridotto limite default per performance
    const all = searchParams.get('all') === 'true' // Parametro per ottenere tutte le transazioni
    const offset = (page - 1) * limit

    // Costruisci filtri
    const where: any = {
      userId
    }

    if (type) where.type = type
    if (accountId) where.accountId = parseInt(accountId)
    if (categoryId) where.categoryId = parseInt(categoryId)

    // Get total count for pagination (se non richiediamo tutto)
    const totalCount = all ? 0 : await prisma.transaction.count({ where })
    
    const transactionQuery: any = {
      where,
      include: {
        account: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, type: true, color: true } // 🎨 Includi il colore!
        }
      },
      orderBy: { date: 'desc' }
    }
    
    // Se non richiediamo tutto, applica paginazione
    if (!all) {
      transactionQuery.take = limit
      transactionQuery.skip = offset
    }
    
    const transactions = await prisma.transaction.findMany(transactionQuery)

    const response: any = { transactions }
    
    // Includi paginazione solo se non richiediamo tutto
    if (!all) {
      response.pagination = {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    }
    
    return NextResponse.json(response)
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
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
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
        { error: 'L\'importo deve essere un numero positivo' },
        { status: 400 }
      )
    }

    // Verifica che account e categoria esistano
    const account = await prisma.account.findFirst({
      where: { id: parseInt(accountId), userId }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Conto non trovato' },
        { status: 404 }
      )
    }

    const category = await prisma.category.findFirst({
      where: { id: parseInt(categoryId), userId, type }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria non trovata o tipo non corrispondente' },
        { status: 404 }
      )
    }

    // Calcola nuovo saldo
    const balanceChange = type === 'income' ? parsedAmount : -parsedAmount

    // Crea transazione e aggiorna saldo in una transazione DB
    const result = await prisma.$transaction(async (tx) => {
      // Crea transazione
      const transaction = await tx.transaction.create({
        data: {
          description: description || null,
          amount: parsedAmount,
          date: date ? new Date(date) : new Date(),
          type,
          accountId: parseInt(accountId),
          categoryId: parseInt(categoryId),
          userId
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

      // Aggiorna saldo del conto
      await tx.account.update({
        where: { id: parseInt(accountId) },
        data: { balance: { increment: balanceChange } }
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