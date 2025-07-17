// src/app/api/holdings-snapshots/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// GET - Ottieni impostazioni snapshot utente
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    let settings = await prisma.snapshotSettings.findUnique({
      where: { userId }
    })

    // Se non esiste, crea impostazioni di default
    if (!settings) {
      settings = await prisma.snapshotSettings.create({
        data: {
          userId,
          autoSnapshotEnabled: false,
          frequency: 'daily',
          preferredHour: null,
          lastSnapshot: null
        }
      })
    }

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Error fetching snapshot settings:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle impostazioni' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna impostazioni snapshot
export async function PUT(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { autoSnapshotEnabled, frequency, preferredHour } = body

    // Validazione
    const validFrequencies = ['6hours', 'daily', 'weekly', 'monthly']
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequenza non valida. Valori supportati: 6hours, daily, weekly, monthly' },
        { status: 400 }
      )
    }

    if (preferredHour !== null && preferredHour !== undefined) {
      const hour = parseInt(preferredHour)
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return NextResponse.json(
          { error: 'Ora preferita deve essere tra 0 e 23' },
          { status: 400 }
        )
      }
    }

    // Upsert delle impostazioni
    const settings = await prisma.snapshotSettings.upsert({
      where: { userId },
      update: {
        autoSnapshotEnabled: autoSnapshotEnabled ?? undefined,
        frequency: frequency ?? undefined,
        preferredHour: preferredHour !== undefined ? preferredHour : undefined,
        updatedAt: new Date()
      },
      create: {
        userId,
        autoSnapshotEnabled: autoSnapshotEnabled ?? false,
        frequency: frequency ?? 'daily',
        preferredHour: preferredHour ?? null,
        lastSnapshot: null
      }
    })

    return NextResponse.json({
      success: true,
      settings,
      message: 'Impostazioni aggiornate con successo'
    })

  } catch (error) {
    console.error('Error updating snapshot settings:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento delle impostazioni' },
      { status: 500 }
    )
  }
}