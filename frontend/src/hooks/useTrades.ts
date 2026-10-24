import { useState, useEffect, useCallback } from 'react'
import { parseAbiItem } from 'viem'
import { getPublicClient, CONTRACT_ADDRESSES } from '../lib/contracts'

export interface Trade {
  makerOrderId: bigint
  takerOrderId: bigint
  maker: `0x${string}`
  taker: `0x${string}`
  price: bigint
  amount: bigint
  fee: bigint
  timestamp: bigint
  txHash: `0x${string}`
}

export function useTrades(chainId: number, user?: `0x${string}`) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const publicClient = getPublicClient(chainId)
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.orderBook,
        event: parseAbiItem('event TradeExecuted(uint64 indexed makerOrderId, uint64 indexed takerOrderId, address indexed maker, address taker, uint256 price, uint256 amount, uint256 fee, uint256 timestamp)'),
        fromBlock: 'earliest',
      })

      const tradesData: Trade[] = logs.map((log: any) => ({
        makerOrderId: log.args.makerOrderId,
        takerOrderId: log.args.takerOrderId,
        maker: log.args.maker,
        taker: log.args.taker,
        price: log.args.price,
        amount: log.args.amount,
        fee: log.args.fee,
        timestamp: log.args.timestamp,
        txHash: log.transactionHash,
      })) as Trade[]
      
      // Filter for user's trades if user is provided
      const filtered = user 
        ? tradesData.filter(t => t.maker.toLowerCase() === user.toLowerCase() || t.taker.toLowerCase() === user.toLowerCase())
        : tradesData

      // Sort by timestamp descending (newest first)
      filtered.sort((a, b) => Number(b.timestamp - a.timestamp))
      
      setTrades(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
    } finally {
      setLoading(false)
    }
  }, [chainId, user])

  // Initial fetch
  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  // Periodic refresh as fallback
  useEffect(() => {
    const interval = setInterval(fetchTrades, 5000)
    return () => clearInterval(interval)
  }, [fetchTrades])

  return { trades, loading, error, refetch: fetchTrades }
}