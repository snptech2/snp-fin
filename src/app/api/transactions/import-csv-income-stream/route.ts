import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

interface CSVRow {
  data: string
  descrizione: string
  importo: string
  categoria: string
  conto: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  createdCategories: string[]
}

// POST - Import CSV per entrate con SSE
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inizio import CSV entrate con SSE')
    
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const body = await request.json()
    const { csvData } = body
    
    console.log('📊 CSV data ricevuto:', csvData?.length, 'righe')
    
    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { error: 'Dati CSV non validi' },
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
            errors: [],
            createdCategories: []
          }
          
          // Ottieni conti e categorie esistenti
          sendProgress({ type: 'status', message: 'Recupero conti e categorie esistenti...' })
          
          const existingAccounts = await prisma.account.findMany({
            where: { userId, type: 'bank' }
          })
          
          const existingCategories = await prisma.category.findMany({
            where: { userId, type: 'income' }
          })
          
          console.log('🏦 Conti trovati:', existingAccounts.length)
          console.log('🏷️ Categorie trovate:', existingCategories.length)
          
          // Colori per nuove categorie entrate (blu/verde)
          const categoryColors = [
            '#3B82F6', '#1D4ED8', '#1E40AF', '#2563EB', '#60A5FA',
            '#10B981', '#059669', '#047857', '#065F46', '#6EE7B7',
            '#06B6D4', '#0891B2', '#14B8A6', '#0D9488', '#2DD4BF',
            '#84CC16', '#65A30D', '#16A34A', '#15803D', '#22C55E',
            '#F59E0B', '#D97706', '#F97316', '#EA580C', '#FB923C'
          ]
          
          // Processa in batch per gestire CSV grandi
          const BATCH_SIZE = 100
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
                  if (!row.importo) missingFields.push('importo')
                  if (!row.categoria) missingFields.push('categoria')
                  
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
                  
                  // Validazione importo - gestisce formati italiani ed internazionali
                  let cleanAmount = row.importo
                    .replace(/[€$£¥]/g, '') // Rimuovi simboli di valuta
                    .trim()
                  
                  // Gestione dei vari formati numerici
                  if (cleanAmount.includes('.') && cleanAmount.includes(',')) {
                    // Due casi possibili:
                    // 1) Formato italiano: 1.234,56 (punto=migliaia, virgola=decimali)
                    // 2) Formato US/UK: 1,234.56 (virgola=migliaia, punto=decimali)
                    
                    const lastDotIndex = cleanAmount.lastIndexOf('.')
                    const lastCommaIndex = cleanAmount.lastIndexOf(',')
                    
                    if (lastCommaIndex > lastDotIndex) {
                      // Formato italiano: 1.234,56 -> virgola viene dopo il punto
                      cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.')
                    } else {
                      // Formato US: 1,234.56 -> punto viene dopo la virgola
                      cleanAmount = cleanAmount.replace(/,/g, '')
                    }
                  } else if (cleanAmount.includes(',') && !cleanAmount.includes('.')) {
                    // Solo virgola - può essere decimali o migliaia
                    const parts = cleanAmount.split(',')
                    if (parts.length === 2 && parts[1].length <= 2) {
                      // Probabile decimale: 1234,56
                      cleanAmount = cleanAmount.replace(',', '.')
                    } else {
                      // Probabile separatore migliaia: 1,234
                      cleanAmount = cleanAmount.replace(/,/g, '')
                    }
                  } else if (cleanAmount.includes('.')) {
                    // Solo punto - può essere decimali o migliaia
                    const parts = cleanAmount.split('.')
                    if (parts.length === 2 && parts[1].length <= 2) {
                      // Probabile decimale: 1234.56
                      cleanAmount = cleanAmount
                    } else {
                      // Probabile separatore migliaia: 1.234
                      cleanAmount = cleanAmount.replace(/\./g, '')
                    }
                  }
                  
                  const amount = parseFloat(cleanAmount)
                  if (isNaN(amount) || amount <= 0) {
                    result.errors.push(`Riga ${rowNumber}: Importo non valido - ${row.importo}`)
                    continue
                  }
                  
                  // Trova o crea conto
                  let account = null
                  if (row.conto && row.conto.trim()) {
                    account = findAccountByName(existingAccounts, row.conto)
                    if (!account) {
                      result.errors.push(`Riga ${rowNumber}: Conto non trovato - ${row.conto}`)
                      continue
                    }
                  } else {
                    account = existingAccounts.find(acc => acc.isDefault) || existingAccounts[0]
                    if (!account) {
                      result.errors.push(`Riga ${rowNumber}: Nessun conto bancario disponibile per fallback`)
                      continue
                    }
                  }
                  
                  // Trova o crea categoria
                  let category = findCategoryByName(existingCategories, row.categoria)
                  if (!category) {
                    const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)]
                    category = await tx.category.create({
                      data: {
                        name: row.categoria.trim(),
                        type: 'income',
                        color: randomColor,
                        userId
                      }
                    })
                    existingCategories.push(category)
                    result.createdCategories.push(category.name)
                  }
                  
                  // Crea transazione
                  await tx.transaction.create({
                    data: {
                      description: row.descrizione ? row.descrizione.trim() : null,
                      amount: amount,
                      date: dateValue,
                      type: 'income',
                      accountId: account.id,
                      categoryId: category.id,
                      userId
                    }
                  })
                  
                  // Aggiorna saldo conto (increment per entrate)
                  await tx.account.update({
                    where: { id: account.id },
                    data: { balance: { increment: amount } }
                  })
                  
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
              message: `Batch ${batchIndex + 1} completato: ${result.imported} righe totali importate`
            })
            
            console.log(`✅ Batch ${batchIndex + 1} completato: ${result.imported} righe totali importate`)
          }
          
          // Invia risultato finale
          sendProgress({ 
            type: 'complete', 
            result: {
              ...result,
              message: `Import completato: ${result.imported} entrate importate`
            }
          })
          
          console.log('✅ Import entrate completato:', result.imported, 'righe importate')
          controller.close()
        } catch (error) {
          console.error('Errore nell\'import CSV entrate:', error)
          sendProgress({ 
            type: 'error', 
            error: 'Errore nell\'import CSV entrate' 
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
    console.error('Errore nell\'import CSV SSE entrate:', error)
    return NextResponse.json(
      { error: 'Errore nell\'import CSV entrate' },
      { status: 500 }
    )
  }
}

// Utility functions (same as original)
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
    
    const month = (monthNames as any)[monthStr]
    if (month !== undefined) {
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  return null
}

function findAccountByName(accounts: any[], name: string) {
  const cleanName = name.trim().toLowerCase()
  
  let found = accounts.find(acc => acc.name.toLowerCase() === cleanName)
  if (found) return found
  
  found = accounts.find(acc => 
    acc.name.toLowerCase().includes(cleanName) || 
    cleanName.includes(acc.name.toLowerCase())
  )
  
  return found || null
}

function findCategoryByName(categories: any[], name: string) {
  const cleanName = name.trim().toLowerCase()
  return categories.find(cat => cat.name.toLowerCase() === cleanName) || null
}