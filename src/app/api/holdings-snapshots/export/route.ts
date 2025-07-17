// src/app/api/holdings-snapshots/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// GET - Export snapshots as CSV
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const format = searchParams.get('format') || 'excel' // 'excel' o 'standard'

    const whereClause: any = { userId }
    
    if (dateFrom || dateTo) {
      whereClause.date = {}
      if (dateFrom) whereClause.date.gte = new Date(dateFrom)
      if (dateTo) whereClause.date.lte = new Date(dateTo)
    }

    const snapshots = await prisma.holdingsSnapshot.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    })

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: 'Nessun snapshot trovato nel periodo specificato' },
        { status: 404 }
      )
    }

    let csvContent = ''

    if (format === 'excel') {
      // Formato compatibile con il file Excel dell'utente
      csvContent = 'Date,Time,BTCUSD,Dirty Dollars,Dirty Euro,BTC\n'
      
      snapshots.forEach(snapshot => {
        const date = new Date(snapshot.date)
        const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')
        const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        
        csvContent += `${dateStr},${timeStr},${snapshot.btcUsd},${snapshot.dirtyDollars},${snapshot.dirtyEuro},${snapshot.btc}\n`
      })
    } else {
      // Formato standard con tutti i campi
      csvContent = 'timestamp,btcUsd,dirtyDollars,dirtyEuro,btc,cryptoValue,dcaValue,isAutomatic,note\n'
      
      snapshots.forEach(snapshot => {
        const timestamp = snapshot.date.toISOString()
        const cryptoValue = snapshot.cryptoValue || ''
        const dcaValue = snapshot.dcaValue || ''
        const note = (snapshot.note || '').replace(/"/g, '""') // Escape quotes
        
        csvContent += `${timestamp},${snapshot.btcUsd},${snapshot.dirtyDollars},${snapshot.dirtyEuro},${snapshot.btc},${cryptoValue},${dcaValue},${snapshot.isAutomatic},"${note}"\n`
      })
    }

    // Genera nome file con date range
    const fromDate = dateFrom ? new Date(dateFrom).toISOString().split('T')[0] : 'inizio'
    const toDate = dateTo ? new Date(dateTo).toISOString().split('T')[0] : 'oggi'
    const filename = `holdings-snapshots-${fromDate}-${toDate}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error exporting holdings snapshots:', error)
    return NextResponse.json(
      { error: 'Errore nell\'esportazione degli snapshot' },
      { status: 500 }
    )
  }
}