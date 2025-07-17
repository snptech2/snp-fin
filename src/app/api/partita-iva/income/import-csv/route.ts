import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

interface CSVRow {
  dataIncasso: string
  dataEmissione: string
  riferimento: string
  entrata: string
  anno: string
  conto?: string
  descrizione?: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  createdConfigs: string[]
}

// Utility: Pulisce un valore numerico gestendo diversi formati
function cleanNumericValue(value: string): string {
  if (!value || typeof value !== 'string') return '0'
  
  const trimmed = value.trim()
  
  // Rimuovi simboli di valuta
  let cleaned = trimmed.replace(/[€$£¥¢₹₽₩]/g, '')
  
  // Rimuovi spazi
  cleaned = cleaned.replace(/\s+/g, '')
  
  // Gestisci formati numerici diversi
  
  // Formato italiano: 1.234,56 -> 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastCommaIndex = cleaned.lastIndexOf(',')
    const lastDotIndex = cleaned.lastIndexOf('.')
    
    if (lastCommaIndex > lastDotIndex) {
      // Formato: 1.234,56 (virgola per decimali)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato: 1,234.56 (punto per decimali)
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Solo virgola - potrebbe essere decimale o migliaia
    const commaIndex = cleaned.indexOf(',')
    const afterComma = cleaned.substring(commaIndex + 1)
    
    if (afterComma.length <= 2) {
      // Probabilmente decimale: 1234,56 -> 1234.56
      cleaned = cleaned.replace(',', '.')
    } else {
      // Probabilmente migliaia: 1,234 -> 1234
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Solo punto - potrebbe essere decimale o migliaia
    const dotIndex = cleaned.lastIndexOf('.')
    const afterDot = cleaned.substring(dotIndex + 1)
    
    if (afterDot.length > 2) {
      // Probabilmente migliaia: 1.234 -> 1234
      cleaned = cleaned.replace(/\./g, '')
    }
    // Altrimenti è già formato corretto: 1234.56
  }
  
  // Rimuovi caratteri non numerici rimanenti (eccetto punto decimale)
  cleaned = cleaned.replace(/[^0-9.]/g, '')
  
  // Assicurati che ci sia un solo punto decimale
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  
  return cleaned || '0'
}

// POST - Import CSV per entrate Partita IVA
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inizio import CSV Partita IVA')
    
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
      csvData.slice(0, 3).forEach((row: any, index: number) => {
        console.log(`  Riga ${index + 1}:`, {
          dataIncasso: row.dataIncasso,
          dataEmissione: row.dataEmissione,
          riferimento: row.riferimento,
          entrata: row.entrata,
          anno: row.anno,
          conto: row.conto,
          descrizione: row.descrizione
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
      createdConfigs: []
    }
    
    // Ottieni conti esistenti
    console.log('🔍 Recupero conti esistenti...')
    
    const existingAccounts = await prisma.account.findMany({
      where: { userId, type: 'bank' }
    })
    
    console.log('🏦 Conti trovati:', existingAccounts.length)
    
    // Ottieni configurazioni P.IVA esistenti
    const existingConfigs = await prisma.partitaIVAConfig.findMany({
      where: { userId }
    })
    
    console.log('⚙️ Configurazioni P.IVA trovate:', existingConfigs.length)
    
    // Processa in batch per gestire CSV grandi
    const BATCH_SIZE = 100
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
            // Validazione campi obbligatori
            const missingFields = []
            if (!row.dataIncasso) missingFields.push('dataIncasso')
            if (!row.dataEmissione) missingFields.push('dataEmissione')
            if (!row.riferimento) missingFields.push('riferimento')
            if (!row.entrata) missingFields.push('entrata')
            if (!row.anno) missingFields.push('anno')
            
            if (missingFields.length > 0) {
              result.errors.push(`Riga ${rowNumber}: Campi obbligatori mancanti: ${missingFields.join(', ')}`)
              continue
            }
            
            // Validazione e parsing data incasso
            const dataIncasso = parseDate(row.dataIncasso)
            if (!dataIncasso) {
              result.errors.push(`Riga ${rowNumber}: Data incasso non valida - ${row.dataIncasso}`)
              continue
            }
            
            // Validazione e parsing data emissione
            const dataEmissione = parseDate(row.dataEmissione)
            if (!dataEmissione) {
              result.errors.push(`Riga ${rowNumber}: Data emissione non valida - ${row.dataEmissione}`)
              continue
            }
            
            // Validazione anno
            const anno = parseInt(row.anno.trim())
            if (isNaN(anno) || anno < 2000 || anno > 2100) {
              result.errors.push(`Riga ${rowNumber}: Anno non valido - ${row.anno}`)
              continue
            }
            
            // Validazione importo entrata con supporto per diversi formati
            const cleanAmount = cleanNumericValue(row.entrata)
            
            const entrata = parseFloat(cleanAmount)
            if (isNaN(entrata) || entrata <= 0) {
              result.errors.push(`Riga ${rowNumber}: Importo entrata non valido - ${row.entrata} (pulito: ${cleanAmount})`)
              continue
            }
            
            // Trova o crea configurazione P.IVA per l'anno
            let config = existingConfigs.find(c => c.anno === anno)
            if (!config) {
              // Crea configurazione con valori predefiniti
              config = await tx.partitaIVAConfig.create({
                data: {
                  userId,
                  anno,
                  percentualeImponibile: 78.0, // Default 78%
                  percentualeImposta: 5.0,     // Default 5%
                  percentualeContributi: 26.23  // Default 26.23%
                }
              })
              existingConfigs.push(config)
              result.createdConfigs.push(`Anno ${anno}`)
            }
            
            // Verifica duplicati per riferimento e configurazione
            const existingIncome = await tx.partitaIVAIncome.findFirst({
              where: {
                userId,
                riferimento: row.riferimento.trim(),
                configId: config.id
              }
            })
            
            if (existingIncome) {
              result.errors.push(`Riga ${rowNumber}: Riferimento duplicato per anno ${anno} - ${row.riferimento}`)
              continue
            }
            
            // Calcola valori fiscali
            const imponibile = (entrata * config.percentualeImponibile) / 100
            const imposta = (imponibile * config.percentualeImposta) / 100
            const contributi = (imponibile * config.percentualeContributi) / 100
            const totaleTasse = imposta + contributi
            
            // Trova conto bancario se specificato, altrimenti usa quello predefinito
            let account = null
            if (row.conto && row.conto.trim()) {
              account = findAccountByName(existingAccounts, row.conto)
              if (!account) {
                result.errors.push(`Riga ${rowNumber}: Conto non trovato - ${row.conto}`)
                continue
              }
            } else {
              // Se non specificato, usa il conto predefinito
              account = existingAccounts.find(acc => acc.isDefault) || existingAccounts[0] || null
            }
            
            // Crea entrata Partita IVA
            const partitaIVAIncome = await tx.partitaIVAIncome.create({
              data: {
                userId,
                dataIncasso,
                dataEmissione,
                riferimento: row.riferimento.trim(),
                entrata,
                imponibile,
                imposta,
                contributi,
                totaleTasse,
                configId: config.id,
                accountId: account?.id || null
              }
            })
            
            // Se è specificato un conto, crea anche transazione regolare
            if (account) {
              // Trova o crea categoria "Entrate Partita IVA"
              let category = await tx.category.findFirst({
                where: {
                  userId,
                  name: 'Entrate Partita IVA',
                  type: 'income'
                }
              })
              
              if (!category) {
                category = await tx.category.create({
                  data: {
                    userId,
                    name: 'Entrate Partita IVA',
                    type: 'income',
                    color: '#22C55E'
                  }
                })
              }
              
              // Crea transazione
              await tx.transaction.create({
                data: {
                  userId,
                  description: `${row.riferimento} - ${row.descrizione || 'Entrata P.IVA'}`,
                  amount: entrata,
                  date: dataIncasso,
                  type: 'income',
                  accountId: account.id,
                  categoryId: category.id
                }
              })
              
              // Aggiorna saldo conto
              await tx.account.update({
                where: { id: account.id },
                data: { balance: { increment: entrata } }
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
      
      console.log(`✅ Batch ${batchIndex + 1} completato: ${result.imported} righe totali importate`)
    }
    
    // Aggiorna budget "Riserva Tasse" se ci sono state importazioni
    if (result.imported > 0) {
      await updateTaxReserveBudget(userId)
    }
    
    console.log('✅ Import completato:', result.imported, 'righe importate')
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Errore nell\'import CSV Partita IVA:', error)
    return NextResponse.json(
      { error: 'Errore nell\'import CSV Partita IVA' },
      { status: 500 }
    )
  }
}

// Utility: Parse date in vari formati
function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim()
  
  console.log(`🔍 Parsing date: "${cleaned}"`)
  
  // Formati numerici supportati: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const numericFormats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  ]
  
  // Prova prima i formati numerici
  for (const format of numericFormats) {
    const match = cleaned.match(format)
    if (match) {
      let day, month, year
      
      if (format === numericFormats[2]) { // YYYY-MM-DD
        year = parseInt(match[1])
        month = parseInt(match[2]) - 1
        day = parseInt(match[3])
      } else { // DD/MM/YYYY or DD-MM-YYYY
        day = parseInt(match[1])
        month = parseInt(match[2]) - 1
        year = parseInt(match[3])
      }
      
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        console.log(`✅ Parsed numeric date: ${day}/${month + 1}/${year}`)
        return date
      }
    }
  }
  
  // Mapping mesi inglesi
  const englishMonths = {
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
  
  // Prova formato inglese: DD MMM YYYY (es: "19 Oct 2023")
  const englishMatch = cleaned.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/)
  if (englishMatch) {
    const day = parseInt(englishMatch[1])
    const monthStr = englishMatch[2].toLowerCase()
    const year = parseInt(englishMatch[3])
    
    const month = englishMonths[monthStr as keyof typeof englishMonths]
    if (month !== undefined) {
      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        console.log(`✅ Parsed English date: ${day}/${month + 1}/${year} (${monthStr})`)
        return date
      }
    } else {
      console.log(`❌ Unknown English month: "${monthStr}"`)
    }
  }
  
  console.log(`❌ Could not parse date: "${cleaned}"`)
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

// Utility: Aggiorna budget "Riserva Tasse"
async function updateTaxReserveBudget(userId: number) {
  try {
    console.log('💰 Aggiornamento budget Riserva Tasse...')
    
    // Calcola totale tasse dovute
    const totalTaxes = await prisma.partitaIVAIncome.aggregate({
      where: { userId },
      _sum: { totaleTasse: true }
    })
    
    const totalTaxPayments = await prisma.partitaIVATaxPayment.aggregate({
      where: { userId },
      _sum: { importo: true }
    })
    
    const remainingTaxes = (totalTaxes._sum.totaleTasse || 0) - (totalTaxPayments._sum.importo || 0)
    
    if (remainingTaxes > 0) {
      // Trova o crea budget "Riserva Tasse"
      let budget = await prisma.budget.findFirst({
        where: {
          userId,
          name: 'Riserva Tasse'
        }
      })
      
      if (!budget) {
        budget = await prisma.budget.create({
          data: {
            userId,
            name: 'Riserva Tasse',
            targetAmount: remainingTaxes,
            type: 'fixed',
            order: 1
          }
        })
      } else {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { targetAmount: remainingTaxes }
        })
      }
      
      console.log(`✅ Budget Riserva Tasse aggiornato: €${remainingTaxes.toFixed(2)}`)
    }
    
  } catch (error) {
    console.error('Errore aggiornamento budget Riserva Tasse:', error)
  }
}