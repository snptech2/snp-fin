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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const fromAccountId = searchParams.get('fromAccountId')
    const toAccountId = searchParams.get('toAccountId')
    
    const skip = (page - 1) * limit
    
    const where: any = {
      userId, // 🔄 Sostituito: userId: 1 → userId
    }
    
    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive'
      }
    }
    
    if (fromAccountId) {
      where.fromAccountId = parseInt(fromAccountId)
    }
    
    if (toAccountId) {
      where.toAccountId = parseInt(toAccountId)
    }
    
    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,
        include: {
          fromAccount: true,
          toAccount: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transfer.count({ where })
    ])
    
    return NextResponse.json({
      transfers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const { amount, description, fromAccountId, toAccountId, date, investmentGainAmount } = await request.json()
    
    // Validations
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }
    
    if (!fromAccountId || !toAccountId) {
      return NextResponse.json({ error: 'Both accounts are required' }, { status: 400 })
    }
    
    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 })
    }
    
    // Check if accounts exist and belong to user
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { id: fromAccountId, userId } // 🔄 Sostituito: userId: 1 → userId
      }),
      prisma.account.findFirst({
        where: { id: toAccountId, userId } // 🔄 Sostituito: userId: 1 → userId
      })
    ])
    
    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'Invalid accounts' }, { status: 400 })
    }
    
    // Check if from account has sufficient balance
    if (fromAccount.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }
    
    // Validate investment gain amount if provided
    if (investmentGainAmount !== undefined) {
      if (investmentGainAmount < 0) {
        return NextResponse.json({ error: 'Investment gain amount cannot be negative' }, { status: 400 })
      }
      if (investmentGainAmount > amount) {
        return NextResponse.json({ error: 'Investment gain amount cannot exceed transfer amount' }, { status: 400 })
      }
      // Only allow investment gains when transferring FROM an investment account
      if (fromAccount.type !== 'investment') {
        return NextResponse.json({ error: 'Investment gains can only be specified when transferring from an investment account' }, { status: 400 })
      }
    }
    
    // Create transfer and update balances in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer record
      const transferDate = date ? new Date(date) : new Date()
      const transfer = await tx.transfer.create({
        data: {
          amount,
          description: description || (investmentGainAmount ? `Recupero capitale + guadagni (${investmentGainAmount}€ di guadagno)` : null),
          date: transferDate,
          userId, // 🔄 Sostituito: userId: 1 → userId
          fromAccountId,
          toAccountId,
        },
        include: {
          fromAccount: true,
          toAccount: true,
        }
      })
      
      // Update account balances
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } }
      })
      
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } }
      })
      
      // If investment gains are specified, create income transaction
      if (investmentGainAmount && investmentGainAmount > 0) {
        // Find or create "Guadagni Investimenti" category
        let incomeCategory = await tx.category.findFirst({
          where: {
            userId,
            name: 'Guadagni Investimenti',
            type: 'income'
          }
        })
        
        if (!incomeCategory) {
          incomeCategory = await tx.category.create({
            data: {
              name: 'Guadagni Investimenti',
              type: 'income',
              color: '#10B981', // Verde per i guadagni
              userId
            }
          })
        }
        
        // Create income transaction for investment gains
        await tx.transaction.create({
          data: {
            description: `Guadagni da investimenti - ${fromAccount.name}`,
            amount: investmentGainAmount,
            date: transferDate,
            type: 'income',
            accountId: toAccountId,
            categoryId: incomeCategory.id,
            userId
          }
        })
      }
      
      return transfer
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating transfer:', error)
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 })
  }
}