// src/app/api/accounts/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT - Aggiorna conto
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { name, balance } = body
    const params = await context.params
    const accountId = parseInt(params.id)
    
    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'ID account non valido' },
        { status: 400 }
      )
    }
    
    // Costruisci i dati da aggiornare
    const updateData: any = { name }
    
    // Solo aggiorna il saldo se viene fornito esplicitamente
    if (balance !== undefined && balance !== null) {
      updateData.balance = parseFloat(balance) || 0
    }
    
    const updatedAccount = await prisma.account.update({
      where: { 
        id: accountId,
        userId 
      },
      data: updateData
    })
    
    return NextResponse.json(updatedAccount)
  } catch (error) {
    console.error('Errore nell\'aggiornamento conto:', error)
    return NextResponse.json({ error: 'Errore nell\'aggiornamento conto' }, { status: 500 })
  }
}

// POST - Ricalcola saldo conto basandosi sulle transazioni
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const params = await context.params
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
    
    // Calcola il saldo basandosi sulle transazioni
    const transactions = await prisma.transaction.findMany({
      where: { accountId }
    })
    
    let calculatedBalance = 0
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        calculatedBalance += transaction.amount
      } else if (transaction.type === 'expense') {
        calculatedBalance -= transaction.amount
      }
    })
    
    // Considera anche i trasferimenti
    const incomingTransfers = await prisma.transfer.findMany({
      where: { toAccountId: accountId }
    })
    
    const outgoingTransfers = await prisma.transfer.findMany({
      where: { fromAccountId: accountId }
    })
    
    incomingTransfers.forEach(transfer => {
      calculatedBalance += transfer.amount
    })
    
    outgoingTransfers.forEach(transfer => {
      calculatedBalance -= transfer.amount
    })
    
    // Aggiorna il saldo
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { balance: calculatedBalance }
    })
    
    return NextResponse.json({
      success: true,
      oldBalance: account.balance,
      newBalance: calculatedBalance,
      account: updatedAccount
    })
  } catch (error) {
    console.error('Errore nel ricalcolo saldo conto:', error)
    return NextResponse.json({ error: 'Errore nel ricalcolo saldo conto' }, { status: 500 })
  }
}

// DELETE - Cancella conto (FIXED per gestire trasferimenti)
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