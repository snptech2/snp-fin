// src/app/api/holdings-snapshots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { getDCACurrentValue } from '@/lib/capitalGainsUtils'

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
    const { note } = body

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

    // 4. Calcola totalCurrentValue usando la stessa logica di investments/page.tsx
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    let totalCurrentValue = 0

    allPortfolios.forEach(portfolio => {
      const isDcaPortfolio = dcaPortfolios.includes(portfolio)
      
      if (isDcaPortfolio) {
        // DCA portfolios: usa getDCACurrentValue con prezzo EUR
        const portfolioValue = getDCACurrentValue(portfolio, btcPriceData.btcPriceEur)
        totalCurrentValue += portfolioValue
        console.log(`📊 DCA Portfolio ${portfolio.name}: €${portfolioValue}`)
      } else {
        // Crypto portfolios: usa totalValueEur dal backend
        const portfolioValue = portfolio.stats?.totalValueEur || 0
        totalCurrentValue += portfolioValue
        console.log(`📊 Crypto Portfolio ${portfolio.name}: €${portfolioValue}`)
      }
    })

    console.log('📊 Calculated values:')
    console.log('📊 - Total Current Value:', totalCurrentValue)
    console.log('📊 - User Currency:', userCurrency)
    
    // 5. Calcola i valori finali usando entrambi i prezzi
    const eurValue = totalCurrentValue
    const btcPriceEur = btcPriceData.btcPriceEur
    const btcPriceUsd = btcPriceData.btcPriceUsd
    
    // Usa direttamente il tasso EUR/USD dall'API bitcoin-price invece di ricalcolarlo
    const eurUsdRate = 1 / btcPriceData.usdEur  // 1 EUR = eurUsdRate USD (inverso di usdEur)
    const usdValue = eurValue * eurUsdRate        // Conversione EUR → USD
    
    // 🎯 USER-SPECIFIED BTC CALCULATION FORMULA
    // BTC = holdingsValue / bitcoin_price (ALWAYS USE USD FOR CONSISTENCY)
    const holdingsValue = usdValue  // Always use USD
    const bitcoinPrice = btcPriceUsd  // Always use USD
    const calculatedBTC = holdingsValue / bitcoinPrice
    
    console.log('🎯 BTC Calculation (USD Consistent):')
    console.log('📊 - Holdings Value USD:', holdingsValue)
    console.log('📊 - Bitcoin Price USD:', bitcoinPrice)
    console.log('📊 - Calculated BTC:', calculatedBTC)
    console.log('📊 - User Currency Setting:', userCurrency, '(display only)')

    console.log('📊 Final snapshot values:')
    console.log('📊 - EUR Value:', eurValue)
    console.log('📊 - USD Value:', usdValue)
    console.log('📊 - BTC Calculated:', calculatedBTC)
    console.log('📊 - BTC Price EUR:', btcPriceEur)
    console.log('📊 - BTC Price USD:', btcPriceUsd)
    console.log('📊 - EUR/USD Rate used:', eurUsdRate, '(1 / usdEur)')
    console.log('📊 - USD/EUR Rate from bitcoin-price:', btcPriceData.usdEur || 'not provided')
    console.log('📊 - Time:', new Date().toISOString())

    // 6. Crea il snapshot
    const snapshot = await prisma.holdingsSnapshot.create({
      data: {
        userId,
        date: new Date(),
        btcUsd: Math.round(btcPriceUsd * 100) / 100,
        dirtyDollars: Math.round(usdValue * 100) / 100,
        dirtyEuro: Math.round(eurValue * 100) / 100,
        btc: Math.round(calculatedBTC * 10000000) / 10000000, // 7 decimali per BTC
        isAutomatic: false,
        note: note || null
      }
    })

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