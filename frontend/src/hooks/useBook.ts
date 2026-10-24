import { useState, useEffect, useCallback } from 'react'
import { getTopLevels, getSpread } from '../lib/contracts'

export interface Level {
  price: bigint
  total: bigint
}

export interface Spread {
  bestBid: bigint
  bestAsk: bigint
}

export function useBook(chainId: number) {
  const [bids, setBids] = useState<Level[]>([])
  const [asks, setAsks] = useState<Level[]>([])
  const [spread, setSpread] = useState<{ bestBid: bigint, bestAsk: bigint }>({ bestBid: 0n, bestAsk: 0n })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBook = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [bidsData, asksData, spreadData] = await Promise.all([
        getTopLevels(chainId, 0, 20),
        getTopLevels(chainId, 1, 20),
        getSpread(chainId),
      ])

      setBids(bidsData.prices.map((price, i) => ({ price, total: bidsData.totals[i] })))
      setAsks(asksData.prices.map((price, i) => ({ price, total: asksData.totals[i] })))
      setSpread({ bestBid: spreadData[0], bestAsk: spreadData[1] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order book')
    } finally {
      setLoading(false)
    }
  }, [chainId])

  useEffect(() => {
    fetchBook()
  }, [fetchBook])

  // Periodic refresh as fallback
  useEffect(() => {
    const interval = setInterval(fetchBook, 5000)
    return () => clearInterval(interval)
  }, [fetchBook])

  return { bids, asks, spread, loading, error, refetch: fetchBook }
}