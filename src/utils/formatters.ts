// src/utils/formatters.ts - Utility functions centralizzate per evitare duplicazioni

/**
 * Formatta un importo in valuta EUR o USD
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const locale = currency === 'USD' ? 'en-US' : 'it-IT'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Formatta quantità Bitcoin con 8 decimali
 */
export const formatBTC = (amount: number): string => {
  return amount.toFixed(8) + ' BTC'
}

/**
 * Formatta data in formato italiano
 */
export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('it-IT')
}

/**
 * Converte satoshi in Bitcoin
 */
export const satsToBTC = (sats: number): number => {
  return sats / 100000000
}

/**
 * Converte Bitcoin in satoshi
 */
export const btcToSats = (btc: number): number => {
  return Math.round(btc * 100000000)
}

/**
 * Calcola percentuale con segno
 */
export const formatPercentage = (value: number, showSign = true): string => {
  const sign = showSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Formatta numeri grandi con separatori
 */
export const formatNumber = (num: number, decimals = 0): string => {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * Calcola ROI tra due valori
 */
export const calculateROI = (currentValue: number, initialValue: number): number => {
  if (initialValue <= 0) return 0
  return ((currentValue - initialValue) / initialValue) * 100
}

/**
 * Formatta importo con colore basato sul valore
 */
export const formatCurrencyWithColor = (amount: number, currency: string = 'EUR'): { 
  formatted: string, 
  color: string 
} => {
  return {
    formatted: formatCurrency(amount, currency),
    color: amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-adaptive-900'
  }
}

/**
 * Validazione email semplice
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Tronca testo con ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Debounce function per ottimizzare performance
 */
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Verifica se una categoria è fiscale (tasse, imposte, contributi)
 */
export const isFiscalCategory = (categoryName: string): boolean => {
  if (!categoryName) return false
  
  const fiscalKeywords = [
    'tasse', 'imposte', 'contributi', 'f24', 'irpef', 'inps', 'irap',
    'partita iva', 'fiscali', 'pagamenti fiscali', 'pagamenti tasse'
  ]
  
  const normalizedName = categoryName.toLowerCase().trim()
  
  return fiscalKeywords.some(keyword => 
    normalizedName.includes(keyword)
  )
}

/**
 * Verifica se una transazione è fiscale basandosi sulla categoria
 */
export const isFiscalTransaction = (transaction: { category: { name: string } }): boolean => {
  return isFiscalCategory(transaction.category.name)
}

/**
 * Filtra le transazioni escludendo quelle fiscali
 */
export const filterOutFiscalTransactions = <T extends { category: { name: string } }>(
  transactions: T[]
): T[] => {
  return transactions.filter(transaction => !isFiscalTransaction(transaction))
}

/**
 * Filtra solo le transazioni fiscali
 */
export const filterFiscalTransactions = <T extends { category: { name: string } }>(
  transactions: T[]
): T[] => {
  return transactions.filter(transaction => isFiscalTransaction(transaction))
}

/**
 * Formatta quantità crypto con gestione intelligente dei decimali per valori piccoli
 */
export const formatCryptoSmart = (amount: number, decimals = 8): string => {
  if (amount === 0) return '0'
  
  // Per valori molto piccoli (< 0.01), mostra i primi 2-6 decimali significativi
  if (Math.abs(amount) < 0.01) {
    // Trova la posizione del primo digit significativo
    const absAmount = Math.abs(amount)
    const magnitude = Math.floor(Math.log10(absAmount))
    
    // Mostra 2-6 decimali significativi dopo l'ultimo zero
    const significantDecimals = Math.max(2, Math.min(8, Math.abs(magnitude) + 3))
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: significantDecimals,
      maximumFractionDigits: significantDecimals
    }).format(amount)
  }
  
  // Per valori normali, usa la formattazione standard
  return new Intl.NumberFormat('it-IT', { 
    minimumFractionDigits: Math.min(decimals, 8),
    maximumFractionDigits: Math.min(decimals, 8)
  }).format(amount)
}

/**
 * Formatta valuta EUR con gestione intelligente per valori molto piccoli
 */
export const formatCurrencySmart = (amount: number, currency: string = 'EUR'): string => {
  if (amount === 0) return formatCurrency(0, currency)
  
  // Per valori molto piccoli (< 0.01), non usare il simbolo della valuta
  // e mostra più decimali significativi
  if (Math.abs(amount) < 0.01) {
    const absAmount = Math.abs(amount)
    const magnitude = Math.floor(Math.log10(absAmount))
    const significantDecimals = Math.max(2, Math.min(10, Math.abs(magnitude) + 3))
    
    const formatted = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: significantDecimals,
      maximumFractionDigits: significantDecimals
    }).format(amount)
    
    return `${formatted} €`
  }
  
  // Per valori normali, usa la formattazione standard
  return formatCurrency(amount, currency)
}

/**
 * Arrotonda i prezzi crypto in modo intelligente per evitare di troncare valori piccoli
 * Risolve il problema di LUNC e altre crypto con valori in notazione scientifica
 * 
 * @param price - Prezzo in formato numero (es: 6.396e-05)
 * @returns Prezzo arrotondato preservando la precisione necessaria
 */
export const smartRoundPrice = (price: number): number => {
  if (price === 0) return 0
  
  const absPrice = Math.abs(price)
  
  // Per valori >= 0.01, usa 2 decimali standard
  if (absPrice >= 0.01) {
    return Math.round(price * 100) / 100
  }
  
  // Per valori >= 0.001, usa 4 decimali  
  if (absPrice >= 0.001) {
    return Math.round(price * 10000) / 10000
  }
  
  // Per valori >= 0.0001, usa 6 decimali
  if (absPrice >= 0.0001) {
    return Math.round(price * 1000000) / 1000000
  }
  
  // Per valori molto piccoli (come LUNC), usa 8 decimali
  return Math.round(price * 100000000) / 100000000
}