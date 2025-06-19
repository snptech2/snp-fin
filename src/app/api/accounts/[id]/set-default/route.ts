// src/app/api/accounts/[id]/set-default/route.ts - API Route corretta per impostare conto predefinito

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = parseInt(params.id)
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 })
    }

    // Verifica che l'account esista e appartenga all'utente
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: 1 // TODO: sostituire con session reale
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Transazione per impostare questo account come default
    // e rimuovere il flag da tutti gli altri
    await prisma.$transaction(async (tx) => {
      // Rimuovi isDefault da tutti gli account dell'utente
      await tx.account.updateMany({
        where: {
          userId: 1, // TODO: sostituire con session reale
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })

      // Imposta questo account come default
      await tx.account.update({
        where: {
          id: accountId
        },
        data: {
          isDefault: true
        }
      })
    })

    // Restituisci l'account aggiornato
    const updatedAccount = await prisma.account.findUnique({
      where: { id: accountId }
    })

    return NextResponse.json(updatedAccount)
  } catch (error) {
    console.error('Error setting default account:', error)
    return NextResponse.json({ 
      error: 'Failed to set default account' 
    }, { status: 500 })
  }
}