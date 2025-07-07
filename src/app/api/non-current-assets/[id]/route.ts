import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Modifica bene non corrente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const assetId = parseInt(params.id)
    const body = await request.json()
    const { name, description, value } = body
    
    // Validazione
    if (!name || !value) {
      return NextResponse.json(
        { error: 'Nome e valore sono obbligatori' },
        { status: 400 }
      )
    }
    
    const assetValue = parseFloat(value)
    if (isNaN(assetValue) || assetValue <= 0) {
      return NextResponse.json(
        { error: 'Il valore deve essere un numero positivo' },
        { status: 400 }
      )
    }
    
    // Verifica che il bene esista e appartenga all'utente
    const existingAsset = await prisma.nonCurrentAsset.findFirst({
      where: { id: assetId, userId }
    })
    
    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Bene non corrente non trovato' },
        { status: 404 }
      )
    }
    
    const updatedAsset = await prisma.nonCurrentAsset.update({
      where: { id: assetId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        value: assetValue
      }
    })
    
    return NextResponse.json(updatedAsset)
  } catch (error) {
    console.error('Errore nella modifica bene non corrente:', error)
    return NextResponse.json(
      { error: 'Errore nella modifica del bene non corrente' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina bene non corrente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const assetId = parseInt(params.id)
    
    // Verifica che il bene esista e appartenga all'utente
    const existingAsset = await prisma.nonCurrentAsset.findFirst({
      where: { id: assetId, userId }
    })
    
    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Bene non corrente non trovato' },
        { status: 404 }
      )
    }
    
    await prisma.nonCurrentAsset.delete({
      where: { id: assetId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nell\'eliminazione bene non corrente:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione del bene non corrente' },
      { status: 500 }
    )
  }
}