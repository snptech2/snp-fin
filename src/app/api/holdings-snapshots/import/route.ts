// src/app/api/holdings-snapshots/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

// POST - Import CSV snapshots
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { csvData, skipDuplicates = true } = body

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        { error: 'Dati CSV mancanti o non validi' },
        { status: 400 }
      )
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File CSV deve contenere almeno un header e una riga di dati' },
        { status: 400 }
      )
    }

    // Verifica header (supporta il formato Excel dell'utente)
    const header = lines[0].toLowerCase()
    const expectedFields = ['date', 'time', 'btcusd', 'dirty', 'euro', 'btc']
    const hasValidHeader = expectedFields.filter(field => header.includes(field)).length >= 4
    
    if (!hasValidHeader) {
      return NextResponse.json(
        { error: 'Header CSV non riconosciuto. Formato atteso: Date,Time,BTCUSD,Dirty Dollars,Dirty Euro,BTC' },
        { status: 400 }
      )
    }

    const dataLines = lines.slice(1)
    const importedSnapshots = []
    const errors = []
    const skippedDetails = []
    let skippedCount = 0

    console.log(`📊 Starting import: ${dataLines.length} data lines to process`)
    console.log(`📊 Header detected: ${header}`)

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i].trim()
        if (!line) {
          console.log(`📊 Line ${i + 2}: Empty line, skipping`)
          continue
        }

        const values = line.split(',').map(v => v.trim())
        console.log(`📊 Line ${i + 2}: Processing values:`, values)
        
        if (values.length < 6) {
          const errorMsg = `Riga ${i + 2}: Numero di colonne insufficiente (${values.length} invece di 6)`
          console.log(`❌ ${errorMsg}`)
          errors.push(errorMsg)
          continue
        }

        // Parse dei valori dal formato Excel
        const [dateStr, timeStr, btcUsdStr, dirtyDollarsStr, dirtyEuroStr, btcStr] = values

        // Combina date e time in un timestamp (gestione di formati diversi)
        let combinedDateTime: Date
        
        try {
          // Prova formato DD/MM/YYYY
          const [day, month, year] = dateStr.split('/')
          
          // Gestisce timeStr che può essere HH:MM o HH:MM:SS
          let timeFormatted = timeStr
          if (timeStr.split(':').length === 2) {
            timeFormatted = timeStr + ':00' // Aggiungi secondi se mancanti
          }
          
          // Assicurati che l'ora abbia sempre 2 cifre (0:53:18 -> 00:53:18)
          const timeParts = timeFormatted.split(':')
          if (timeParts[0].length === 1) {
            timeParts[0] = '0' + timeParts[0]
          }
          timeFormatted = timeParts.join(':')
          
          combinedDateTime = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeFormatted}`)
          
          // Se la data non è valida, prova altri formati
          if (isNaN(combinedDateTime.getTime())) {
            // Prova formato MM/DD/YYYY
            const [month2, day2, year2] = dateStr.split('/')
            combinedDateTime = new Date(`${year2}-${month2.padStart(2, '0')}-${day2.padStart(2, '0')}T${timeFormatted}`)
          }
          
          // Se ancora non è valida, prova formato ISO
          if (isNaN(combinedDateTime.getTime())) {
            combinedDateTime = new Date(`${dateStr}T${timeFormatted}`)
          }
        } catch (dateError) {
          combinedDateTime = new Date(NaN)
        }
        
        console.log(`📊 Line ${i + 2}: Date parsing - Input: "${dateStr} ${timeStr}" -> Output: "${combinedDateTime.toISOString()}"`)
        
        if (isNaN(combinedDateTime.getTime())) {
          const errorMsg = `Riga ${i + 2}: Formato data/ora non valido: ${dateStr} ${timeStr}`
          console.log(`❌ ${errorMsg}`)
          errors.push(errorMsg)
          continue
        }

        // Parse dei valori numerici (rimuove virgole e spazi)
        const cleanNumber = (str: string) => {
          return parseFloat(str.replace(/[,\s]/g, '').trim())
        }
        
        const btcUsd = cleanNumber(btcUsdStr)
        const dirtyDollars = cleanNumber(dirtyDollarsStr)
        const dirtyEuro = cleanNumber(dirtyEuroStr)
        const btc = cleanNumber(btcStr)

        console.log(`📊 Line ${i + 2}: Numeric values - BTC/USD: ${btcUsd}, Dirty $: ${dirtyDollars}, Dirty €: ${dirtyEuro}, BTC: ${btc}`)

        if (isNaN(btcUsd) || isNaN(dirtyDollars) || isNaN(dirtyEuro) || isNaN(btc)) {
          const errorMsg = `Riga ${i + 2}: Valori numerici non validi - BTC/USD: ${btcUsdStr}, Dirty $: ${dirtyDollarsStr}, Dirty €: ${dirtyEuroStr}, BTC: ${btcStr}`
          console.log(`❌ ${errorMsg}`)
          errors.push(errorMsg)
          continue
        }

        // Controlla duplicati se richiesto
        if (skipDuplicates) {
          console.log(`📊 Line ${i + 2}: Checking for duplicates with date: ${combinedDateTime.toISOString()}`)
          
          const existing = await prisma.holdingsSnapshot.findFirst({
            where: {
              userId,
              date: combinedDateTime
            }
          })

          if (existing) {
            skippedCount++
            const skipMsg = `Riga ${i + 2}: Duplicato per data ${dateStr} ${timeStr} (existing ID: ${existing.id})`
            skippedDetails.push(skipMsg)
            console.log(`⚠️ ${skipMsg}`)
            continue
          } else {
            console.log(`✅ Line ${i + 2}: No duplicate found, proceeding with import`)
          }
        }

        // Crea lo snapshot
        console.log(`📊 Line ${i + 2}: Creating snapshot with data:`, {
          userId,
          date: combinedDateTime.toISOString(),
          btcUsd: Math.round(btcUsd * 100) / 100,
          dirtyDollars: Math.round(dirtyDollars * 100) / 100,
          dirtyEuro: Math.round(dirtyEuro * 100) / 100,
          btc: Math.round(btc * 10000000) / 10000000
        })

        const snapshot = await prisma.holdingsSnapshot.create({
          data: {
            userId,
            date: combinedDateTime,
            btcUsd: Math.round(btcUsd * 100) / 100,
            dirtyDollars: Math.round(dirtyDollars * 100) / 100,
            dirtyEuro: Math.round(dirtyEuro * 100) / 100,
            btc: Math.round(btc * 10000000) / 10000000,
            isAutomatic: false,
            note: 'Imported from CSV'
          }
        })

        importedSnapshots.push(snapshot)
        console.log(`✅ Line ${i + 2}: Successfully imported snapshot ID ${snapshot.id}: ${dateStr} ${timeStr}`)

      } catch (error) {
        const errorMsg = `Riga ${i + 2}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        errors.push(errorMsg)
        console.log(`❌ Line ${i + 2}: Error creating snapshot: ${errorMsg}`)
      }
    }

    console.log(`📊 Import completed: ${importedSnapshots.length} imported, ${skippedCount} skipped, ${errors.length} errors`)
    console.log(`📊 Final statistics:`)
    console.log(`📊 - Total lines processed: ${dataLines.length}`)
    console.log(`📊 - Successfully imported: ${importedSnapshots.length}`)
    console.log(`📊 - Skipped as duplicates: ${skippedCount}`)
    console.log(`📊 - Errors encountered: ${errors.length}`)
    console.log(`📊 - Success rate: ${((importedSnapshots.length / dataLines.length) * 100).toFixed(1)}%`)

    // Log primi errori per debug
    if (errors.length > 0) {
      console.log(`📊 First 5 errors:`)
      errors.slice(0, 5).forEach(error => console.log(`❌ ${error}`))
    }

    // Log primi skip per debug
    if (skippedCount > 0) {
      console.log(`📊 First 5 skipped records:`)
      skippedDetails.slice(0, 5).forEach(skip => console.log(`⚠️ ${skip}`))
    }

    return NextResponse.json({
      success: true,
      imported: importedSnapshots.length,
      skipped: skippedCount,
      errors,
      skippedDetails: skippedDetails.slice(0, 10), // Prime 10 per non sovraccaricare
      totalProcessed: dataLines.length,
      successRate: ((importedSnapshots.length / dataLines.length) * 100).toFixed(1),
      message: `Importati ${importedSnapshots.length} snapshot su ${dataLines.length} righe (${((importedSnapshots.length / dataLines.length) * 100).toFixed(1)}%)${skippedCount > 0 ? `, saltati ${skippedCount} duplicati` : ''}${errors.length > 0 ? `, ${errors.length} errori` : ''}`
    })

  } catch (error) {
    console.error('Error importing holdings snapshots:', error)
    return NextResponse.json(
      { error: 'Errore nell\'importazione degli snapshot' },
      { status: 500 }
    )
  }
}