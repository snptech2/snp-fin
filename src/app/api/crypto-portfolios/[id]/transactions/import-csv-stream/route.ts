import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '@/lib/auth-middleware'

const prisma = new PrismaClient()

interface CSVRow {
  data: string
  tipo: string
  asset: string
  asset_to?: string // Per swap
  quantita: string
  quantita_to?: string // Per swap
  valore_eur?: string // Opzionale per swap
  prezzo_unitario?: string
  broker: string
  note: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
}

// POST - Import CSV per transazioni crypto con SSE
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 Inizio import CSV transazioni crypto con SSE')
    
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const resolvedParams = await params
    const portfolioId = parseInt(resolvedParams.id)
    
    const body = await request.json()
    const { csvData } = body
    
    console.log('📊 CSV data ricevuto:', csvData?.length, 'righe per portfolio:', portfolioId)
    
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
            errors: []
          }
          
          // Verifica che il portfolio esista e appartenga all'utente
          sendProgress({ type: 'status', message: 'Verifica portfolio crypto...' })
          
          const portfolio = await prisma.cryptoPortfolio.findFirst({
            where: { 
              id: portfolioId, 
              userId
            },
            include: {
              account: true,
              holdings: {
                include: { asset: true }
              }
            }
          })
          
          if (!portfolio) {
            sendProgress({ 
              type: 'error', 
              error: 'Portfolio crypto non trovato o non autorizzato' 
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
                const currentProgress = batchStart + i + 1
                
                try {
                  // Validazione campi obbligatori
                  const missingFields = []
                  if (!row.data) missingFields.push('data')
                  if (!row.tipo) missingFields.push('tipo')
                  if (!row.asset) missingFields.push('asset')
                  if (!row.quantita) missingFields.push('quantita')
                  // valore_eur è opzionale per swap, obbligatorio per altri tipi
                  if (!row.valore_eur && row.tipo?.toLowerCase().trim() !== 'swap') {
                    missingFields.push('valore_eur')
                  }
                  if (!row.broker) missingFields.push('broker')
                  
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
                  if (!['buy', 'sell', 'stake_reward', 'swap'].includes(transactionType)) {
                    result.errors.push(`Riga ${rowNumber}: Tipo transazione non valido - ${row.tipo} (deve essere 'buy', 'sell', 'stake_reward' o 'swap')`)
                    continue
                  }
                  
                  // Validazione quantità
                  const quantity = parseFloat(row.quantita.trim())
                  if (isNaN(quantity) || quantity <= 0) {
                    result.errors.push(`Riga ${rowNumber}: Quantità non valida - ${row.quantita}`)
                    continue
                  }
                  
                  // Validazione valore EUR (opzionale per swap)
                  let eurValue: number | null = null
                  
                  if (row.valore_eur) {
                    let cleanEurValue = row.valore_eur
                      .replace(/[€$£¥]/g, '') // Rimuovi simboli di valuta
                      .trim()
                  
                  // Gestione formati numerici (come DCA)
                  if (cleanEurValue.includes('.') && cleanEurValue.includes(',')) {
                    const lastDotIndex = cleanEurValue.lastIndexOf('.')
                    const lastCommaIndex = cleanEurValue.lastIndexOf(',')
                    
                    if (lastCommaIndex > lastDotIndex) {
                      cleanEurValue = cleanEurValue.replace(/\./g, '').replace(',', '.')
                    } else {
                      cleanEurValue = cleanEurValue.replace(/,/g, '')
                    }
                  } else if (cleanEurValue.includes(',') && !cleanEurValue.includes('.')) {
                    const parts = cleanEurValue.split(',')
                    if (parts.length === 2 && parts[1].length <= 2) {
                      cleanEurValue = cleanEurValue.replace(',', '.')
                    } else {
                      cleanEurValue = cleanEurValue.replace(/,/g, '')
                    }
                  } else if (cleanEurValue.includes('.')) {
                    const parts = cleanEurValue.split('.')
                    if (parts.length === 2 && parts[1].length <= 2) {
                      cleanEurValue = cleanEurValue
                    } else {
                      cleanEurValue = cleanEurValue.replace(/\./g, '')
                    }
                  }
                  
                    eurValue = parseFloat(cleanEurValue)
                    
                    // Per stake_reward, permettiamo valore 0 (reward gratuiti)
                    if (transactionType === 'stake_reward') {
                      if (isNaN(eurValue) || eurValue < 0) {
                        result.errors.push(`Riga ${rowNumber}: Valore EUR non valido per stake_reward - ${row.valore_eur} (deve essere >= 0)`)
                        continue
                      }
                    } else if (transactionType !== 'swap') {
                      // Per buy/sell, il valore deve essere > 0
                      if (isNaN(eurValue) || eurValue <= 0) {
                        result.errors.push(`Riga ${rowNumber}: Valore EUR non valido - ${row.valore_eur} (deve essere > 0)`)
                        continue
                      }
                    }
                    // Per swap, accettiamo qualsiasi valore >= 0 se fornito
                    else if (transactionType === 'swap' && (isNaN(eurValue) || eurValue < 0)) {
                      result.errors.push(`Riga ${rowNumber}: Valore EUR non valido per swap - ${row.valore_eur} (deve essere >= 0)`)
                      continue
                    }
                  }
                  
                  // Gestione tipi specifici
                  if (transactionType === 'swap') {
                    // SWAP: richiede asset_to e quantita_to
                    if (!row.asset_to || !row.quantita_to) {
                      result.errors.push(`Riga ${rowNumber}: Swap richiede asset_to e quantita_to`)
                      continue
                    }
                    
                    const quantityTo = parseFloat(row.quantita_to.trim())
                    if (isNaN(quantityTo) || quantityTo <= 0) {
                      result.errors.push(`Riga ${rowNumber}: Quantità asset_to non valida - ${row.quantita_to}`)
                      continue
                    }
                    
                    await processSwapTransaction(tx, portfolioId, row, dateValue, quantity, quantityTo, eurValue)
                    
                  } else {
                    // BUY, SELL, STAKE_REWARD: transazione singola
                    
                    // Validazione saldo per acquisti
                    if (transactionType === 'buy') {
                      const currentBalance = await tx.account.findUnique({
                        where: { id: portfolio.account.id },
                        select: { balance: true }
                      })
                      
                      if (!currentBalance || currentBalance.balance < eurValue) {
                        result.errors.push(`Riga ${rowNumber}: Saldo insufficiente per acquisto di €${eurValue} (saldo: €${currentBalance?.balance || 0})`)
                        continue
                      }
                    }
                    
                    await processSingleTransaction(tx, portfolioId, row, dateValue, quantity, eurValue, transactionType, portfolio.account.id)
                  }
                  
                  result.imported++
                  
                  // Invia progress update per ogni transazione importata
                  if (result.imported % 5 === 0 || i === batch.length - 1) {
                    sendProgress({ 
                      type: 'progress',
                      current: currentProgress,
                      total: csvData.length,
                      currentBatch: batchIndex + 1,
                      totalBatches,
                      imported: result.imported,
                      message: `${result.imported} transazioni crypto importate`
                    })
                  }
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
              message: `Batch ${batchIndex + 1} completato: ${result.imported} transazioni crypto totali importate`
            })
            
            console.log(`✅ Batch ${batchIndex + 1} completato: ${result.imported} transazioni crypto totali importate`)
          }
          
          // Invia risultato finale
          sendProgress({ 
            type: 'complete', 
            result: {
              ...result,
              message: `Import completato: ${result.imported} transazioni crypto importate`
            }
          })
          
          console.log('✅ Import transazioni crypto completato:', result.imported, 'transazioni importate')
          controller.close()
        } catch (error) {
          console.error('Errore nell\'import CSV transazioni crypto:', error)
          sendProgress({ 
            type: 'error', 
            error: 'Errore nell\'import CSV transazioni crypto' 
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
    console.error('Errore nell\'import CSV SSE transazioni crypto:', error)
    return NextResponse.json(
      { error: 'Errore nell\'import CSV transazioni crypto' },
      { status: 500 }
    )
  }
}

// Helper function per transazioni singole (buy, sell, stake_reward)
async function processSingleTransaction(
  tx: any, 
  portfolioId: number, 
  row: CSVRow, 
  dateValue: Date, 
  quantity: number, 
  eurValue: number, 
  transactionType: string,
  accountId: number
) {
  // Trova o crea asset
  let asset = await tx.cryptoPortfolioAsset.findUnique({
    where: { symbol: row.asset.toUpperCase() }
  })

  if (!asset) {
    asset = await tx.cryptoPortfolioAsset.create({
      data: {
        symbol: row.asset.toUpperCase(),
        name: row.asset.toUpperCase(),
        decimals: 6,
        isActive: true
      }
    })
  }

  // Calcola prezzo per unità
  const pricePerUnit = row.prezzo_unitario ? 
    parseFloat(row.prezzo_unitario) : 
    (eurValue / quantity)

  // Crea transazione
  await tx.cryptoPortfolioTransaction.create({
    data: {
      portfolioId,
      type: transactionType,
      assetId: asset.id,
      quantity: quantity,
      eurValue: eurValue,
      pricePerUnit: pricePerUnit,
      date: dateValue,
      notes: row.note ? row.note.trim() : null
    }
  })

  // Aggiorna saldo account
  if (transactionType === 'buy') {
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { decrement: eurValue } }
    })
  } else if (transactionType === 'sell') {
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: eurValue } }
    })
  } else if (transactionType === 'stake_reward' && eurValue > 0) {
    // Per stake_reward, aggiorniamo il saldo solo se c'è un valore > 0
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: eurValue } }
    })
  }

  // Aggiorna holdings
  await updateHoldingsInTransaction(tx, portfolioId, asset.id)
}

// Helper function per swap
async function processSwapTransaction(
  tx: any, 
  portfolioId: number, 
  row: CSVRow, 
  dateValue: Date, 
  quantityFrom: number, 
  quantityTo: number, 
  eurValue: number | null
) {
  // Trova o crea asset FROM
  let fromAsset = await tx.cryptoPortfolioAsset.findUnique({
    where: { symbol: row.asset.toUpperCase() }
  })

  if (!fromAsset) {
    fromAsset = await tx.cryptoPortfolioAsset.create({
      data: {
        symbol: row.asset.toUpperCase(),
        name: row.asset.toUpperCase(),
        decimals: 6,
        isActive: true
      }
    })
  }

  // Se eurValue non è fornito, calcolalo dal prezzo medio dell'holding
  let calculatedEurValue = eurValue
  if (calculatedEurValue === null) {
    const fromHolding = await tx.cryptoPortfolioHolding.findUnique({
      where: {
        portfolioId_assetId: {
          portfolioId,
          assetId: fromAsset.id
        }
      }
    })

    if (!fromHolding || fromHolding.quantity < quantityFrom) {
      throw new Error(`Quantità insufficiente di ${row.asset} per lo swap. Disponibili: ${fromHolding?.quantity || 0}, richiesti: ${quantityFrom}`)
    }

    calculatedEurValue = fromHolding.avgPrice * quantityFrom
  }

  // Trova o crea asset TO
  let toAsset = await tx.cryptoPortfolioAsset.findUnique({
    where: { symbol: row.asset_to!.toUpperCase() }
  })

  if (!toAsset) {
    toAsset = await tx.cryptoPortfolioAsset.create({
      data: {
        symbol: row.asset_to!.toUpperCase(),
        name: row.asset_to!.toUpperCase(),
        decimals: 6,
        isActive: true
      }
    })
  }

  const fromPricePerUnit = calculatedEurValue / quantityFrom
  const toPricePerUnit = calculatedEurValue / quantityTo

  // Crea transazione SWAP_OUT
  const swapOutTransaction = await tx.cryptoPortfolioTransaction.create({
    data: {
      portfolioId,
      type: 'swap_out',
      assetId: fromAsset.id,
      quantity: quantityFrom,
      eurValue: calculatedEurValue,
      pricePerUnit: fromPricePerUnit,
      date: dateValue,
      notes: row.note ? row.note.trim() : `Swap ${row.asset} → ${row.asset_to}`
    }
  })

  // Crea transazione SWAP_IN
  await tx.cryptoPortfolioTransaction.create({
    data: {
      portfolioId,
      type: 'swap_in',
      assetId: toAsset.id,
      quantity: quantityTo,
      eurValue: calculatedEurValue,
      pricePerUnit: toPricePerUnit,
      date: dateValue,
      notes: row.note ? row.note.trim() : `Swap ${row.asset} → ${row.asset_to}`,
      swapPairId: swapOutTransaction.id
    }
  })

  // Aggiorna swapPairId per collegare le transazioni
  await tx.cryptoPortfolioTransaction.update({
    where: { id: swapOutTransaction.id },
    data: { swapPairId: swapOutTransaction.id + 1 } // Assumiamo ID sequenziali
  })

  // Aggiorna holdings per entrambi gli asset
  await updateHoldingsInTransaction(tx, portfolioId, fromAsset.id)
  await updateHoldingsInTransaction(tx, portfolioId, toAsset.id)
}

// Helper function per aggiornare holdings all'interno di una transazione
async function updateHoldingsInTransaction(tx: any, portfolioId: number, assetId: number) {
  try {
    // Calcola holdings dalle transazioni
    const transactions = await tx.cryptoPortfolioTransaction.findMany({
      where: { portfolioId, assetId },
      orderBy: { date: 'asc' }
    })

    let totalQuantity = 0
    let totalInvested = 0
    let realizedGains = 0

    for (const txn of transactions) {
      if (txn.type === 'buy' || txn.type === 'swap_in') {
        totalQuantity += txn.quantity
        totalInvested += txn.eurValue
      } else if (txn.type === 'sell' || txn.type === 'swap_out') {
        const sellQuantity = txn.quantity
        const avgPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0
        const costBasis = sellQuantity * avgPrice
        
        totalQuantity -= sellQuantity
        totalInvested -= costBasis
        realizedGains += (txn.eurValue - costBasis)
      } else if (txn.type === 'stake_reward') {
        totalQuantity += txn.quantity
        realizedGains += txn.eurValue
      }
    }

    const avgPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0

    // Upsert holding
    if (totalQuantity > 0.0000001) {
      await tx.cryptoPortfolioHolding.upsert({
        where: {
          portfolioId_assetId: {
            portfolioId,
            assetId
          }
        },
        update: {
          quantity: totalQuantity,
          avgPrice,
          totalInvested,
          realizedGains
        },
        create: {
          portfolioId,
          assetId,
          quantity: totalQuantity,
          avgPrice,
          totalInvested,
          realizedGains
        }
      })
    } else {
      // Rimuovi holding se quantità è 0
      await tx.cryptoPortfolioHolding.deleteMany({
        where: { portfolioId, assetId }
      })
    }
  } catch (error) {
    console.error('Error updating holdings in transaction:', error)
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