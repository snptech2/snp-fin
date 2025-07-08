// src/app/api/bitcoin-price/route.ts - VERSIONE OTTIMIZZATA CON SUPPORTO VALUTA
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Cache per evitare troppe richieste API
let priceCache: {
  btcEur: number
  btcUsd: number
  usdEur: number
  timestamp: number
} | null = null

// PERFORMANCE: Cache estesa a 10 minuti per ridurre chiamate API esterne
const CACHE_DURATION = 10 * 60 * 1000 // 10 minuti

// GET - Ottieni prezzo Bitcoin nella valuta dell'utente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('force') === 'true'
    
    // Ottieni valuta utente
    const authResult = requireAuth(request)
    if (authResult instanceof Response) return authResult
    const { userId } = authResult
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    })
    
    const userCurrency = user?.currency || 'EUR'
    
    const now = Date.now()
    
    console.log('🔍 Bitcoin Price API called at:', new Date(now).toISOString())
    console.log('💱 User currency:', userCurrency)
    console.log('🔄 Force refresh:', forceRefresh)
    
    // Controlla cache solo se non forza refresh
    if (!forceRefresh && priceCache) {
      const cacheAge = now - priceCache.timestamp
      console.log('📦 Cache exists, age:', Math.round(cacheAge / 1000), 'seconds')
      console.log('✅ Cache valid:', cacheAge < CACHE_DURATION)
      
      if (cacheAge < CACHE_DURATION) {
        console.log('🎯 Returning cached price')
        
        // Restituisci solo il prezzo nella valuta dell'utente
        const btcPrice = userCurrency === 'USD' ? priceCache.btcUsd : priceCache.btcEur
        
        return NextResponse.json({
          btcPrice: btcPrice,
          currency: userCurrency,
          cached: true,
          timestamp: new Date(priceCache.timestamp).toISOString()
        })
      }
    }

    console.log('🌐 Fetching fresh price from APIs...')

    // OTTIMIZZAZIONE: Fetch basato sulla valuta dell'utente
    let btcUsd: number
    let btcEur: number
    let usdEur: number
    
    if (userCurrency === 'USD') {
      // Se l'utente usa USD, fetch diretto da cryptoprices.cc
      console.log('💵 Fetching BTC-USD directly (no conversion needed)')
      
      const btcResponse = await fetch('https://cryptoprices.cc/BTC', {
        method: 'GET',
        headers: {
          'User-Agent': 'SNP-Finance-App/1.0'
        },
        cache: 'no-store'
      })
      
      if (!btcResponse.ok) {
        throw new Error(`Errore API cryptoprices.cc: ${btcResponse.status}`)
      }
      
      const btcUsdText = await btcResponse.text()
      btcUsd = parseFloat(btcUsdText.trim())
      
      if (isNaN(btcUsd) || btcUsd <= 0) {
        throw new Error('Prezzo BTC non valido ricevuto')
      }
      
      // Per la cache, ottieni comunque EUR rate in background
      try {
        const usdEurResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          method: 'GET',
          headers: {
            'User-Agent': 'SNP-Finance-App/1.0'
          },
          cache: 'no-store'
        })
        
        if (usdEurResponse.ok) {
          const exchangeData = await usdEurResponse.json()
          usdEur = exchangeData.rates?.EUR || 0.85 // Fallback rate
          btcEur = btcUsd * usdEur
        } else {
          // Fallback rates
          usdEur = 0.85
          btcEur = btcUsd * usdEur
        }
      } catch {
        usdEur = 0.85
        btcEur = btcUsd * usdEur
      }
      
    } else {
      // Se l'utente usa EUR, fetch sia USD che EUR rate
      console.log('💶 Fetching BTC-USD and converting to EUR')
      
      const [btcResponse, usdEurResponse] = await Promise.all([
        fetch('https://cryptoprices.cc/BTC', {
          method: 'GET',
          headers: {
            'User-Agent': 'SNP-Finance-App/1.0'
          },
          cache: 'no-store'
        }),
        fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          method: 'GET',
          headers: {
            'User-Agent': 'SNP-Finance-App/1.0'
          },
          cache: 'no-store'
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
      btcUsd = parseFloat(btcUsdText.trim())
      
      if (isNaN(btcUsd) || btcUsd <= 0) {
        throw new Error('Prezzo BTC non valido ricevuto')
      }
      
      // Parse tasso USD→EUR
      const exchangeData = await usdEurResponse.json()
      usdEur = exchangeData.rates?.EUR
      
      if (!usdEur || isNaN(usdEur) || usdEur <= 0) {
        throw new Error('Tasso di cambio USD→EUR non valido')
      }
      
      // Calcola prezzo BTC in EUR
      btcEur = btcUsd * usdEur
    }

    // Aggiorna cache con entrambi i prezzi
    priceCache = {
      btcEur: Math.round(btcEur * 100) / 100, // Arrotonda a 2 decimali
      btcUsd: Math.round(btcUsd * 100) / 100,
      usdEur: Math.round(usdEur * 10000) / 10000, // 4 decimali per tasso
      timestamp: now
    }

    console.log('💾 Cache updated with new prices:', {
      btcUsd: priceCache.btcUsd,
      btcEur: priceCache.btcEur,
      usdEur: priceCache.usdEur
    })
    console.log('🕐 New cache timestamp:', new Date(priceCache.timestamp).toISOString())

    // Restituisci solo il prezzo nella valuta dell'utente
    const btcPrice = userCurrency === 'USD' ? priceCache.btcUsd : priceCache.btcEur

    return NextResponse.json({
      btcPrice: btcPrice,
      currency: userCurrency,
      cached: false,
      timestamp: new Date(priceCache.timestamp).toISOString()
    })

  } catch (error) {
    console.error('💥 Errore nel recupero prezzo Bitcoin:', error)
    
    // Se abbiamo una cache anche se scaduta, usala come fallback
    if (priceCache) {
      console.log('🔄 Using fallback cache due to error')
      
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
      
      const btcPrice = userCurrency === 'USD' ? priceCache.btcUsd : priceCache.btcEur
      
      return NextResponse.json({
        btcPrice: btcPrice,
        currency: userCurrency,
        cached: true,
        timestamp: new Date(priceCache.timestamp).toISOString(),
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