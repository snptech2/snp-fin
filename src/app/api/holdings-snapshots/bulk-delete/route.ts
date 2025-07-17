// src/app/api/holdings-snapshots/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// DELETE - Elimina più snapshots contemporaneamente
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array di ID non valido' },
        { status: 400 }
      )
    }

    // Verifica che tutti gli snapshot appartengano all'utente
    const userSnapshots = await prisma.holdingsSnapshot.findMany({
      where: {
        id: { in: ids },
        userId
      },
      select: { id: true }
    })

    if (userSnapshots.length !== ids.length) {
      return NextResponse.json(
        { error: 'Alcuni snapshot non appartengono all\'utente' },
        { status: 403 }
      )
    }

    // Elimina tutti gli snapshot
    const result = await prisma.holdingsSnapshot.deleteMany({
      where: {
        id: { in: ids },
        userId
      }
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Eliminati ${result.count} snapshot con successo`
    })

  } catch (error) {
    console.error('Error bulk deleting holdings snapshots:', error)
    
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
            { error: 'Impossibile eliminare alcuni snapshot: ci sono record collegati' },
            { status: 409 }
          )
        case 'P2025':
          return NextResponse.json(
            { error: 'Alcuni snapshot non sono stati trovati' },
            { status: 404 }
          )
        default:
          console.error('Unhandled Prisma error code:', prismaError.code)
      }
    }
    
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione degli snapshot' },
      { status: 500 }
    )
  }
}