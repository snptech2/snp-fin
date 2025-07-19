import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Aggiorna trasferimento  
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const params = await context.params
    const transferId = parseInt(params.id)
    const { amount, description, fromAccountId, toAccountId, date } = await request.json()
    
    if (isNaN(transferId)) {
      return NextResponse.json({ error: 'ID trasferimento non valido' }, { status: 400 })
    }
    
    // Validazioni
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }
    
    if (!fromAccountId || !toAccountId) {
      return NextResponse.json({ error: 'Both accounts are required' }, { status: 400 })
    }
    
    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 })
    }
    
    // Get existing transfer
    const existingTransfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        userId // 🔄 Sostituito: userId: 1 → userId
      }
    })
    
    if (!existingTransfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    
    // Validate accounts exist
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: parseInt(fromAccountId), userId } }), // 🔄 Sostituito: userId: 1 → userId
      prisma.account.findFirst({ where: { id: parseInt(toAccountId), userId } }) // 🔄 Sostituito: userId: 1 → userId
    ])
    
    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'One or both accounts not found' }, { status: 404 })
    }
    
    // Update transfer and adjust balances in transaction
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // Revert original transfer balances
      await tx.account.update({
        where: { id: existingTransfer.fromAccountId },
        data: { balance: { increment: existingTransfer.amount } }
      })
      
      await tx.account.update({
        where: { id: existingTransfer.toAccountId },
        data: { balance: { decrement: existingTransfer.amount } }
      })
      
      // Apply new transfer balances
      await tx.account.update({
        where: { id: parseInt(fromAccountId) },
        data: { balance: { decrement: parseFloat(amount) } }
      })
      
      await tx.account.update({
        where: { id: parseInt(toAccountId) },
        data: { balance: { increment: parseFloat(amount) } }
      })
      
      // Update transfer record
      const updated = await tx.transfer.update({
        where: { id: transferId },
        data: {
          amount: parseFloat(amount),
          description: description || '',
          fromAccountId: parseInt(fromAccountId),
          toAccountId: parseInt(toAccountId),
          date: date ? new Date(date) : existingTransfer.date,
          updatedAt: new Date()
        },
        include: {
          fromAccount: { select: { id: true, name: true } },
          toAccount: { select: { id: true, name: true } }
        }
      })
      
      return updated
    })
    
    return NextResponse.json(updatedTransfer)
  } catch (error) {
    console.error('Error updating transfer:', error)
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 })
  }
}

// DELETE method 
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const params = await context.params
    const transferId = parseInt(params.id)
    
    console.log('DELETE Transfer - ID:', transferId, 'User:', userId)
    
    // Get transfer details first
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        userId
      }
    })
    
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    
    console.log('Transfer found:', transfer)
    console.log('Has gain transaction ID:', transfer.gainTransactionId)
    
    // Check if transfer has a linked gain transaction
    if (transfer.gainTransactionId) {
      return NextResponse.json({ 
        error: 'Questo trasferimento ha una transazione di guadagno collegata e non può essere eliminato direttamente. Elimina prima la transazione di guadagno dalla pagina "Entrate", che cancellerà automaticamente anche questo trasferimento.'
      }, { status: 400 })
    }
    
    // Delete transfer and revert balances in transaction
    await prisma.$transaction(async (tx) => {
      // Revert transfer account balances
      // FROM account: restore the transfer amount
      await tx.account.update({
        where: { id: transfer.fromAccountId },
        data: { balance: { increment: transfer.amount } }
      })
      
      // TO account: subtract the transfer amount
      await tx.account.update({
        where: { id: transfer.toAccountId },
        data: { balance: { decrement: transfer.amount } }
      })
      
      // Delete transfer
      await tx.transfer.delete({
        where: { id: transferId }
      })
      
      console.log('Transfer deleted successfully')
    })
    
    return NextResponse.json({ message: 'Transfer deleted successfully' })
  } catch (error) {
    console.error('Error deleting transfer - Full error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete transfer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}