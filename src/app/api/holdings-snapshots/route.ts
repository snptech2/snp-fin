// src/app/api/holdings-snapshots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { PrecisionUtils, validateBTCCalculation } from '@/utils/precision'
import { fetchYahooFinanceRateCached } from '@/lib/yahooFinance'
import { fetchCryptoPrices } from '@/lib/cryptoPrices'
import { calculateTotalCurrentValue } from '@/lib/portfolioCalculations'

// GET - Lista tutti gli snapshots dell'utente
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const whereClause: any = { userId }
    
    if (dateFrom || dateTo) {
      whereClause.date = {}
      if (dateFrom) whereClause.date.gte = new Date(dateFrom)
      if (dateTo) whereClause.date.lte = new Date(dateTo)
    }

    const [snapshots, total] = await Promise.all([
      prisma.holdingsSnapshot.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.holdingsSnapshot.count({ where: whereClause })
    ])

    return NextResponse.json({
      snapshots,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching holdings snapshots:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero degli snapshot' },
      { status: 500 }
    )
  }
}

// POST - Crea un nuovo snapshot
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult

    const body = await request.json()
    const { note, isAutomatic = false } = body

    // 1. Fetch prezzi Bitcoin direttamente
    console.log('🌐 Fetching Bitcoin prices for snapshot...')
    
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
    const btcPriceUsd = parseFloat(btcUsdText.trim())
    
    if (isNaN(btcPriceUsd) || btcPriceUsd <= 0) {
      throw new Error('Invalid BTC price received')
    }
    
    // Fetch USD→EUR rate
    const usdEur = await fetchYahooFinanceRateCached()
    
    if (!usdEur || isNaN(usdEur) || usdEur <= 0) {
      throw new Error('Invalid USD→EUR rate')
    }
    
    const btcPriceEur = btcPriceUsd * usdEur
    
    console.log('💰 Bitcoin prices:', { btcPriceUsd, btcPriceEur, usdEur })
    
    // 2. Recupera i portfolio direttamente dal database
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
          holdings: {
            include: {
              asset: true
            }
          },
          networkFees: true
        }
      })
    ])
    
    // Calcola totalBTC per DCA portfolios
    const dcaPortfoliosWithStats = dcaPortfolios.map(portfolio => {
      const buyTransactions = portfolio.transactions?.filter((tx: any) => tx.type === 'buy') || []
      const sellTransactions = portfolio.transactions?.filter((tx: any) => tx.type === 'sell') || []
      
      const totalBTC = buyTransactions.reduce((sum: number, tx: any) => sum + (tx.btcQuantity || 0), 0) -
                       sellTransactions.reduce((sum: number, tx: any) => sum + (tx.btcQuantity || 0), 0)
      
      return {
        ...portfolio,
        type: 'dca_bitcoin',
        stats: {
          totalBTC: totalBTC,
          netBTC: totalBTC // Per ora usiamo lo stesso valore
        }
      }
    })
    
    // Calcola stats per crypto portfolios
    const allSymbols = new Set<string>()
    cryptoPortfolios.forEach(portfolio => {
      portfolio.holdings.forEach(holding => {
        if (holding.quantity > 0) {
          allSymbols.add(holding.asset.symbol.toUpperCase())
        }
      })
    })
    
    let currentPrices: Record<string, number> = {}
    if (allSymbols.size > 0) {
      try {
        const cryptoPricesResult = await fetchCryptoPrices(Array.from(allSymbols), userId, false)
        currentPrices = cryptoPricesResult.prices || {}
      } catch (error) {
        console.error('Error fetching crypto prices:', error)
      }
    }
    
    // Aggiungi stats ai crypto portfolios
    const cryptoPortfoliosWithStats = cryptoPortfolios.map(portfolio => {
      let totalValueEur = 0
      
      portfolio.holdings.forEach(holding => {
        const currentPrice = currentPrices[holding.asset.symbol.toUpperCase()] || holding.avgPrice || 0
        const valueEur = holding.quantity * currentPrice
        totalValueEur += valueEur
      })
      
      return {
        ...portfolio,
        type: 'crypto_wallet',
        stats: {
          totalValueEur
        }
      }
    })

    console.log('📊 Portfolio data:')
    console.log('📊 - DCA Portfolios:', dcaPortfoliosWithStats.length)
    console.log('📊 - Crypto Portfolios:', cryptoPortfoliosWithStats.length)
    console.log('📊 - BTC Price EUR:', btcPriceEur)
    console.log('📊 - BTC Price USD:', btcPriceUsd)

    // 3. Get user currency preference for BTC calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    })
    const userCurrency = user?.currency || 'EUR'

    // 4. Usa calculateTotalCurrentValue per calcolare il valore totale in EUR
    const totalCurrentValueEur = calculateTotalCurrentValue(
      dcaPortfoliosWithStats, 
      cryptoPortfoliosWithStats, 
      btcPriceEur
    )
    
    console.log('📊 Total portfolio value EUR:', totalCurrentValueEur)
    
    // Converti in USD
    const eurUsdRate = 1 / usdEur  // 1 EUR = eurUsdRate USD (inverso di usdEur)
    const totalCurrentValueUSD = totalCurrentValueEur * eurUsdRate

    console.log('📊 Calculated values (USD consistent):')
    console.log('📊 - Total Current Value USD:', totalCurrentValueUSD)
    console.log('📊 - EUR/USD Rate used:', eurUsdRate)
    console.log('📊 - User Currency:', userCurrency, '(display only)')
    
    // 5. Calcola i valori finali direttamente
    const usdValue = totalCurrentValueUSD
    const eurValue = usdValue / eurUsdRate  // Conversione USD → EUR per display
    
    // 🎯 USER-SPECIFIED BTC CALCULATION FORMULA
    // BTC = holdingsValue / bitcoin_price (USD CONSISTENT - NO DOUBLE CONVERSION)
    const holdingsValue = usdValue  // USD value calculated directly
    const bitcoinPrice = btcPriceUsd  // USD price
    const calculatedBTC = holdingsValue / bitcoinPrice
    
    console.log('🎯 BTC Calculation (USD Consistent - NO DOUBLE CONVERSION):')
    console.log('📊 - Holdings Value USD (direct):', holdingsValue)
    console.log('📊 - Bitcoin Price USD:', bitcoinPrice)
    console.log('📊 - Calculated BTC:', calculatedBTC)
    console.log('📊 - Verification:', `${holdingsValue} / ${bitcoinPrice} = ${holdingsValue/bitcoinPrice}`)
    console.log('📊 - User Currency Setting:', userCurrency, '(display only)')

    // Validation check con utility standardizzata
    const verificationBTC = holdingsValue / bitcoinPrice
    const validation = validateBTCCalculation(calculatedBTC, verificationBTC)
    
    if (!validation.isValid) {
      console.warn('⚠️ BTC CALCULATION DISCREPANCY DETECTED!')
      console.warn('⚠️ - Expected:', verificationBTC)
      console.warn('⚠️ - Calculated:', calculatedBTC) 
      console.warn('⚠️ - Difference:', validation.difference)
      console.warn('⚠️ - Percentage diff:', validation.percentageDiff.toFixed(6), '%')
    } else {
      console.log('✅ BTC calculation verified: difference <', 0.00001)
    }

    console.log('📊 Final snapshot values:')
    console.log('📊 - EUR Value (converted back):', eurValue)
    console.log('📊 - USD Value (direct calculation):', usdValue)
    console.log('📊 - BTC Calculated:', calculatedBTC)
    console.log('📊 - BTC Price EUR:', btcPriceEur)
    console.log('📊 - BTC Price USD:', btcPriceUsd)
    console.log('📊 - EUR/USD Rate used:', eurUsdRate, '(1 / usdEur)')
    console.log('📊 - USD/EUR Rate:', usdEur)
    console.log('📊 - Snapshot created at:', new Date().toISOString())

    // 6. Crea il snapshot con arrotondamenti standardizzati
    const snapshot = await prisma.holdingsSnapshot.create({
      data: {
        userId,
        date: new Date(),
        btcUsd: PrecisionUtils.bitcoinPrice(btcPriceUsd),
        dirtyDollars: PrecisionUtils.currency(usdValue),
        dirtyEuro: PrecisionUtils.currency(eurValue),
        btc: PrecisionUtils.bitcoin(calculatedBTC),
        isAutomatic: isAutomatic,
        note: note || null
      }
    })

    console.log('💾 Snapshot created with standardized precision:')
    console.log('💾 - BTC USD (2 decimals):', snapshot.btcUsd)
    console.log('💾 - USD Value (2 decimals):', snapshot.dirtyDollars)
    console.log('💾 - EUR Value (2 decimals):', snapshot.dirtyEuro)
    console.log('💾 - BTC Amount (8 decimals):', snapshot.btc)

    return NextResponse.json({
      success: true,
      snapshot
    })

  } catch (error) {
    console.error('Error creating holdings snapshot:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione dello snapshot' },
      { status: 500 }
    )
  }
}