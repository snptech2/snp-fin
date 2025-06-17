import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Evita multiple istanze di Prisma in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// PUT - Aggiorna conto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { name, balance } = await request.json()
    const accountId = parseInt(resolvedParams.id)
    
    const updatedAccount = await prisma.account.update({
      where: { 
        id: accountId,
        userId: 1 
      },
      data: {
        name,
        balance: parseFloat(balance) || 0
      }
    })
    
    return NextResponse.json(updatedAccount)
  } catch (error) {
    console.error('Errore nell\'aggiornamento conto:', error)
    return NextResponse.json({ error: 'Errore nell\'aggiornamento conto' }, { status: 500 })
  }
}

// DELETE - Cancella conto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const accountId = parseInt(resolvedParams.id)
    
    // Controlla se ci sono transazioni collegate
    const transactionCount = await prisma.transaction.count({
      where: { accountId }
    })
    
    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Impossibile cancellare il conto: contiene transazioni' }, 
        { status: 400 }
      )
    }
    
    // Cancella il conto
    await prisma.account.delete({
      where: { 
        id: accountId,
        userId: 1 
      }
    })
    
    // Se era il conto predefinito, imposta il primo disponibile come predefinito
    const remainingAccounts = await prisma.account.findMany({
      where: { userId: 1 },
      orderBy: { id: 'asc' }
    })
    
    if (remainingAccounts.length > 0) {
      // Verifica se c'è almeno un conto predefinito
      const hasDefault = remainingAccounts.some(acc => acc.isDefault)
      
      if (!hasDefault) {
        await prisma.account.update({
          where: { id: remainingAccounts[0].id },
          data: { isDefault: true }
        })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nella cancellazione conto:', error)
    return NextResponse.json({ error: 'Errore nella cancellazione conto' }, { status: 500 })
  }
}