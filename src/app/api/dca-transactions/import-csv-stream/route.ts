import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

interface CSVRow {
  data: string
  tipo: string
  broker: string
  info: string
  quantita_btc: string
  eur_pagati: string
  note: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
}

// POST - Import CSV per transazioni DCA con SSE
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inizio import CSV transazioni DCA con SSE')
    
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { csvData, portfolioId } = body
    
    console.log('📊 CSV data ricevuto:', csvData?.length, 'righe per portfolio:', portfolioId)
    
    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { error: 'Dati CSV non validi' },
        { status: 400 }
      )
    }

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'ID Portfolio richiesto per import DCA' },
        { status: 400 }
      )
    }
    
    // Crea ReadableStream per SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const sendProgress = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }
        
        try {
          const result: ImportResult = {
            success: true,
            imported: 0,
            errors: []
          }
          
          // Verifica che il portfolio esista e appartenga all'utente
          sendProgress({ type: 'status', message: 'Verifica portfolio DCA...' })
          
          const portfolio = await prisma.dCAPortfolio.findUnique({
            where: { id: parseInt(portfolioId) },
            include: {
              account: true
            }
          })
          
          if (!portfolio || portfolio.userId !== userId) {
            sendProgress({ 
              type: 'error', 
              error: 'Portfolio DCA non trovato o non autorizzato' 
            })
            controller.close()
            return
          }

          if (!portfolio.account) {
            sendProgress({ 
              type: 'error', 
              error: 'Portfolio non ha un conto di investimento collegato' 
            })
            controller.close()
            return
          }
          
          console.log('🏦 Portfolio trovato:', portfolio.name)
          console.log('💰 Conto collegato:', portfolio.account.name, 'saldo:', portfolio.account.balance)
          
          // Processa in batch per gestire CSV grandi
          const BATCH_SIZE = 50
          const totalBatches = Math.ceil(csvData.length / BATCH_SIZE)
          
          sendProgress({ 
            type: 'progress', 
            current: 0, 
            total: csvData.length, 
            currentBatch: 0, 
            totalBatches,
            message: `Processamento in ${totalBatches} batch da ${BATCH_SIZE} righe`
          })
          
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * BATCH_SIZE
            const batchEnd = Math.min(batchStart + BATCH_SIZE, csvData.length)
            const batch = csvData.slice(batchStart, batchEnd)
            
            sendProgress({ 
              type: 'progress',
              current: batchStart,
              total: csvData.length,
              currentBatch: batchIndex + 1,
              totalBatches,
              message: `Processando batch ${batchIndex + 1}/${totalBatches}: righe ${batchStart + 1}-${batchEnd}`
            })
            
            console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches}: righe ${batchStart + 1}-${batchEnd}`)
            
            // Processa ogni batch in transazione separata
            await prisma.$transaction(async (tx) => {
              for (let i = 0; i < batch.length; i++) {
                const row = batch[i] as CSVRow
                const rowNumber = batchStart + i + 2
                
                try {
                  // Validazione campi obbligatori
                  const missingFields = []
                  if (!row.data) missingFields.push('data')
                  if (!row.tipo) missingFields.push('tipo')
                  if (!row.broker) missingFields.push('broker')
                  if (!row.info) missingFields.push('info')
                  if (!row.quantita_btc) missingFields.push('quantita_btc')
                  if (!row.eur_pagati) missingFields.push('eur_pagati')
                  
                  if (missingFields.length > 0) {
                    result.errors.push(`Riga ${rowNumber}: Campi obbligatori mancanti: ${missingFields.join(', ')}`)
                    continue
                  }
                  
                  // Validazione e parsing data
                  const dateValue = parseDate(row.data)
                  if (!dateValue) {
                    result.errors.push(`Riga ${rowNumber}: Data non valida - ${row.data}`)
                    continue
                  }
                  
                  // Validazione tipo transazione
                  const transactionType = row.tipo.toLowerCase().trim()
                  if (transactionType !== 'buy' && transactionType !== 'sell') {
                    result.errors.push(`Riga ${rowNumber}: Tipo transazione non valido - ${row.tipo} (deve essere 'buy' o 'sell')`)
                    continue
                  }
                  
                  // Validazione quantità BTC
                  const btcQuantity = parseFloat(row.quantita_btc.trim())
                  if (isNaN(btcQuantity) || btcQuantity <= 0) {
                    result.errors.push(`Riga ${rowNumber}: Quantità BTC non valida - ${row.quantita_btc}`)
                    continue
                  }
                  
                  // Validazione importo EUR - gestisce formati italiani ed internazionali
                  let cleanEurAmount = row.eur_pagati
                    .replace(/[€$£¥]/g, '') // Rimuovi simboli di valuta
                    .trim()
                  
                  // Gestione dei vari formati numerici
                  if (cleanEurAmount.includes('.') && cleanEurAmount.includes(',')) {
                    const lastDotIndex = cleanEurAmount.lastIndexOf('.')
                    const lastCommaIndex = cleanEurAmount.lastIndexOf(',')
                    
                    if (lastCommaIndex > lastDotIndex) {
                      // Formato italiano: 1.234,56 -> virgola viene dopo il punto
                      cleanEurAmount = cleanEurAmount.replace(/\./g, '').replace(',', '.')
                    } else {
                      // Formato US: 1,234.56 -> punto viene dopo la virgola
                      cleanEurAmount = cleanEurAmount.replace(/,/g, '')
                    }
                  } else if (cleanEurAmount.includes(',') && !cleanEurAmount.includes('.')) {
                    // Solo virgola - può essere decimali o migliaia
                    const parts = cleanEurAmount.split(',')
                    if (parts.length === 2 && parts[1].length <= 2) {
                      // Probabile decimale: 1234,56
                      cleanEurAmount = cleanEurAmount.replace(',', '.')
                    } else {
                      // Probabile separatore migliaia: 1,234
                      cleanEurAmount = cleanEurAmount.replace(/,/g, '')
                    }
                  } else if (cleanEurAmount.includes('.')) {
                    // Solo punto - può essere decimali o migliaia
                    const parts = cleanEurAmount.split('.')
                    if (parts.length === 2 && parts[1].length <= 2) {
                      // Probabile decimale: 1234.56
                      cleanEurAmount = cleanEurAmount
                    } else {
                      // Probabile separatore migliaia: 1.234
                      cleanEurAmount = cleanEurAmount.replace(/\./g, '')
                    }
                  }
                  
                  const eurAmount = parseFloat(cleanEurAmount)
                  if (isNaN(eurAmount) || eurAmount <= 0) {
                    result.errors.push(`Riga ${rowNumber}: Importo EUR non valido - ${row.eur_pagati}`)
                    continue
                  }
                  
                  // Validazione saldo per acquisti
                  if (transactionType === 'buy') {
                    const currentBalance = await tx.account.findUnique({
                      where: { id: portfolio.account.id },
                      select: { balance: true }
                    })
                    
                    if (!currentBalance || currentBalance.balance < eurAmount) {
                      result.errors.push(`Riga ${rowNumber}: Saldo insufficiente per acquisto di €${eurAmount} (saldo: €${currentBalance?.balance || 0})`)
                      continue
                    }
                  }
                  
                  // Crea transazione DCA
                  await tx.dCATransaction.create({
                    data: {
                      portfolioId: parseInt(portfolioId),
                      date: dateValue,
                      type: transactionType,
                      broker: row.broker.trim(),
                      info: row.info.trim(),
                      btcQuantity: transactionType === 'buy' ? btcQuantity : -btcQuantity,
                      eurPaid: eurAmount,
                      notes: row.note ? row.note.trim() : null,
                      accountId: portfolio.account.id
                    }
                  })
                  
                  // Aggiorna saldo conto
                  if (transactionType === 'buy') {
                    await tx.account.update({
                      where: { id: portfolio.account.id },
                      data: { balance: { decrement: eurAmount } }
                    })
                  } else {
                    await tx.account.update({
                      where: { id: portfolio.account.id },
                      data: { balance: { increment: eurAmount } }
                    })
                  }
                  
                  result.imported++
                } catch (error) {
                  result.errors.push(`Riga ${rowNumber}: Errore imprevisto - ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
                }
              }
            }, {
              timeout: 30000,
              maxWait: 5000
            })
            
            // Invia progress update dopo ogni batch
            sendProgress({ 
              type: 'progress',
              current: batchEnd,
              total: csvData.length,
              currentBatch: batchIndex + 1,
              totalBatches,
              imported: result.imported,
              message: `Batch ${batchIndex + 1} completato: ${result.imported} transazioni DCA totali importate`
            })
            
            console.log(`✅ Batch ${batchIndex + 1} completato: ${result.imported} transazioni DCA totali importate`)
          }
          
          // Invia risultato finale
          sendProgress({ 
            type: 'complete', 
            result: {
              ...result,
              message: `Import completato: ${result.imported} transazioni DCA importate`
            }
          })
          
          console.log('✅ Import transazioni DCA completato:', result.imported, 'transazioni importate')
          controller.close()
        } catch (error) {
          console.error('Errore nell\'import CSV transazioni DCA:', error)
          sendProgress({ 
            type: 'error', 
            error: 'Errore nell\'import CSV transazioni DCA' 
          })
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('Errore nell\'import CSV SSE transazioni DCA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'import CSV transazioni DCA' },
      { status: 500 }
    )
  }
}

// Utility functions
function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim()
  
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  ]
  
  for (const format of formats) {
    const match = cleaned.match(format)
    if (match) {
      let day, month, year
      
      if (format === formats[2]) {
        year = parseInt(match[1])
        month = parseInt(match[2]) - 1
        day = parseInt(match[3])
      } else {
        day = parseInt(match[1])
        month = parseInt(match[2]) - 1
        year = parseInt(match[3])
      }
      
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  const monthNames = {
    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
    'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
    'nov': 10, 'november': 10, 'dec': 11, 'december': 11
  }
  
  const monthMatch = cleaned.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/)
  if (monthMatch) {
    const day = parseInt(monthMatch[1])
    const monthStr = monthMatch[2].toLowerCase()
    const year = parseInt(monthMatch[3])
    
    const month = monthNames[monthStr]
    if (month !== undefined) {
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  return null
}