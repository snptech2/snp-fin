import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transferId = parseInt(params.id)
    
    // Get transfer details first
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        userId: 1 // TODO: get from session
      }
    })
    
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    
    // Delete transfer and revert balances in transaction
    await prisma.$transaction(async (tx) => {
      // Revert account balances
      await tx.account.update({
        where: { id: transfer.fromAccountId },
        data: { balance: { increment: transfer.amount } }
      })
      
      await tx.account.update({
        where: { id: transfer.toAccountId },
        data: { balance: { decrement: transfer.amount } }
      })
      
      // Delete transfer
      await tx.transfer.delete({
        where: { id: transferId }
      })
    })
    
    return NextResponse.json({ message: 'Transfer deleted successfully' })
  } catch (error) {
    console.error('Error deleting transfer:', error)
    return NextResponse.json({ error: 'Failed to delete transfer' }, { status: 500 })
  }
}