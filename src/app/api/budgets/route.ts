import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    // Get all budgets for the user
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    })

    // Calculate total liquidity from bank accounts only
    const accounts = await prisma.account.findMany({
      where: { 
        userId,
        type: 'bank'
      }
    })

    const totalLiquidity = accounts.reduce((sum, account) => sum + account.balance, 0)

    // Calculate allocations
    let remainingAmount = totalLiquidity
    const allocatedBudgets = []

    // First pass: allocate fixed budgets in order
    for (const budget of budgets.filter(b => b.type === 'fixed')) {
      const allocated = Math.min(budget.targetAmount, remainingAmount)
      remainingAmount -= allocated
      
      allocatedBudgets.push({
        ...budget,
        allocatedAmount: allocated,
        percentage: totalLiquidity > 0 ? (allocated / budget.targetAmount) * 100 : 0,
        isDeficit: allocated < budget.targetAmount
      })
    }

    // Second pass: allocate unlimited budgets
    const unlimitedBudgets = budgets.filter(b => b.type === 'unlimited')
    if (unlimitedBudgets.length > 0) {
      const amountPerUnlimited = remainingAmount / unlimitedBudgets.length
      
      for (const budget of unlimitedBudgets) {
        allocatedBudgets.push({
          ...budget,
          allocatedAmount: amountPerUnlimited,
          percentage: 100, // Unlimited budgets are always "complete"
          isDeficit: false
        })
      }
    }

    // Calculate actual total allocated amount
    const actualTotalAllocated = allocatedBudgets.reduce((sum, budget) => sum + (budget.allocatedAmount || 0), 0)
    const unallocated = Math.max(0, totalLiquidity - actualTotalAllocated)

    return NextResponse.json({
      budgets: allocatedBudgets,
      totalLiquidity,
      totalAllocated: actualTotalAllocated,
      unallocated,
      summary: {
        totalBudgets: budgets.length,
        fixedBudgets: budgets.filter(b => b.type === 'fixed').length,
        unlimitedBudgets: budgets.filter(b => b.type === 'unlimited').length,
        hasDeficit: allocatedBudgets.some(b => b.isDeficit)
      }
    })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { name, targetAmount, type, color } = await request.json()

    if (!name || targetAmount === undefined || targetAmount === null || !type) {
      return NextResponse.json({ error: 'Name, target amount, and type are required' }, { status: 400 })
    }

    if (type !== 'fixed' && type !== 'unlimited') {
      return NextResponse.json({ error: 'Type must be fixed or unlimited' }, { status: 400 })
    }

    // Validazione targetAmount specifica per tipo
    if (type === 'fixed' && targetAmount <= 0) {
      return NextResponse.json({ error: 'Target amount must be positive for fixed budgets' }, { status: 400 })
    }

    // Per budget unlimited, targetAmount può essere qualsiasi valore (anche 0)
    if (type === 'unlimited') {
      // Non è necessaria validazione particolare per unlimited
    }

    // Check if name already exists for this user
    const existingBudget = await prisma.budget.findFirst({
      where: {
        name,
        userId
      }
    })

    if (existingBudget) {
      return NextResponse.json({ error: 'Budget name already exists' }, { status: 400 })
    }

    // Get next order number
    const lastBudget = await prisma.budget.findFirst({
      where: { userId },
      orderBy: { order: 'desc' }
    })

    const nextOrder = lastBudget ? lastBudget.order + 1 : 1

    const budget = await prisma.budget.create({
      data: {
        name,
        targetAmount,
        type,
        order: nextOrder,
        color: color || '#3B82F6',
        userId
      }
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}