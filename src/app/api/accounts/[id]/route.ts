// src/app/api/accounts/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Aggiorna conto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const { name, balance } = await request.json()
    const accountId = parseInt(params.id)
    
    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'ID account non valido' },
        { status: 400 }
      )
    }
    
    const updatedAccount = await prisma.account.update({
      where: { 
        id: accountId,
        userId 
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

// DELETE - Cancella conto (FIXED per gestire trasferimenti)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const accountId = parseInt(params.id)
    
    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'ID account non valido' },
        { status: 400 }
      )
    }
    
    // Verifica che l'account appartenga all'utente
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account non trovato' },
        { status: 404 }
      )
    }
    
    // 🔧 FIXED: Controlla se ci sono transazioni collegate
    const transactionCount = await prisma.transaction.count({
      where: { accountId }
    })
    
    // 🔧 FIXED: Controlla se ci sono trasferimenti collegati
    const transferCount = await prisma.transfer.count({
      where: { 
        OR: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ]
      }
    })
    
    // 🔧 FIXED: Controlla se ci sono DCA portfolios collegati
    const dcaPortfolioCount = await prisma.dCAPortfolio.count({
      where: { accountId }
    })
    
    // Costruisci messaggio di errore dettagliato
    const issues = []
    if (transactionCount > 0) issues.push(`${transactionCount} transazioni`)
    if (transferCount > 0) issues.push(`${transferCount} trasferimenti`)
    if (dcaPortfolioCount > 0) issues.push(`${dcaPortfolioCount} portfolio DCA`)
    
    if (issues.length > 0) {
      return NextResponse.json(
        { 
          error: `Impossibile cancellare il conto: collegato a ${issues.join(', ')}`
        },
        { status: 400 }
      )
    }
    
    // Se tutto OK, cancella l'account
    await prisma.account.delete({
      where: { id: accountId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore nella cancellazione conto:', error)
    return NextResponse.json({ error: 'Errore nella cancellazione conto' }, { status: 500 })
  }
}