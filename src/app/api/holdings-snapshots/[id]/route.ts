// src/app/api/holdings-snapshots/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// DELETE - Elimina un singolo snapshot
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const params = await context.params
    const snapshotId = parseInt(params.id)
    
    if (isNaN(snapshotId)) {
      return NextResponse.json(
        { error: 'ID snapshot non valido' },
        { status: 400 }
      )
    }

    // Verifica che lo snapshot appartenga all'utente
    const snapshot = await prisma.holdingsSnapshot.findFirst({
      where: {
        id: snapshotId,
        userId
      }
    })

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot non trovato' },
        { status: 404 }
      )
    }

    // Elimina lo snapshot
    await prisma.holdingsSnapshot.delete({
      where: { id: snapshotId }
    })

    return NextResponse.json({
      success: true,
      message: 'Snapshot eliminato con successo'
    })

  } catch (error) {
    console.error('Error deleting holdings snapshot:', error)
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message?: string }
      
      switch (prismaError.code) {
        case 'P2003':
          return NextResponse.json(
            { error: 'Impossibile eliminare: ci sono record collegati' },
            { status: 409 }
          )
        case 'P2025':
          return NextResponse.json(
            { error: 'Snapshot non trovato' },
            { status: 404 }
          )
        case 'P2002':
          return NextResponse.json(
            { error: 'Violazione di vincolo univoco' },
            { status: 409 }
          )
        default:
          console.error('Unhandled Prisma error code:', prismaError.code)
      }
    }
    
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione dello snapshot' },
      { status: 500 }
    )
  }
}

// GET - Recupera un singolo snapshot
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const params = await context.params
    const snapshotId = parseInt(params.id)
    
    if (isNaN(snapshotId)) {
      return NextResponse.json(
        { error: 'ID snapshot non valido' },
        { status: 400 }
      )
    }

    const snapshot = await prisma.holdingsSnapshot.findFirst({
      where: {
        id: snapshotId,
        userId
      }
    })

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json(snapshot)

  } catch (error) {
    console.error('Error fetching holdings snapshot:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    
    return NextResponse.json(
      { error: 'Errore nel recupero dello snapshot' },
      { status: 500 }
    )
  }
}