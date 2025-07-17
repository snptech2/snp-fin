// src/lib/yahooFinance.ts - Yahoo Finance utility for consistent exchange rates
// Provides Google Finance-compatible USD/EUR exchange rates across the application

interface ExchangeRateResponse {
  rates: {
    EUR: number
  }
}

/**
 * Fetches USD/EUR exchange rate from Yahoo Finance (Google Finance compatible)
 * This replaces the old exchangerate-api.com to provide more accurate rates
 * that match what Google Sheets GOOGLEFINANCE() function returns
 */
export async function fetchYahooFinanceRate(): Promise<ExchangeRateResponse> {
  try {
    console.log('🌐 Fetching Yahoo Finance rate (Google Finance compatible)...')
    
    // Yahoo Finance API for EUR/USD rate (same data as Google Finance)
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1m&range=1d', {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0'
      },
      cache: 'no-store'
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Extract current rate from Yahoo Finance response
      const result = data?.chart?.result?.[0]
      const currentPrice = result?.meta?.regularMarketPrice
      
      if (currentPrice && typeof currentPrice === 'number' && currentPrice > 0) {
        // Yahoo gives EUR/USD rate, we need USD/EUR rate
        const usdEurRate = 1 / currentPrice
        
        console.log('✅ Yahoo Finance EUR/USD rate:', currentPrice)
        console.log('✅ Converted USD/EUR rate:', usdEurRate)
        
        return {
          rates: {
            EUR: Math.round(usdEurRate * 100000) / 100000 // Round to 5 decimals
          }
        }
      }
    }
    
    console.log('🔄 Yahoo Finance failed, trying direct USD/EUR...')
    
    // Try USD/EUR directly
    const usdEurResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDEUR=X?interval=1m&range=1d', {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0'
      },
      cache: 'no-store'
    })
    
    if (usdEurResponse.ok) {
      const usdEurData = await usdEurResponse.json()
      const usdEurResult = usdEurData?.chart?.result?.[0]
      const usdEurPrice = usdEurResult?.meta?.regularMarketPrice
      
      if (usdEurPrice && typeof usdEurPrice === 'number' && usdEurPrice > 0) {
        console.log('✅ Yahoo Finance USD/EUR rate (direct):', usdEurPrice)
        
        return {
          rates: {
            EUR: Math.round(usdEurPrice * 100000) / 100000
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching Yahoo Finance rate:', error)
  }
  
  // Fallback to exchangerate-api as secondary option (not hard-coded rate)
  try {
    console.log('🔄 Yahoo Finance failed, falling back to exchangerate-api')
    const fallbackResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      method: 'GET',
      headers: {
        'User-Agent': 'SNP-Finance-App/1.0'
      },
      cache: 'no-store'
    })
    
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json()
      console.log('✅ Using exchangerate-api fallback:', fallbackData.rates?.EUR)
      return fallbackData
    }
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError)
  }
  
  // No hard fallback - throw error to prevent stale data
  throw new Error('All exchange rate APIs failed - no fallback available')
}

/**
 * Cached version of Yahoo Finance rate fetcher
 * Includes 5-minute cache to avoid excessive API calls
 */
let rateCache: {
  rate: number
  timestamp: number
} | null = null

const RATE_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes - aligned with bitcoin-price cache

export async function fetchYahooFinanceRateCached(): Promise<number> {
  const now = Date.now()
  
  // Check cache first
  if (rateCache && (now - rateCache.timestamp) < RATE_CACHE_DURATION) {
    console.log('📦 Using cached Yahoo Finance rate:', rateCache.rate)
    console.log('📦 Cache age:', Math.round((now - rateCache.timestamp) / 1000), 'seconds')
    return rateCache.rate
  }
  
  // Fetch fresh rate
  const response = await fetchYahooFinanceRate()
  const rate = response.rates.EUR
  
  // Update cache
  rateCache = {
    rate,
    timestamp: now
  }
  
  console.log('💾 Yahoo Finance rate cached at:', new Date(now).toISOString())
  return rate
}