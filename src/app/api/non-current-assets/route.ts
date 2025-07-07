import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// GET - Ottieni tutti i beni non correnti dell'utente
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const nonCurrentAssets = await prisma.nonCurrentAsset.findMany({
      where: { userId },
      orderBy: { value: 'desc' } // Ordina per valore decrescente
    })
    
    return NextResponse.json(nonCurrentAssets)
  } catch (error) {
    console.error('Errore nel recupero beni non correnti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei beni non correnti' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo bene non corrente
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
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
    
    const nonCurrentAsset = await prisma.nonCurrentAsset.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        value: assetValue,
        userId
      }
    })
    
    return NextResponse.json(nonCurrentAsset)
  } catch (error) {
    console.error('Errore nella creazione bene non corrente:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione del bene non corrente' },
      { status: 500 }
    )
  }
}