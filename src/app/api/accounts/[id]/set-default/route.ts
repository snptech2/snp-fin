import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Evita multiple istanze di Prisma in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// PUT - Imposta conto predefinito
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const accountId = parseInt(resolvedParams.id)
    
    // Prima rimuovi il flag da tutti i conti
    await prisma.account.updateMany({
      where: { userId: 1 },
      data: { isDefault: false }
    })
    
    // Poi imposta il nuovo conto predefinito
    const updatedAccount = await prisma.account.update({
      where: { 
        id: accountId,
        userId: 1 
      },
      data: { isDefault: true }
    })
    
    return NextResponse.json(updatedAccount)
  } catch (error) {
    console.error('Errore nell\'impostazione conto predefinito:', error)
    return NextResponse.json({ error: 'Errore nell\'impostazione conto predefinito' }, { status: 500 })
  }
}