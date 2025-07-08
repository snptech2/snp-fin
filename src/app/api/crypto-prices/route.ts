// src/app/api/crypto-prices/route.ts - VERSIONE OTTIMIZZATA CON SUPPORTO VALUTA
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Cache per evitare troppe richieste API - ora supporta entrambe le valute
let priceCache: Record<string, { 
  priceUsd: number,
  priceEur: number,
  usdEur: number,
  timestamp: number 
}> = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minuti

// GET - Ottieni prezzi crypto nella valuta dell'utente
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

    // Ottieni valuta utente
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    })
    
    const userCurrency = user?.currency || 'EUR'

    console.log('🔍 Crypto Prices API called for:', symbols.join(', '))
    console.log('💱 User currency:', userCurrency)

    const now = Date.now()
    const prices: Record<string, number> = {}
    const symbolsToFetch: string[] = []

    // Controlla cache per ogni simbolo
    for (const symbol of symbols) {
      if (!forceRefresh && priceCache[symbol]) {
        const cacheAge = now - priceCache[symbol].timestamp
        if (cacheAge < CACHE_DURATION) {
          // Restituisci il prezzo nella valuta dell'utente
          const price = userCurrency === 'USD' ? priceCache[symbol].priceUsd : priceCache[symbol].priceEur
          prices[symbol] = price
          console.log(`📦 Using cached price for ${symbol}: ${userCurrency === 'USD' ? '$' : '€'}${price}`)
          continue
        }
      }
      symbolsToFetch.push(symbol)
    }

    if (symbolsToFetch.length > 0) {
      console.log('🌐 Fetching fresh prices for:', symbolsToFetch.join(', '))

      // OTTIMIZZAZIONE: Se l'utente usa USD, non serve il tasso di cambio
      let usdEur = 1.0 // Default per USD
      
      if (userCurrency === 'EUR') {
        console.log('💶 User currency is EUR, fetching exchange rate...')
        
        const usdEurResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          headers: { 'User-Agent': 'SNP-Finance-App/1.0' },
          cache: 'no-store'
        })

        if (!usdEurResponse.ok) {
          throw new Error(`Errore API exchange rate: ${usdEurResponse.status}`)
        }

        const exchangeData = await usdEurResponse.json()
        usdEur = exchangeData.rates?.EUR

        if (!usdEur || isNaN(usdEur) || usdEur <= 0) {
          throw new Error('Tasso di cambio USD→EUR non valido')
        }
        
        console.log('💱 USD→EUR rate:', usdEur)
      } else {
        console.log('💵 User currency is USD, skipping exchange rate fetch')
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
            return { symbol, priceUsd: null, priceEur: null }
          }

          const priceText = await response.text()
          const priceUsd = parseFloat(priceText.trim())

          if (isNaN(priceUsd) || priceUsd <= 0) {
            console.warn(`⚠️ Prezzo non valido per ${symbol}: ${priceText}`)
            return { symbol, priceUsd: null, priceEur: null }
          }

          // Calcola sempre entrambi i prezzi per la cache
          const priceEur = Math.round(priceUsd * usdEur * 100) / 100
          const roundedPriceUsd = Math.round(priceUsd * 100) / 100

          // Aggiorna cache con entrambi i prezzi
          priceCache[symbol] = { 
            priceUsd: roundedPriceUsd, 
            priceEur: priceEur, 
            usdEur: usdEur,
            timestamp: now 
          }

          console.log(`✅ ${symbol}: $${roundedPriceUsd} → €${priceEur}`)
          return { symbol, priceUsd: roundedPriceUsd, priceEur: priceEur }

        } catch (error) {
          console.error(`❌ Errore per ${symbol}:`, error)
          return { symbol, priceUsd: null, priceEur: null }
        }
      })

      const results = await Promise.all(pricePromises)
      
      // Aggiungi prezzi ottenuti nella valuta dell'utente
      for (const result of results) {
        const resultPrice = userCurrency === 'USD' ? result.priceUsd : result.priceEur
        
        if (resultPrice !== null) {
          prices[result.symbol] = resultPrice
        } else {
          // Se il prezzo non è disponibile, mantieni l'ultimo prezzo noto
          if (priceCache[result.symbol]) {
            const cachedPrice = userCurrency === 'USD' ? priceCache[result.symbol].priceUsd : priceCache[result.symbol].priceEur
            prices[result.symbol] = cachedPrice
            console.log(`🔄 Using last known price for ${result.symbol}: ${userCurrency === 'USD' ? '$' : '€'}${cachedPrice}`)
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
      currency: userCurrency,
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
      
      // Ottieni valuta utente per fallback
      let userCurrency = 'EUR'
      try {
        const authResult = requireAuth(request)
        if (!(authResult instanceof Response)) {
          const user = await prisma.user.findUnique({
            where: { id: authResult.userId },
            select: { currency: true }
          })
          userCurrency = user?.currency || 'EUR'
        }
      } catch {
        // Ignora errori in fallback
      }
      
      for (const symbol of symbols) {
        if (priceCache[symbol]) {
          const price = userCurrency === 'USD' ? priceCache[symbol].priceUsd : priceCache[symbol].priceEur
          cachedPrices[symbol] = price
        }
      }

      if (Object.keys(cachedPrices).length > 0) {
        console.log('🔄 Returning cached prices due to error')
        return NextResponse.json({
          prices: cachedPrices,
          currency: userCurrency,
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