import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Ottieni tutti i conti
export async function GET() {
  try {
    // Per ora usiamo userId = 1 (poi aggiungeremo autenticazione)
    const accounts = await prisma.account.findMany({
      where: { userId: 1 },
      orderBy: { createdAt: 'asc' }
    })
    
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Errore nel recupero conti:', error)
    return NextResponse.json({ error: 'Errore nel recupero conti' }, { status: 500 })
  }
}

// POST - Crea nuovo conto
export async function POST(request: NextRequest) {
  try {
    const { name, balance } = await request.json()
    
    // Controlla se è il primo conto (diventa predefinito)
    const existingAccounts = await prisma.account.findMany({
      where: { userId: 1 }
    })
    
    const newAccount = await prisma.account.create({
      data: {
        name,
        balance: parseFloat(balance) || 0,
        isDefault: existingAccounts.length === 0,
        userId: 1
      }
    })
    
    return NextResponse.json(newAccount)
  } catch (error) {
    console.error('Errore nella creazione conto:', error)
    return NextResponse.json({ error: 'Errore nella creazione conto' }, { status: 500 })
  }
}