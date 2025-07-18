// src/utils/precision.ts - Utility per arrotondamenti consistenti

/**
 * Arrotonda un numero a un numero specifico di decimali
 * @param value Il valore da arrotondare
 * @param decimals Numero di decimali (default: 2)
 */
export function roundToPrecision(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Arrotondamenti standard per diverse tipologie di valori
 */
export const PrecisionUtils = {
  // Prezzi in valuta (EUR/USD) - 2 decimali
  currency: (value: number) => roundToPrecision(value, 2),
  
  // Tassi di cambio - 4 decimali
  exchangeRate: (value: number) => roundToPrecision(value, 4),
  
  // Bitcoin amount - 8 decimali (standard BTC precision)
  bitcoin: (value: number) => roundToPrecision(value, 8),
  
  // Prezzi BTC in valuta fiat - 2 decimali
  bitcoinPrice: (value: number) => roundToPrecision(value, 2),
  
  // Percentuali - 4 decimali
  percentage: (value: number) => roundToPrecision(value, 4)
}

/**
 * Verifica se due numeri sono sostanzialmente uguali considerando la precisione
 * @param a Primo numero
 * @param b Secondo numero
 * @param tolerance Tolleranza (default: 0.00001)
 */
export function areNumbersEqual(a: number, b: number, tolerance: number = 0.00001): boolean {
  return Math.abs(a - b) < tolerance
}

/**
 * Valida se la differenza tra due calcoli BTC è accettabile
 * @param calculated BTC calcolato
 * @param expected BTC atteso
 * @param tolerance Tolleranza in BTC (default: 0.00001)
 */
export function validateBTCCalculation(calculated: number, expected: number, tolerance: number = 0.00001): {
  isValid: boolean
  difference: number
  percentageDiff: number
} {
  const difference = Math.abs(calculated - expected)
  const percentageDiff = expected !== 0 ? (difference / expected) * 100 : 0
  
  return {
    isValid: difference < tolerance,
    difference,
    percentageDiff
  }
}