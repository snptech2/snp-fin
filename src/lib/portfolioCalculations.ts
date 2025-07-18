// src/lib/portfolioCalculations.ts - Utility condivisa per calcolo valore portfolio

interface Portfolio {
  id: number
  name: string
  accountId: number
  type: 'dca_bitcoin' | 'crypto_wallet'
  stats: {
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    stakeRewards?: number
    isFullyRecovered: boolean
    totalValueEur?: number // Per crypto portfolios
    netBTC?: number // Per DCA portfolios (PRIORITÀ ASSOLUTA)
    totalBTC?: number // Fallback per DCA portfolios
    totalROI?: number
    unrealizedGains?: number
    transactionCount: number
    buyCount: number
    sellCount?: number
    stakeRewardCount?: number
    holdingsCount?: number
    realizedGains?: number
    totalGains?: number
  }
}

interface BitcoinPrice {
  btcPrice: number
  currency: string
  cached: boolean
  timestamp: string
}

/**
 * Calcola il valore attuale di un singolo DCA portfolio
 * Stessa logica utilizzata nella pagina investments (linee 195-215)
 */
export function calculateDCACurrentValue(portfolio: Portfolio, btcPrice: number): number {
  if (portfolio.type !== 'dca_bitcoin' && !portfolio.stats?.totalBTC && !portfolio.stats?.netBTC) {
    return 0
  }
  
  if (!btcPrice || btcPrice <= 0) {
    return 0
  }
  
  // Priority: netBTC (includes network fees)
  if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
    return portfolio.stats.netBTC * btcPrice
  }
  
  // Fallback: totalBTC
  if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
    return portfolio.stats.totalBTC * btcPrice
  }
  
  return 0
}

/**
 * Calcola il valore totale attuale di tutti i portfolio
 * Stessa logica utilizzata nella pagina investments (linee 227-244)
 */
export function calculateTotalCurrentValue(
  dcaPortfolios: Portfolio[], 
  cryptoPortfolios: Portfolio[], 
  btcPrice: number
): number {
  const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
  let totalCurrentValue = 0
  
  allPortfolios.forEach(portfolio => {
    const portfolioType = dcaPortfolios.includes(portfolio) ? 'dca_bitcoin' : 'crypto_wallet'
    
    if (portfolioType === 'crypto_wallet') {
      // Crypto portfolios: usa totalValueEur dal backend
      totalCurrentValue += portfolio.stats.totalValueEur || 0
    } else {
      // DCA portfolios: calcola direttamente
      if (portfolio.type === 'dca_bitcoin' && btcPrice > 0) {
        const btcAmount = portfolio.stats?.netBTC ?? portfolio.stats?.totalBTC ?? 0
        totalCurrentValue += btcAmount * btcPrice
      }
    }
  })
  
  return totalCurrentValue
}

/**
 * Calcola le statistiche complete del portfolio (stessa logica di overallStats)
 */
export function calculateOverallStats(
  dcaPortfolios: Portfolio[], 
  cryptoPortfolios: Portfolio[], 
  btcPrice: number
) {
  const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
  
  // Enhanced Cash Flow: Somma tutte le stats dai portfolio backend
  const totalInvested = allPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
  const totalCapitalRecovered = allPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
  const totalEffectiveInvestment = allPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
  const totalRealizedProfit = allPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
  
  // Calcola current value usando la funzione dedicata
  const totalCurrentValue = calculateTotalCurrentValue(dcaPortfolios, cryptoPortfolios, btcPrice)
  
  // Enhanced calculation per overall metrics
  const totalUnrealizedGains = totalCurrentValue - totalEffectiveInvestment
  const overallROI = totalInvested > 0 ? 
    ((totalRealizedProfit + totalUnrealizedGains) / totalInvested) * 100 : 0

  return {
    // Enhanced Cash Flow Metrics
    totalInvested,
    totalCapitalRecovered,
    totalEffectiveInvestment,
    totalRealizedProfit,
    isFullyRecovered: totalCapitalRecovered >= totalInvested,
    
    // Current Performance
    totalCurrentValue,
    totalUnrealizedGains,
    overallROI,
    
    // Counts
    totalPortfolios: allPortfolios.length,
    dcaCount: dcaPortfolios.length,
    cryptoCount: cryptoPortfolios.length
  }
}

/**
 * Utility per convertire da EUR a USD (per snapshot automation)
 */
export function convertEurToUsd(eurValue: number, eurUsdRate: number): number {
  return eurValue * eurUsdRate
}

/**
 * Utility per calcolare BTC equivalente dato un valore in USD
 */
export function calculateBTCFromUSD(usdValue: number, btcPriceUsd: number): number {
  if (btcPriceUsd <= 0) return 0
  return usdValue / btcPriceUsd
}