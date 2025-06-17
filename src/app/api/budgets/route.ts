// src/app/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/budgets - Lista tutti i budget ordinati per priorità
export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: 1 }, // TODO: Usare userId reale dall'auth
      orderBy: { order: 'asc' }, // Ordina per priorità
      include: {
        user: {
          select: { currency: true }
        }
      }
    })

    // Calcola liquidità totale da tutti i conti
    const accounts = await prisma.account.findMany({
      where: { userId: 1 },
      select: { balance: true }
    })
    
    const totalLiquidity = accounts.reduce((sum, account) => sum + account.balance, 0)

    // Calcola allocazione a cascata
    let remainingAmount = totalLiquidity
    const allocations = []

    for (const budget of budgets) {
      let allocatedAmount = 0
      
      if (budget.type === 'fixed') {
        // Budget fisso: alloca fino al target o quello che rimane
        allocatedAmount = Math.min(budget.targetAmount, Math.max(0, remainingAmount))
      } else if (budget.type === 'unlimited') {
        // Budget illimitato: prende tutto quello che rimane
        allocatedAmount = Math.max(0, remainingAmount)
      }
      
      allocations.push({
        ...budget,
        allocatedAmount,
        progress: budget.type === 'fixed' 
          ? Math.min(100, (allocatedAmount / budget.targetAmount) * 100)
          : 100,
        isCompleted: budget.type === 'fixed' 
          ? allocatedAmount >= budget.targetAmount 
          : true,
        deficit: budget.type === 'fixed' 
          ? Math.max(0, budget.targetAmount - allocatedAmount)
          : 0
      })
      
      remainingAmount -= allocatedAmount
    }

    return NextResponse.json({
      budgets: allocations,
      totalLiquidity,
      unallocated: Math.max(0, remainingAmount)
    })
    
  } catch (error) {
    console.error('Errore nel recupero budget:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei budget' },
      { status: 500 }
    )
  }
}

// POST /api/budgets - Crea nuovo budget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, targetAmount, type, order } = body

    // Validazioni
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome budget obbligatorio' },
        { status: 400 }
      )
    }

    if (!type || !['fixed', 'unlimited'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo budget deve essere "fixed" o "unlimited"' },
        { status: 400 }
      )
    }

    if (type === 'fixed') {
      const parsedAmount = parseFloat(targetAmount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Importo deve essere un numero positivo per budget fissi' },
          { status: 400 }
        )
      }
    }

    const parsedOrder = parseInt(order)
    if (isNaN(parsedOrder) || parsedOrder < 1) {
      return NextResponse.json(
        { error: 'Priorità deve essere un numero positivo' },
        { status: 400 }
      )
    }

    // Verifica che non esista già un budget con la stessa priorità
    const existingBudgetWithOrder = await prisma.budget.findFirst({
      where: { 
        userId: 1,
        order: parsedOrder
      }
    })

    if (existingBudgetWithOrder) {
      return NextResponse.json(
        { error: 'Esiste già un budget con questa priorità' },
        { status: 400 }
      )
    }

    // Verifica che non esista già un budget con lo stesso nome
    const existingBudgetWithName = await prisma.budget.findFirst({
      where: { 
        userId: 1,
        name: name.trim()
      }
    })

    if (existingBudgetWithName) {
      return NextResponse.json(
        { error: 'Esiste già un budget con questo nome' },
        { status: 400 }
      )
    }

    // Crea il budget
    const budget = await prisma.budget.create({
      data: {
        name: name.trim(),
        targetAmount: type === 'fixed' ? parseFloat(targetAmount) : 0,
        type,
        order: parsedOrder,
        userId: 1
      }
    })

    return NextResponse.json(budget, { status: 201 })
    
  } catch (error) {
    console.error('Errore nella creazione budget:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione del budget' },
      { status: 500 }
    )
  }
}