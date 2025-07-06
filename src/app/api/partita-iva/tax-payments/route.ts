import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRiservaTasseBudget } from '@/lib/partitaIVAUtils'

const prisma = new PrismaClient()

// GET - Lista pagamenti tasse con filtri
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { searchParams } = new URL(request.url)
    const anno = searchParams.get('anno')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Costruisci filtri
    const where: any = { userId }
    if (anno) {
      where.data = {
        gte: new Date(`${anno}-01-01`),
        lt: new Date(`${parseInt(anno) + 1}-01-01`)
      }
    }
    
    const payments = await prisma.partitaIVATaxPayment.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true }
        }
      },
      orderBy: { data: 'desc' },
      take: limit
    })
    
    return NextResponse.json(payments)
  } catch (error) {
    console.error('Errore nel recupero pagamenti tasse:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei pagamenti' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo pagamento tasse
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { data, descrizione, importo, tipo, accountId } = body
    
    // Validazione
    if (!data || !descrizione || !importo) {
      return NextResponse.json(
        { error: 'Data, descrizione e importo sono obbligatori' },
        { status: 400 }
      )
    }
    
    const importoPagamento = parseFloat(importo)
    if (isNaN(importoPagamento) || importoPagamento <= 0) {
      return NextResponse.json(
        { error: 'L\'importo deve essere un numero positivo' },
        { status: 400 }
      )
    }
    
    // Verifica account se specificato
    let account = null
    if (accountId) {
      account = await prisma.account.findFirst({
        where: { id: parseInt(accountId), userId, type: 'bank' }
      })
      
      if (!account) {
        return NextResponse.json(
          { error: 'Conto bancario non trovato' },
          { status: 404 }
        )
      }
    }
    
    // Crea pagamento e aggiorna saldo in transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // Crea pagamento tasse
      const payment = await tx.partitaIVATaxPayment.create({
        data: {
          data: new Date(data),
          descrizione,
          importo: importoPagamento,
          tipo: tipo || 'generico',
          userId,
          accountId: accountId ? parseInt(accountId) : null
        },
        include: {
          account: {
            select: { id: true, name: true }
          }
        }
      })
      
      // Se specificato un conto, aggiorna il saldo e crea transazione speciale
      if (account) {
        // Aggiorna saldo conto (sottrae importo)
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { decrement: importoPagamento } }
        })
        
        // Trova o crea categoria speciale "Tasse Partita IVA" (esclusa dalle medie)
        let category = await tx.category.findFirst({
          where: { name: 'Tasse Partita IVA', userId, type: 'expense' }
        })
        
        if (!category) {
          category = await tx.category.create({
            data: {
              name: 'Tasse Partita IVA',
              type: 'expense',
              color: '#EF4444',
              userId
            }
          })
        }
        
        // Crea transazione normale con categoria speciale
        await tx.transaction.create({
          data: {
            description: `Tasse - ${descrizione}`,
            amount: importoPagamento,
            date: new Date(data),
            type: 'expense',
            accountId: account.id,
            categoryId: category.id,
            userId
          }
        })
      }
      
      // Aggiorna budget RISERVA TASSE
      await updateRiservaTasseBudget(userId, tx)
      
      return payment
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione pagamento tasse:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione del pagamento' },
      { status: 500 }
    )
  }
}