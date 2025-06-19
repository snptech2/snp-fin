// src/hooks/useBitcoinPrice.ts - Hook riutilizzabile per gestire prezzo Bitcoin

import { useState, useEffect, useCallback } from 'react'

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
  timestamp: string
}

interface UseBitcoinPriceReturn {
  price: BitcoinPrice | null
  loading: boolean
  error: string | null
  refetch: (force?: boolean) => Promise<void>
  lastUpdated: Date | null
}

export const useBitcoinPrice = (autoRefreshMinutes = 15): UseBitcoinPriceReturn => {
  const [price, setPrice] = useState<BitcoinPrice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPrice = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/bitcoin-price${force ? '?force=true' : ''}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch Bitcoin price')
      }
      
      const data: BitcoinPrice = await response.json()
      setPrice(data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching Bitcoin price:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch al mount
  useEffect(() => {
    fetchPrice()
  }, [fetchPrice])

  // Auto-refresh con intervallo
  useEffect(() => {
    if (autoRefreshMinutes <= 0) return

    const interval = setInterval(() => {
      fetchPrice()
    }, autoRefreshMinutes * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchPrice, autoRefreshMinutes])

  const refetch = useCallback((force = false) => {
    return fetchPrice(force)
  }, [fetchPrice])

  return {
    price,
    loading,
    error,
    refetch,
    lastUpdated
  }
}