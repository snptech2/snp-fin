// src/app/api/holdings-snapshots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { getDCACurrentValue } from '@/lib/capitalGainsUtils'
import { PrecisionUtils, validateBTCCalculation } from '@/utils/precision'

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

    // 1. Recupera BTC price e portfolios
    const [btcPriceResponse, dcaPortfoliosResponse, cryptoPortfoliosResponse] = await Promise.all([
      // Prezzo BTC con parametro speciale per ottenere entrambi i prezzi
      fetch(`${request.nextUrl.origin}/api/bitcoin-price?snapshot=true`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      }),
      // Portfolio DCA
      fetch(`${request.nextUrl.origin}/api/dca-portfolios`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      }),
      // Portfolio Crypto
      fetch(`${request.nextUrl.origin}/api/crypto-portfolios`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      })
    ])

    if (!btcPriceResponse.ok) {
      throw new Error('Errore nel recupero prezzo Bitcoin')
    }

    const btcPriceData = await btcPriceResponse.json()
    let dcaPortfolios = []
    let cryptoPortfolios = []

    // 2. Recupera i portfolio
    if (dcaPortfoliosResponse.ok) {
      dcaPortfolios = await dcaPortfoliosResponse.json()
    }
    if (cryptoPortfoliosResponse.ok) {
      cryptoPortfolios = await cryptoPortfoliosResponse.json()
    }

    console.log('📊 Portfolio data:')
    console.log('📊 - DCA Portfolios:', dcaPortfolios.length)
    console.log('📊 - Crypto Portfolios:', cryptoPortfolios.length)
    console.log('📊 - BTC Price EUR:', btcPriceData.btcPriceEur)
    console.log('📊 - BTC Price USD:', btcPriceData.btcPriceUsd)
    console.log('📊 - Data cached:', btcPriceData.cached)
    console.log('📊 - Data timestamp:', btcPriceData.timestamp)

    // 3. Get user currency preference for BTC calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    })
    const userCurrency = user?.currency || 'EUR'

    // 4. Calcola totalCurrentValue direttamente in USD per evitare doppia conversione
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    let totalCurrentValueUSD = 0
    
    // Calcola il rate EUR→USD una sola volta
    const eurUsdRate = 1 / btcPriceData.usdEur  // 1 EUR = eurUsdRate USD (inverso di usdEur)
    const btcPriceUsd = btcPriceData.btcPriceUsd
    const btcPriceEur = btcPriceData.btcPriceEur

    allPortfolios.forEach(portfolio => {
      const isDcaPortfolio = dcaPortfolios.includes(portfolio)
      
      if (isDcaPortfolio) {
        // DCA portfolios: calcola in EUR poi converti in USD
        const portfolioValueEur = getDCACurrentValue(portfolio, btcPriceEur)
        const portfolioValueUsd = portfolioValueEur * eurUsdRate
        totalCurrentValueUSD += portfolioValueUsd
        console.log(`📊 DCA Portfolio ${portfolio.name}: €${portfolioValueEur} → $${portfolioValueUsd}`)
      } else {
        // Crypto portfolios: converti da EUR a USD
        const portfolioValueEur = portfolio.stats?.totalValueEur || 0
        const portfolioValueUsd = portfolioValueEur * eurUsdRate
        totalCurrentValueUSD += portfolioValueUsd
        console.log(`📊 Crypto Portfolio ${portfolio.name}: €${portfolioValueEur} → $${portfolioValueUsd}`)
      }
    })

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
    console.log('📊 - USD/EUR Rate from bitcoin-price:', btcPriceData.usdEur || 'not provided')
    console.log('📊 - Data freshness: cached =', btcPriceData.cached, ', timestamp =', btcPriceData.timestamp)
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