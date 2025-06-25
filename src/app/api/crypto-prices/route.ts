// src/app/api/crypto-prices/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Cache per evitare troppe richieste API
let priceCache: Record<string, { price: number, timestamp: number }> = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minuti

// GET - Ottieni prezzi crypto da cryptoprices.cc
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    const forceRefresh = searchParams.get('force') === 'true'

    if (!symbolsParam) {
      return NextResponse.json({ error: 'Parametro symbols richiesto' }, { status: 400 })
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    if (symbols.length === 0) {
      return NextResponse.json({ error: 'Almeno un simbolo richiesto' }, { status: 400 })
    }

    console.log('🔍 Crypto Prices API called for:', symbols.join(', '))

    const now = Date.now()
    const prices: Record<string, number> = {}
    const symbolsToFetch: string[] = []

    // Controlla cache per ogni simbolo
    for (const symbol of symbols) {
      if (!forceRefresh && priceCache[symbol]) {
        const cacheAge = now - priceCache[symbol].timestamp
        if (cacheAge < CACHE_DURATION) {
          prices[symbol] = priceCache[symbol].price
          console.log(`📦 Using cached price for ${symbol}: €${prices[symbol]}`)
          continue
        }
      }
      symbolsToFetch.push(symbol)
    }

    if (symbolsToFetch.length > 0) {
      console.log('🌐 Fetching fresh prices for:', symbolsToFetch.join(', '))

      // Prima ottieni il tasso USD→EUR
      const usdEurResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        headers: { 'User-Agent': 'SNP-Finance-App/1.0' },
        cache: 'no-store'
      })

      if (!usdEurResponse.ok) {
        throw new Error(`Errore API exchange rate: ${usdEurResponse.status}`)
      }

      const exchangeData = await usdEurResponse.json()
      const usdEur = exchangeData.rates?.EUR

      if (!usdEur || isNaN(usdEur) || usdEur <= 0) {
        throw new Error('Tasso di cambio USD→EUR non valido')
      }

      // Fetch prezzi per ogni simbolo
      const pricePromises = symbolsToFetch.map(async (symbol) => {
        try {
          console.log(`🌐 Fetching price for ${symbol}...`)
          
          const response = await fetch(`https://cryptoprices.cc/${symbol}`, {
            headers: { 'User-Agent': 'SNP-Finance-App/1.0' },
            cache: 'no-store'
          })

          if (!response.ok) {
            console.warn(`⚠️ Prezzo non disponibile per ${symbol} (${response.status})`)
            return { symbol, price: null }
          }

          const priceText = await response.text()
          const priceUsd = parseFloat(priceText.trim())

          if (isNaN(priceUsd) || priceUsd <= 0) {
            console.warn(`⚠️ Prezzo non valido per ${symbol}: ${priceText}`)
            return { symbol, price: null }
          }

          // Converti in EUR
          const priceEur = Math.round(priceUsd * usdEur * 100) / 100

          // Aggiorna cache
          priceCache[symbol] = { price: priceEur, timestamp: now }

          console.log(`✅ ${symbol}: $${priceUsd} → €${priceEur}`)
          return { symbol, price: priceEur }

        } catch (error) {
          console.error(`❌ Errore per ${symbol}:`, error)
          return { symbol, price: null }
        }
      })

      const results = await Promise.all(pricePromises)
      
      // Aggiungi prezzi ottenuti
      for (const result of results) {
        if (result.price !== null) {
          prices[result.symbol] = result.price
        } else {
          // Se il prezzo non è disponibile, mantieni l'ultimo prezzo noto
          if (priceCache[result.symbol]) {
            prices[result.symbol] = priceCache[result.symbol].price
            console.log(`🔄 Using last known price for ${result.symbol}: €${prices[result.symbol]}`)
          }
        }
      }
    }

    // Se alcuni simboli non hanno prezzi, restituisci comunque i prezzi disponibili
    const missingSymbols = symbols.filter(s => !(s in prices))
    if (missingSymbols.length > 0) {
      console.warn('⚠️ Prezzi non disponibili per:', missingSymbols.join(', '))
    }

    return NextResponse.json({
      prices,
      cached: symbolsToFetch.length === 0,
      timestamp: new Date().toISOString(),
      missing: missingSymbols
    })

  } catch (error) {
    console.error('💥 Errore nel recupero prezzi crypto:', error)
    
    // In caso di errore, prova a restituire prezzi dalla cache
    const symbolsParam = new URL(request.url).searchParams.get('symbols')
    if (symbolsParam) {
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase())
      const cachedPrices: Record<string, number> = {}
      
      for (const symbol of symbols) {
        if (priceCache[symbol]) {
          cachedPrices[symbol] = priceCache[symbol].price
        }
      }

      if (Object.keys(cachedPrices).length > 0) {
        console.log('🔄 Returning cached prices due to error')
        return NextResponse.json({
          prices: cachedPrices,
          cached: true,
          timestamp: new Date().toISOString(),
          warning: 'Prezzi da cache (API non disponibile)'
        })
      }
    }

    return NextResponse.json(
      { 
        error: 'Errore nel recupero prezzi',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    )
  }
}