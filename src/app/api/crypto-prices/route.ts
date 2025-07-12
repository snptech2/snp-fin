// src/app/api/crypto-prices/route.ts - VERSIONE OTTIMIZZATA CON SUPPORTO VALUTA
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { fetchCryptoPrices } from '@/lib/cryptoPrices'

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

    console.log('🔍 Crypto Prices API called for:', symbols.join(', '))

    // Usa la utility function
    const result = await fetchCryptoPrices(symbols, userId, forceRefresh)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('💥 Errore nel recupero prezzi crypto:', error)
    
    return NextResponse.json(
      { 
        error: 'Errore nel recupero prezzi',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    )
  }
}