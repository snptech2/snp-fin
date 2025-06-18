// src/app/api/bitcoin-price/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Cache per evitare troppe richieste API
let priceCache: {
  btcEur: number
  btcUsd: number
  usdEur: number
  timestamp: number
} | null = null

const CACHE_DURATION = 30 * 1000 // 30 secondi per test

// GET - Ottieni prezzo Bitcoin in EUR
export async function GET(request: NextRequest) {
  try {
    // Controlla cache
    const now = Date.now()
    
    console.log('🔍 Bitcoin Price API called at:', new Date(now).toISOString())
    // ✅ Aggiungi controllo force refresh
const { searchParams } = new URL(request.url)
const forceRefresh = searchParams.get('force') === 'true'
    
    if (priceCache) {
      const cacheAge = now - priceCache.timestamp
      console.log('📦 Cache exists, age:', Math.round(cacheAge / 1000), 'seconds')
      console.log('🕐 Cache duration:', Math.round(CACHE_DURATION / 1000), 'seconds')
      console.log('✅ Cache valid:', cacheAge < CACHE_DURATION)
    } else {
      console.log('❌ No cache found')
    }
    
    if (!forceRefresh && priceCache && (now - priceCache.timestamp) < CACHE_DURATION) {
      console.log('🎯 Returning cached price')
      return NextResponse.json({
        btcEur: priceCache.btcEur,
        btcUsd: priceCache.btcUsd,
        usdEur: priceCache.usdEur,
        cached: true,
        timestamp: priceCache.timestamp
      })
    }

    console.log('🌐 Fetching fresh price from APIs...')

    // Richieste parallele per ottimizzare velocità
    const [btcResponse, usdEurResponse] = await Promise.all([
      // 1. Prezzo BTC in USD da cryptoprices.cc
      fetch('https://cryptoprices.cc/BTC', {
        method: 'GET',
        headers: {
          'User-Agent': 'SNP-Finance-App/1.0'
        }
      }),
      // 2. Tasso USD→EUR
      fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        method: 'GET',
        headers: {
          'User-Agent': 'SNP-Finance-App/1.0'
        }
      })
    ])

    if (!btcResponse.ok) {
      throw new Error(`Errore API cryptoprices.cc: ${btcResponse.status}`)
    }

    if (!usdEurResponse.ok) {
      throw new Error(`Errore API exchange rate: ${usdEurResponse.status}`)
    }

    // Parse prezzo BTC USD
    const btcUsdText = await btcResponse.text()
    const btcUsd = parseFloat(btcUsdText.trim())

    if (isNaN(btcUsd) || btcUsd <= 0) {
      throw new Error('Prezzo BTC non valido ricevuto')
    }

    // Parse tasso USD→EUR
    const exchangeData = await usdEurResponse.json()
    const usdEur = exchangeData.rates?.EUR

    if (!usdEur || isNaN(usdEur) || usdEur <= 0) {
      throw new Error('Tasso di cambio USD→EUR non valido')
    }

    // Calcola prezzo BTC in EUR
    const btcEur = btcUsd * usdEur

    // Aggiorna cache
    priceCache = {
      btcEur: Math.round(btcEur * 100) / 100, // Arrotonda a 2 decimali
      btcUsd: Math.round(btcUsd * 100) / 100,
      usdEur: Math.round(usdEur * 10000) / 10000, // 4 decimali per tasso
      timestamp: now
    }

    console.log('💾 Cache updated with new price:', priceCache.btcEur, 'EUR')
    console.log('🕐 New cache timestamp:', new Date(priceCache.timestamp).toISOString())

    return NextResponse.json({
      btcEur: priceCache.btcEur,
      btcUsd: priceCache.btcUsd,
      usdEur: priceCache.usdEur,
      cached: false,
      timestamp: priceCache.timestamp
    })

  } catch (error) {
    console.error('Errore nel recupero prezzo Bitcoin:', error)
    
    // Se abbiamo una cache anche se scaduta, usala come fallback
    if (priceCache) {
      return NextResponse.json({
        btcEur: priceCache.btcEur,
        btcUsd: priceCache.btcUsd,
        usdEur: priceCache.usdEur,
        cached: true,
        timestamp: priceCache.timestamp,
        warning: 'Prezzo da cache (API non disponibile)'
      })
    }

    return NextResponse.json(
      { 
        error: 'Errore nel recupero prezzo Bitcoin',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    )
  }
}