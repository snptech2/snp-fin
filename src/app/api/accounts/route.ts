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
    
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { name, makeDefault, type } = await request.json()
    const accountType = type || 'bank' // Default to bank account
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check if name already exists for this user
    const existingAccount = await prisma.account.findFirst({
      where: {
        name,
        userId
      }
    })

    if (existingAccount) {
      return NextResponse.json({ error: 'Account name already exists' }, { status: 400 })
    }

    // If making this default, unset other defaults first
    if (makeDefault) {
      await prisma.account.updateMany({
        where: { 
          userId,
          type: accountType // Only within the same type
        },
        data: { isDefault: false }
      })
    }

    const account = await prisma.account.create({
      data: {
        name,
        type: accountType,
        userId,
        isDefault: makeDefault || false
      }
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}