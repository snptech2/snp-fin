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