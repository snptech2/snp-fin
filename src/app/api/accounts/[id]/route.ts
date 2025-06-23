// src/app/api/accounts/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Aggiorna conto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

// DELETE - Cancella conto (FIXED per gestire trasferimenti)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        userId: 1 
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
          error: `Impossibile cancellare il conto: contiene ${issues.join(', ')}`,
          details: {
            transactionCount,
            transferCount,
            dcaPortfolioCount
          }
        }, 
        { status: 400 }
      )
    }
    
    // Tutto ok, procedi con la cancellazione
    await prisma.account.delete({
      where: { id: accountId }
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
    
    return NextResponse.json({ 
      success: true,
      message: 'Account cancellato con successo'
    })
  } catch (error) {
    console.error('Errore nella cancellazione conto:', error)
    
    // Gestisci constraint violations specifici
    if (error instanceof Error) {
      if (error.message.includes('constraint')) {
        return NextResponse.json({ 
          error: 'Impossibile cancellare il conto: potrebbe avere dati collegati non rilevati. Elimina prima tutti i trasferimenti e transazioni.',
          technical: error.message
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ error: 'Errore nella cancellazione conto' }, { status: 500 })
  }
}