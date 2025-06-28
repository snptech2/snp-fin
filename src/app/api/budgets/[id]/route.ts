// src/app/api/budgets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

// PUT /api/budgets/[id] - Aggiorna budget
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const budgetId = parseInt(params.id)
    if (isNaN(budgetId)) {
      return NextResponse.json(
        { error: 'ID budget non valido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, targetAmount, type, order, color } = body

    // Verifica che il budget esista
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId
      }
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget non trovato' },
        { status: 404 }
      )
    }

    // Validazioni
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome budget obbligatorio' },
        { status: 400 }
      )
    }

    if (!type || !['fixed', 'unlimited'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo budget deve essere "fixed" o "unlimited"' },
        { status: 400 }
      )
    }

    if (type === 'fixed') {
      const parsedAmount = parseFloat(targetAmount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Importo deve essere un numero positivo per budget fissi' },
          { status: 400 }
        )
      }
    }

    const parsedOrder = parseInt(order)
    if (isNaN(parsedOrder) || parsedOrder < 1) {
      return NextResponse.json(
        { error: 'Priorità deve essere un numero positivo' },
        { status: 400 }
      )
    }

    // Validazione colore (opzionale)
    const budgetColor = color || existingBudget.color || '#3B82F6'
    if (budgetColor && !budgetColor.match(/^#[0-9A-F]{6}$/i)) {
      return NextResponse.json(
        { error: 'Colore deve essere in formato esadecimale (#RRGGBB)' },
        { status: 400 }
      )
    }

    // Verifica che non esista già un budget con la stessa priorità (escludendo quello corrente)
    if (parsedOrder !== existingBudget.order) {
      const existingBudgetWithOrder = await prisma.budget.findFirst({
        where: { 
          userId,
          order: parsedOrder,
          id: { not: budgetId }
        }
      })

      if (existingBudgetWithOrder) {
        return NextResponse.json(
          { error: 'Esiste già un budget con questa priorità' },
          { status: 400 }
        )
      }
    }

    // Verifica che non esista già un budget con lo stesso nome (escludendo quello corrente)
    if (name.trim() !== existingBudget.name) {
      const existingBudgetWithName = await prisma.budget.findFirst({
        where: { 
          userId,
          name: name.trim(),
          id: { not: budgetId }
        }
      })

      if (existingBudgetWithName) {
        return NextResponse.json(
          { error: 'Esiste già un budget con questo nome' },
          { status: 400 }
        )
      }
    }

    // Prepara i dati per l'aggiornamento
    const updateData: any = {
      name: name.trim(),
      targetAmount: type === 'fixed' ? parseFloat(targetAmount) : 0,
      type,
      order: parsedOrder,
      updatedAt: new Date()
    }

    // Aggiungi il colore solo se fornito o se esiste un colore di default
    if (budgetColor) {
      updateData.color = budgetColor
    }

    // Aggiorna il budget
    const updatedBudget = await prisma.budget.update({
      where: { id: budgetId },
      data: updateData
    })

    return NextResponse.json(updatedBudget)
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento budget:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del budget' },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets/[id] - Cancella budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Autenticazione
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const budgetId = parseInt(params.id)
    if (isNaN(budgetId)) {
      return NextResponse.json(
        { error: 'ID budget non valido' },
        { status: 400 }
      )
    }

    // Verifica che il budget esista
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId
      }
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget non trovato' },
        { status: 404 }
      )
    }

    // Cancella il budget
    await prisma.budget.delete({
      where: { id: budgetId }
    })

    return NextResponse.json({ 
      message: 'Budget cancellato con successo' 
    })
    
  } catch (error) {
    console.error('Errore nella cancellazione budget:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione del budget' },
      { status: 500 }
    )
  }
}