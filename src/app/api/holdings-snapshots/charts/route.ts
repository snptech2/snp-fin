// src/app/api/holdings-snapshots/charts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// GET - Ottieni dati per i grafici degli snapshot
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    // Ottieni la valuta dell'utente
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    })
    const userCurrency = user?.currency || 'EUR'

    // Ottieni tutti gli snapshot dell'utente ordinati per data
    const snapshots = await prisma.holdingsSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        dirtyEuro: true,
        dirtyDollars: true,
        btc: true
      }
    })

    // Prepara i dati per i grafici
    const chartData = snapshots.map(snapshot => ({
      date: snapshot.date.toISOString(),
      fiatValue: userCurrency === 'USD' ? snapshot.dirtyDollars : snapshot.dirtyEuro,
      btcValue: snapshot.btc
    }))

    return NextResponse.json({
      success: true,
      data: chartData,
      currency: userCurrency,
      totalSnapshots: snapshots.length
    })

  } catch (error) {
    console.error('Error fetching chart data:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei dati per i grafici' },
      { status: 500 }
    )
  }
}