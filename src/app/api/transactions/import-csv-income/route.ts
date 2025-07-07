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

// POST - Import CSV per entrate
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inizio import CSV entrate')
    
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    console.log('✅ Auth successful, userId:', userId)
    
    const body = await request.json()
    const { csvData } = body
    
    console.log('📊 CSV data ricevuto:', csvData?.length, 'righe')
    
    // Debug prime righe ricevute
    if (csvData && csvData.length > 0) {
      console.log('🔍 Prime 3 righe ricevute:')
      csvData.slice(0, 3).forEach((row, index) => {
        console.log(`  Riga ${index + 1}:`, {
          data: row.data,
          descrizione: row.descrizione, 
          importo: row.importo,
          categoria: row.categoria,
          conto: row.conto
        })
      })
    }
    
    if (!csvData || !Array.isArray(csvData)) {
      console.log('❌ Dati CSV non validi')
      return NextResponse.json(
        { error: 'Dati CSV non validi' },
        { status: 400 }
      )
    }
    
    const result: ImportResult = {
      success: true,
      imported: 0,
      errors: [],
      createdCategories: []
    }
    
    // Ottieni conti e categorie esistenti
    console.log('🔍 Recupero conti e categorie esistenti...')
    
    const existingAccounts = await prisma.account.findMany({
      where: { userId, type: 'bank' }
    })
    
    const existingCategories = await prisma.category.findMany({
      where: { userId, type: 'income' }
    })
    
    console.log('🏦 Conti trovati:', existingAccounts.length)
    console.log('🏷️ Categorie trovate:', existingCategories.length)
    
    // Colori per nuove categorie entrate (blu/verde invece di rosso)
    const categoryColors = [
      '#3B82F6', '#1D4ED8', '#1E40AF', '#2563EB', '#60A5FA',
      '#10B981', '#059669', '#047857', '#065F46', '#6EE7B7',
      '#06B6D4', '#0891B2', '#14B8A6', '#0D9488', '#2DD4BF',
      '#84CC16', '#65A30D', '#16A34A', '#15803D', '#22C55E',
      '#F59E0B', '#D97706', '#F97316', '#EA580C', '#FB923C'
    ]
    
    // Processa in batch per gestire CSV grandi
    const BATCH_SIZE = 100 // Processa 100 righe per volta
    const totalBatches = Math.ceil(csvData.length / BATCH_SIZE)
    
    console.log(`📦 Processamento in ${totalBatches} batch da ${BATCH_SIZE} righe`)
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE
      const batchEnd = Math.min(batchStart + BATCH_SIZE, csvData.length)
      const batch = csvData.slice(batchStart, batchEnd)
      
      console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches}: righe ${batchStart + 1}-${batchEnd}`)
      
      // Processa ogni batch in transazione separata
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i] as CSVRow
          const rowNumber = batchStart + i + 2 // +2 perché row 1 è header, row 2 è primo dato
          
          try {
            // Validazione campi obbligatori (descrizione è opzionale)
            const missingFields = []
            if (!row.data) missingFields.push('data')
            if (!row.importo) missingFields.push('importo')
            if (!row.categoria) missingFields.push('categoria')
            // Nota: descrizione è opzionale, molte transazioni non hanno descrizione
            
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
              // Se il conto è specificato, cercalo
              account = findAccountByName(existingAccounts, row.conto)
              if (!account) {
                result.errors.push(`Riga ${rowNumber}: Conto non trovato - ${row.conto}`)
                continue
              }
            } else {
              // Se il conto è vuoto, usa il conto predefinito
              account = existingAccounts.find(acc => acc.isDefault) || existingAccounts[0]
              if (!account) {
                result.errors.push(`Riga ${rowNumber}: Nessun conto bancario disponibile per fallback`)
                continue
              }
            }
            
            // Trova o crea categoria
            let category = findCategoryByName(existingCategories, row.categoria)
            if (!category) {
              // Crea nuova categoria per entrate
              const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)]
              category = await tx.category.create({
                data: {
                  name: row.categoria.trim(),
                  type: 'income', // INCOME invece di expense
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
                type: 'income', // INCOME invece di expense
                accountId: account.id,
                categoryId: category.id,
                userId
              }
            })
            
            // Aggiorna saldo conto (INCREMENTO per entrate)
            await tx.account.update({
              where: { id: account.id },
              data: { balance: { increment: amount } } // INCREMENT invece di decrement
            })
            
            result.imported++
          } catch (error) {
            result.errors.push(`Riga ${rowNumber}: Errore imprevisto - ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
          }
        }
      }, {
        timeout: 30000, // 30 secondi per batch
        maxWait: 5000   // 5 secondi max wait per acquisire connessione
      })
      
      console.log(`✅ Batch ${batchIndex + 1} completato: ${result.imported} righe totali importate`)
    }
    
    console.log('✅ Import completato:', result.imported, 'righe importate')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Errore nell\\'import CSV entrate:', error)
    return NextResponse.json(
      { error: 'Errore nell\\'import CSV' },
      { status: 500 }
    )
  }
}

// Utility: Parse date in vari formati
function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim()
  
  // Formati supportati: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/    // YYYY-MM-DD
  ]
  
  // Prova prima i formati numerici
  for (const format of formats) {
    const match = cleaned.match(format)
    if (match) {
      let day, month, year
      
      if (format === formats[2]) { // YYYY-MM-DD
        year = parseInt(match[1])
        month = parseInt(match[2]) - 1 // JavaScript months are 0-based
        day = parseInt(match[3])
      } else { // DD/MM/YYYY or DD-MM-YYYY
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
  
  // Prova formato DD MMM YYYY (es: 19 Aug 2024)
  const monthNames = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
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

// Utility: Trova conto per nome (case-insensitive, fuzzy matching)
function findAccountByName(accounts: any[], name: string) {
  const cleanName = name.trim().toLowerCase()
  
  // Exact match
  let found = accounts.find(acc => acc.name.toLowerCase() === cleanName)
  if (found) return found
  
  // Partial match
  found = accounts.find(acc => 
    acc.name.toLowerCase().includes(cleanName) || 
    cleanName.includes(acc.name.toLowerCase())
  )
  
  return found || null
}

// Utility: Trova categoria per nome (case-insensitive)
function findCategoryByName(categories: any[], name: string) {
  const cleanName = name.trim().toLowerCase()
  return categories.find(cat => cat.name.toLowerCase() === cleanName) || null
}