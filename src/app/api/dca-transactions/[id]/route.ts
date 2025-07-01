// src/app/api/dca-transactions/[id]/route.ts - VERSIONE CORRETTA COMPLETA
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware' // ← AGGIUNTO

const prisma = new PrismaClient()

// PUT - Aggiorna transazione DCA (AGGIORNATO per supportare vendite)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 AGGIUNTO: Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const id = parseInt(params.id)
    // 🟠 AGGIUNTO: campo type opzionale
    const { date, type, broker, info, btcQuantity, eurPaid, notes } = await request.json()

    // Validazioni (INVARIATE)
    if (!broker || !info || !btcQuantity || !eurPaid) {
      return NextResponse.json(
        { error: 'Campi obbligatori: broker, info, btcQuantity, eurPaid' },
        { status: 400 }
      )
    }

    // 🟠 AGGIORNATO: Validazione per supportare vendite
    if (Math.abs(parseFloat(btcQuantity)) <= 0 || parseFloat(eurPaid) <= 0) {
      return NextResponse.json(
        { error: 'Quantità BTC e Euro devono essere maggiori di zero' },
        { status: 400 }
      )
    }

    // Recupera transazione esistente (AGGIORNATO con userId reale)
    const existingTransaction = await prisma.dCATransaction.findFirst({
      where: { 
        id,
        portfolio: { userId } // ← FIX: userId reale invece di 1
      },
      include: {
        portfolio: {
          include: {
            account: true
          }
        }
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    if (!existingTransaction.portfolio.account) {
      return NextResponse.json(
        { error: 'Portfolio non ha un conto di investimento collegato' },
        { status: 400 }
      )
    }

    // 🟠 AGGIORNATO: Calcola le differenze considerando il tipo
    const oldType = existingTransaction.type || 'buy' // Default per transazioni esistenti
    const newType = type || oldType
    const oldAmount = existingTransaction.eurPaid
    const newAmount = parseFloat(eurPaid)

    // Calcola l'impatto sul saldo del conto
    let balanceChange = 0

    if (oldType === 'buy' && newType === 'buy') {
      // BUY → BUY: logica originale
      balanceChange = oldAmount - newAmount
    } else if (oldType === 'sell' && newType === 'sell') {
      // SELL → SELL: differenza inversa
      balanceChange = newAmount - oldAmount
    } else if (oldType === 'buy' && newType === 'sell') {
      // BUY → SELL: rimborsa il buy + aggiungi la vendita
      balanceChange = oldAmount + newAmount
    } else if (oldType === 'sell' && newType === 'buy') {
      // SELL → BUY: rimuovi la vendita + scala il nuovo acquisto
      balanceChange = -(oldAmount + newAmount)
    }

    // Verifica liquidità
    const currentBalance = existingTransaction.portfolio.account.balance
    const newBalance = currentBalance + balanceChange

    if (newBalance < 0) {
      return NextResponse.json(
        { 
          error: `Liquidità insufficiente. Saldo attuale: €${currentBalance.toFixed(2)}, saldo dopo modifica: €${newBalance.toFixed(2)}`,
          currentBalance,
          requiredChange: balanceChange,
          newBalance,
          accountName: existingTransaction.portfolio.account.name
        },
        { status: 400 }
      )
    }

    // 🟠 NUOVO: Per le vendite, verifica BTC sufficienti
    if (newType === 'sell') {
      const otherTransactions = await prisma.dCATransaction.findMany({
        where: { 
          portfolioId: existingTransaction.portfolioId,
          id: { not: id }
        }
      })

      let totalBtcHeld = 0
      for (const tx of otherTransactions) {
        totalBtcHeld += tx.btcQuantity
      }

      if (totalBtcHeld < parseFloat(btcQuantity)) {
        return NextResponse.json(
          {
            error: 'BTC insufficienti nel portfolio per questa vendita',
            availableBtc: totalBtcHeld,
            required: parseFloat(btcQuantity),
            deficit: parseFloat(btcQuantity) - totalBtcHeld
          },
          { status: 400 }
        )
      }
    }

    // Aggiorna transazione e saldo (AGGIORNATO)
    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna la transazione
      const updatedTransaction = await tx.dCATransaction.update({
        where: { id },
        data: {
          date: date ? new Date(date) : existingTransaction.date,
          type: newType, // 🟠 NUOVO: Aggiorna il tipo
          broker: broker.trim(),
          info: info.trim(),
          btcQuantity: newType === 'buy' ? parseFloat(btcQuantity) : -parseFloat(btcQuantity), // 🟠 NUOVO
          eurPaid: newAmount,
          notes: notes?.trim() || null
        },
        include: {
          portfolio: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Applica la modifica al saldo (AGGIORNATO)
      if (balanceChange !== 0) {
        await tx.account.update({
          where: { id: existingTransaction.portfolio.account.id },
          data: { balance: { increment: balanceChange } }
        })
      }

      return updatedTransaction
    })

    // Aggiungi prezzo calcolato (AGGIORNATO)
    const transactionWithPrice = {
      ...result,
      purchasePrice: result.eurPaid / Math.abs(result.btcQuantity) // 🟠 AGGIORNATO: Math.abs
    }

    return NextResponse.json(transactionWithPrice)
  } catch (error) {
    console.error('Errore nell\'aggiornamento transazione DCA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento transazione DCA' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella transazione DCA (AGGIORNATO per gestire vendite)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 AGGIUNTO: Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID transazione non valido' },
        { status: 400 }
      )
    }

    // Recupera transazione (AGGIORNATO con userId reale)
    const existingTransaction = await prisma.dCATransaction.findFirst({
      where: { 
        id,
        portfolio: { userId } // ← FIX: userId reale invece di 1
      },
      include: {
        portfolio: {
          include: {
            account: true
          }
        }
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Cancella transazione e ripristina saldo (AGGIORNATO)
    await prisma.$transaction(async (tx) => {
      if (existingTransaction.portfolio.account) {
        let balanceAdjustment = 0
        
        // 🟠 AGGIORNATO: Gestisci sia buy che sell
        const transactionType = existingTransaction.type || 'buy'
        
        if (transactionType === 'buy') {
          // Era un acquisto: restituisci i soldi al conto
          balanceAdjustment = existingTransaction.eurPaid
        } else {
          // Era una vendita: rimuovi i soldi dal conto
          balanceAdjustment = -existingTransaction.eurPaid
        }

        await tx.account.update({
          where: { id: existingTransaction.portfolio.account.id },
          data: { balance: { increment: balanceAdjustment } }
        })
      }

      // Cancella la transazione (INVARIATO)
      await tx.dCATransaction.delete({
        where: { id }
      })
    })

    return NextResponse.json({ 
      message: 'Transazione cancellata con successo',
      type: existingTransaction.type || 'buy', // 🟠 AGGIORNATO
      amount: existingTransaction.eurPaid,
      balanceAdjustment: (existingTransaction.type === 'sell') ? -existingTransaction.eurPaid : existingTransaction.eurPaid, // 🟠 AGGIORNATO
      accountName: existingTransaction.portfolio.account?.name || 'Nessun conto collegato'
    })
  } catch (error) {
    console.error('Errore nella cancellazione transazione DCA:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione transazione DCA' },
      { status: 500 }
    )
  }
}