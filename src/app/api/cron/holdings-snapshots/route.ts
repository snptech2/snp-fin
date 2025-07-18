// src/app/api/cron/holdings-snapshots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrecisionUtils, validateBTCCalculation } from '@/utils/precision'
import { fetchYahooFinanceRateCached } from '@/lib/yahooFinance'
import { calculateTotalCurrentValue, convertEurToUsd, calculateBTCFromUSD } from '@/lib/portfolioCalculations'
import { fetchCryptoPrices } from '@/lib/cryptoPrices'

// POST - Crea snapshot automatici per tutti gli utenti che hanno l'automazione attiva
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceSnapshot = searchParams.get('force') === 'true'
    
    console.log('🤖 CRON: Automatic snapshots job started at:', new Date().toISOString())
    console.log('🤖 Force snapshot mode:', forceSnapshot)
    
    // 1. Recupera tutti gli utenti con automazione attiva
    const usersWithAutomation = await prisma.snapshotSettings.findMany({
      where: {
        autoSnapshotEnabled: true
      },
      include: {
        user: {
          select: {
            id: true,
            currency: true
          }
        }
      }
    })

    console.log('🤖 Found', usersWithAutomation.length, 'users with automation enabled')

    if (usersWithAutomation.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with automation enabled',
        processed: 0,
        created: 0
      })
    }

    let processedUsers = 0
    let createdSnapshots = 0
    const results = []

    // 2. Per ogni utente, controlla se è il momento di creare uno snapshot
    for (const settings of usersWithAutomation) {
      try {
        const userId = settings.userId
        const userCurrency = settings.user.currency || 'EUR'
        
        console.log(`🔍 Checking user ${userId} (${userCurrency}), frequency: ${settings.frequency}`)
        
        // Controlla se è il momento di creare uno snapshot (o forza se richiesto)
        const shouldCreateSnapshot = await shouldCreateAutomaticSnapshot(settings)
        
        if (!shouldCreateSnapshot.should && !forceSnapshot) {
          console.log(`⏱️ User ${userId}: Snapshot not due. ${shouldCreateSnapshot.reason}`)
          results.push({
            userId,
            action: 'skipped',
            reason: shouldCreateSnapshot.reason,
            nextDue: shouldCreateSnapshot.nextDue
          })
          continue
        }
        
        if (forceSnapshot) {
          console.log(`🚀 User ${userId}: FORCED snapshot creation (bypassing timing)`)
        }

        console.log(`✅ User ${userId}: Creating automatic snapshot. ${shouldCreateSnapshot.reason}`)
        
        // Crea lo snapshot automatico
        const snapshot = await createAutomaticSnapshot(userId, userCurrency)
        
        // Aggiorna lastSnapshot nelle impostazioni
        await prisma.snapshotSettings.update({
          where: { id: settings.id },
          data: { lastSnapshot: new Date() }
        })
        
        createdSnapshots++
        results.push({
          userId,
          action: 'created',
          snapshotId: snapshot.id,
          reason: shouldCreateSnapshot.reason
        })
        
        console.log(`💾 User ${userId}: Automatic snapshot created (ID: ${snapshot.id})`)
        
      } catch (userError) {
        console.error(`❌ Error processing user ${settings.userId}:`, userError)
        results.push({
          userId: settings.userId,
          action: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        })
      }
      
      processedUsers++
    }

    console.log('🤖 CRON: Automatic snapshots job completed')
    console.log('🤖 - Users processed:', processedUsers)
    console.log('🤖 - Snapshots created:', createdSnapshots)

    return NextResponse.json({
      success: true,
      message: `Processed ${processedUsers} users, created ${createdSnapshots} snapshots`,
      processed: processedUsers,
      created: createdSnapshots,
      results
    })

  } catch (error) {
    console.error('💥 CRON: Error in automatic snapshots job:', error)
    return NextResponse.json(
      { 
        error: 'Error in automatic snapshots job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Funzione helper per determinare se creare uno snapshot
async function shouldCreateAutomaticSnapshot(settings: any): Promise<{
  should: boolean
  reason: string
  nextDue?: string
}> {
  const now = new Date()
  const frequency = settings.frequency
  const lastSnapshot = settings.lastSnapshot ? new Date(settings.lastSnapshot) : null
  const preferredHour = settings.preferredHour || 12

  // Se non c'è mai stato uno snapshot automatico, crealo
  if (!lastSnapshot) {
    return {
      should: true,
      reason: 'First automatic snapshot'
    }
  }

  const timeSinceLastSnapshot = now.getTime() - lastSnapshot.getTime()
  const currentHour = now.getHours()

  switch (frequency) {
    case '6hours':
      const sixHoursMs = 6 * 60 * 60 * 1000
      if (timeSinceLastSnapshot >= sixHoursMs) {
        return {
          should: true,
          reason: `Last snapshot was ${Math.round(timeSinceLastSnapshot / (60 * 60 * 1000))} hours ago`
        }
      }
      const nextSixHour = new Date(lastSnapshot.getTime() + sixHoursMs)
      return {
        should: false,
        reason: `Next snapshot due in ${Math.round((sixHoursMs - timeSinceLastSnapshot) / (60 * 60 * 1000))} hours`,
        nextDue: nextSixHour.toISOString()
      }

    case 'daily':
      const oneDayMs = 24 * 60 * 60 * 1000
      const isNewDay = now.getDate() !== lastSnapshot.getDate() || 
                       now.getMonth() !== lastSnapshot.getMonth() || 
                       now.getFullYear() !== lastSnapshot.getFullYear()
      
      if (isNewDay && currentHour >= preferredHour) {
        return {
          should: true,
          reason: `New day and current hour (${currentHour}) >= preferred hour (${preferredHour})`
        }
      }
      
      if (timeSinceLastSnapshot >= oneDayMs) {
        return {
          should: true,
          reason: `Last snapshot was ${Math.round(timeSinceLastSnapshot / oneDayMs)} days ago`
        }
      }
      
      const nextDay = new Date(lastSnapshot)
      nextDay.setDate(nextDay.getDate() + 1)
      nextDay.setHours(preferredHour, 0, 0, 0)
      
      return {
        should: false,
        reason: `Next daily snapshot at ${preferredHour}:00`,
        nextDue: nextDay.toISOString()
      }

    case 'weekly':
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000
      if (timeSinceLastSnapshot >= oneWeekMs) {
        return {
          should: true,
          reason: `Last snapshot was ${Math.round(timeSinceLastSnapshot / oneWeekMs)} weeks ago`
        }
      }
      const nextWeek = new Date(lastSnapshot.getTime() + oneWeekMs)
      return {
        should: false,
        reason: `Next weekly snapshot due in ${Math.round((oneWeekMs - timeSinceLastSnapshot) / (24 * 60 * 60 * 1000))} days`,
        nextDue: nextWeek.toISOString()
      }

    case 'monthly':
      const lastMonth = lastSnapshot.getMonth()
      const lastYear = lastSnapshot.getFullYear()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      const isNewMonth = currentYear > lastYear || (currentYear === lastYear && currentMonth > lastMonth)
      
      if (isNewMonth) {
        return {
          should: true,
          reason: `New month: ${currentYear}-${currentMonth + 1} (last: ${lastYear}-${lastMonth + 1})`
        }
      }
      
      const nextMonth = new Date(lastSnapshot)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return {
        should: false,
        reason: 'Same month as last snapshot',
        nextDue: nextMonth.toISOString()
      }

    default:
      return {
        should: false,
        reason: `Unknown frequency: ${frequency}`
      }
  }
}

// Funzione helper per creare uno snapshot automatico (usando la logica corretta)
async function createAutomaticSnapshot(userId: number, userCurrency: string) {
  console.log(`🤖 Creating automatic snapshot for user ${userId}`)
  
  try {
    // 1. Recupera prezzi Bitcoin direttamente
    const btcPriceData = await fetchBitcoinPrices()
    
    // 2. Recupera TUTTI i portfolios come fa la pagina investments
    const [dcaPortfolios, cryptoPortfolios] = await Promise.all([
      prisma.dCAPortfolio.findMany({
        where: { userId },
        include: {
          transactions: {
            orderBy: { date: 'asc' }
          }
        }
      }),
      prisma.cryptoPortfolio.findMany({
        where: { userId },
        include: {
          transactions: true,
          holdings: true,
          networkFees: true
        }
      })
    ])

    // 3. Calcola stats per DCA portfolios
    const dcaPortfoliosWithStats = dcaPortfolios.map(portfolio => {
      // Calcola totalBTC dalle transazioni
      const buyTransactions = portfolio.transactions?.filter((tx: any) => tx.type === 'buy') || []
      const sellTransactions = portfolio.transactions?.filter((tx: any) => tx.type === 'sell') || []
      
      const totalBTC = buyTransactions.reduce((sum: number, tx: any) => sum + (tx.btcQuantity || 0), 0) -
                       sellTransactions.reduce((sum: number, tx: any) => sum + (tx.btcQuantity || 0), 0)
      
      console.log(`📊 DCA Portfolio ${portfolio.name}: ${totalBTC} BTC`)
      
      return {
        ...portfolio,
        type: 'dca_bitcoin', // Aggiungi il type richiesto
        stats: {
          totalBTC: totalBTC,
          netBTC: totalBTC, // Per ora usiamo lo stesso valore
          transactionCount: portfolio.transactions?.length || 0
        }
      }
    })

    // 4. Fetch crypto portfolio stats using existing API logic
    const cryptoPortfoliosWithStats = await fetchCryptoPortfolioStats(cryptoPortfolios, btcPriceData.btcPriceEur, userId)

    // 5. Calcola valore attuale usando la STESSA LOGICA della pagina investments
    const totalCurrentValueEur = calculateTotalCurrentValue(
      dcaPortfoliosWithStats, 
      cryptoPortfoliosWithStats, 
      btcPriceData.btcPriceEur
    )

    console.log(`🤖 Portfolio breakdown:`)
    console.log(`🤖 - DCA Portfolios: ${dcaPortfoliosWithStats.length}`)
    console.log(`🤖 - Crypto Portfolios: ${cryptoPortfoliosWithStats.length}`)
    
    // Log dettagli DCA
    let totalDCAValue = 0
    dcaPortfoliosWithStats.forEach(p => {
      const value = (p.stats.totalBTC || 0) * btcPriceData.btcPriceEur
      totalDCAValue += value
      console.log(`🤖   - ${p.name}: ${p.stats.totalBTC} BTC = €${value.toFixed(2)}`)
    })
    console.log(`🤖 - Total DCA Value: €${totalDCAValue.toFixed(2)}`)
    
    // Log dettagli Crypto (già calcolato nella funzione)
    const totalCryptoValue = cryptoPortfoliosWithStats.reduce((sum, p) => sum + (p.stats.totalValueEur || 0), 0)
    console.log(`🤖 - Total Crypto Value: €${totalCryptoValue.toFixed(2)}`)
    
    console.log(`🤖 - Total Portfolio Value: €${totalCurrentValueEur.toFixed(2)}`)

    // 5. Converti in USD e calcola BTC
    const eurUsdRate = 1 / btcPriceData.usdEur
    const totalCurrentValueUSD = convertEurToUsd(totalCurrentValueEur, eurUsdRate)
    const calculatedBTC = calculateBTCFromUSD(totalCurrentValueUSD, btcPriceData.btcPriceUsd)

    console.log(`🤖 Final calculations:`)
    console.log(`🤖 - EUR Value: €${totalCurrentValueEur}`)
    console.log(`🤖 - USD Value: $${totalCurrentValueUSD}`)
    console.log(`🤖 - BTC calculated: ${calculatedBTC}`)
    console.log(`🤖 - EUR/USD rate: ${eurUsdRate}`)

    // 6. Crea il snapshot automatico
    const snapshot = await prisma.holdingsSnapshot.create({
      data: {
        userId,
        date: new Date(),
        btcUsd: PrecisionUtils.bitcoinPrice(btcPriceData.btcPriceUsd),
        dirtyDollars: PrecisionUtils.currency(totalCurrentValueUSD),
        dirtyEuro: PrecisionUtils.currency(totalCurrentValueEur),
        btc: PrecisionUtils.bitcoin(calculatedBTC),
        isAutomatic: true, // ⭐ SNAPSHOT AUTOMATICO
        note: `Auto-snapshot (${new Date().toISOString()})`
      }
    })

    console.log(`💾 Automatic snapshot created: ${snapshot.id}`)
    console.log(`💾 - BTC: ${snapshot.btc}`)
    console.log(`💾 - EUR: €${snapshot.dirtyEuro}`)
    console.log(`💾 - USD: $${snapshot.dirtyDollars}`)
    
    return snapshot
    
  } catch (error) {
    console.error(`❌ Error creating automatic snapshot for user ${userId}:`, error)
    throw error
  }
}

// Funzione helper per fetchare i prezzi Bitcoin
async function fetchBitcoinPrices() {
  console.log('🌐 Fetching Bitcoin prices for automation...')
  
  // Fetch BTC USD price
  const btcResponse = await fetch('https://cryptoprices.cc/BTC', {
    method: 'GET',
    headers: {
      'User-Agent': 'SNP-Finance-App/1.0'
    },
    cache: 'no-store'
  })
  
  if (!btcResponse.ok) {
    throw new Error(`Failed to fetch BTC price: ${btcResponse.status}`)
  }
  
  const btcUsdText = await btcResponse.text()
  const btcUsd = parseFloat(btcUsdText.trim())
  
  if (isNaN(btcUsd) || btcUsd <= 0) {
    throw new Error('Invalid BTC price received')
  }
  
  // Fetch USD→EUR rate
  const usdEur = await fetchYahooFinanceRateCached()
  
  if (!usdEur || isNaN(usdEur) || usdEur <= 0) {
    throw new Error('Invalid USD→EUR rate')
  }
  
  const btcEur = btcUsd * usdEur
  
  console.log('💰 Bitcoin prices fetched:', { btcUsd, btcEur, usdEur })
  
  return {
    btcPriceUsd: btcUsd,
    btcPriceEur: btcEur,
    usdEur: usdEur
  }
}

// Funzione helper per fetchare le stats dei crypto portfolios
async function fetchCryptoPortfolioStats(cryptoPortfolios: any[], btcPriceEur: number, userId: number) {
  console.log(`🔍 Calculating stats for ${cryptoPortfolios.length} crypto portfolios...`)
  
  // Raccogli tutti i simboli unici dalle holdings
  const allSymbols = new Set<string>()
  const portfoliosWithHoldings = []
  
  for (const portfolio of cryptoPortfolios) {
    // Fetch delle holdings per questo portfolio
    const holdings = await prisma.cryptoPortfolioHolding.findMany({
      where: { 
        portfolioId: portfolio.id,
        quantity: { gt: 0 } // Solo holdings con quantity > 0
      },
      include: {
        asset: true
      }
    })
    
    // Aggiungi i simboli al set
    holdings.forEach(holding => {
      allSymbols.add(holding.asset.symbol.toUpperCase())
    })
    
    portfoliosWithHoldings.push({
      portfolio,
      holdings
    })
  }
  
  // Fetch prezzi correnti per tutti i simboli
  let currentPrices: Record<string, number> = {}
  
  if (allSymbols.size > 0) {
    try {
      console.log(`🌐 Fetching current prices for: ${Array.from(allSymbols).join(', ')}`)
      const cryptoPricesResult = await fetchCryptoPrices(Array.from(allSymbols), userId, false)
      currentPrices = cryptoPricesResult.prices || {}
      console.log(`💰 Fetched ${Object.keys(currentPrices).length} prices`)
    } catch (error) {
      console.error('❌ Error fetching crypto prices:', error)
      // Fallback: usa avgPrice dalle holdings
    }
  }
  
  // Calcola stats per ogni portfolio
  const portfoliosWithStats = []
  
  for (const { portfolio, holdings } of portfoliosWithHoldings) {
    try {
      // Calcola valore totale usando i prezzi correnti
      let totalValueEur = 0
      
      holdings.forEach(holding => {
        const currentPrice = currentPrices[holding.asset.symbol.toUpperCase()] || holding.avgPrice || 0
        const valueEur = holding.quantity * currentPrice
        totalValueEur += valueEur
        console.log(`  💎 ${holding.asset.symbol}: ${holding.quantity} × €${currentPrice} = €${valueEur}`)
      })
      
      // Calcolo enhanced stats dalle transazioni (semplificato per ora)
      const buyTransactions = portfolio.transactions?.filter((tx: any) => tx.type === 'buy') || []
      const sellTransactions = portfolio.transactions?.filter((tx: any) => tx.type === 'sell') || []
      
      const totalInvested = buyTransactions.reduce((sum: number, tx: any) => sum + (tx.eurValue || 0), 0)
      const totalSold = sellTransactions.reduce((sum: number, tx: any) => sum + (tx.eurValue || 0), 0)
      const capitalRecovered = Math.min(totalSold, totalInvested)
      const effectiveInvestment = Math.max(0, totalInvested - capitalRecovered)
      const realizedProfit = Math.max(0, totalSold - totalInvested)
      const unrealizedGains = totalValueEur - effectiveInvestment
      
      portfoliosWithStats.push({
        ...portfolio,
        type: 'crypto_wallet',
        stats: {
          totalInvested,
          capitalRecovered,
          effectiveInvestment,
          realizedProfit,
          isFullyRecovered: capitalRecovered >= totalInvested,
          totalValueEur: totalValueEur,
          transactionCount: portfolio.transactions?.length || 0,
          buyCount: buyTransactions.length,
          sellCount: sellTransactions.length,
          holdingsCount: holdings.length,
          unrealizedGains,
          totalROI: totalInvested > 0 ? ((realizedProfit + unrealizedGains) / totalInvested) * 100 : 0
        }
      })
      
      console.log(`📊 Portfolio ${portfolio.name}: €${totalValueEur.toFixed(2)} (${holdings.length} holdings)`)
      
    } catch (error) {
      console.error(`❌ Error calculating stats for portfolio ${portfolio.name}:`, error)
      // Fallback con valori zero
      portfoliosWithStats.push({
        ...portfolio,
        type: 'crypto_wallet',
        stats: {
          totalInvested: 0,
          capitalRecovered: 0,
          effectiveInvestment: 0,
          realizedProfit: 0,
          isFullyRecovered: false,
          totalValueEur: 0,
          transactionCount: portfolio.transactions?.length || 0,
          buyCount: 0,
          holdingsCount: 0
        }
      })
    }
  }
  
  const totalCryptoValue = portfoliosWithStats.reduce((sum, p) => sum + (p.stats.totalValueEur || 0), 0)
  console.log(`💰 Total crypto portfolios value: €${totalCryptoValue.toFixed(2)}`)
  
  return portfoliosWithStats
}


// GET - Status dell'automazione (per debug/monitoring)
export async function GET() {
  try {
    const usersWithAutomation = await prisma.snapshotSettings.findMany({
      where: {
        autoSnapshotEnabled: true
      },
      include: {
        user: {
          select: {
            id: true,
            currency: true
          }
        }
      }
    })

    const status = []
    
    for (const settings of usersWithAutomation) {
      const shouldCreate = await shouldCreateAutomaticSnapshot(settings)
      status.push({
        userId: settings.userId,
        frequency: settings.frequency,
        lastSnapshot: settings.lastSnapshot,
        shouldCreateSnapshot: shouldCreate.should,
        reason: shouldCreate.reason,
        nextDue: shouldCreate.nextDue
      })
    }

    return NextResponse.json({
      success: true,
      totalUsers: usersWithAutomation.length,
      status
    })

  } catch (error) {
    console.error('Error checking automation status:', error)
    return NextResponse.json(
      { error: 'Error checking automation status' },
      { status: 500 }
    )
  }
}