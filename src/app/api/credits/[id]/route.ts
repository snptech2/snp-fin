import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Modifica credito
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const creditId = parseInt(params.id)
    const body = await request.json()
    const { name, description, amount } = body
    
    // Validazione
    if (!name || !amount) {
      return NextResponse.json(
        { error: 'Nome e importo sono obbligatori' },
        { status: 400 }
      )
    }
    
    const creditAmount = parseFloat(amount)
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return NextResponse.json(
        { error: 'L\'importo deve essere un numero positivo' },
        { status: 400 }
      )
    }
    
    // Verifica che il credito esista e appartenga all'utente
    const existingCredit = await prisma.credit.findFirst({
      where: { id: creditId, userId }
    })
    
    if (!existingCredit) {
      return NextResponse.json(
        { error: 'Credito non trovato' },
        { status: 404 }
      )
    }
    
    const updatedCredit = await prisma.credit.update({
      where: { id: creditId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        amount: creditAmount
      }
    })
    
    return NextResponse.json(updatedCredit)
  } catch (error) {
    console.error('Errore nella modifica credito:', error)
    return NextResponse.json(
      { error: 'Errore nella modifica del credito' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina credito
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const creditId = parseInt(params.id)
    
    // Verifica che il credito esista e appartenga all'utente
    const existingCredit = await prisma.credit.findFirst({
      where: { id: creditId, userId }
    })
    
    if (!existingCredit) {
      return NextResponse.json(
        { error: 'Credito non trovato' },
        { status: 404 }
      )
    }
    
    await prisma.credit.delete({
      where: { id: creditId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nell\'eliminazione credito:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione del credito' },
      { status: 500 }
    )
  }
}