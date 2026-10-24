import { useState, useEffect, useCallback } from 'react'
import { getBalances, erc20BalanceOf, erc20Allowance } from '../lib/contracts'

export interface Balances {
  baseFree: bigint
  baseLocked: bigint
  quoteFree: bigint
  quoteLocked: bigint
  walletBase: bigint
  walletQuote: bigint
  baseAllowance: bigint
  quoteAllowance: bigint
  loading: boolean
  error: string | null
}

export function useBalances(chainId: number, user: `0x${string}` | null) {
  const [balances, setBalances] = useState({
    baseFree: 0n,
    baseLocked: 0n,
    quoteFree: 0n,
    quoteLocked: 0n,
    walletBase: 0n,
    walletQuote: 0n,
    baseAllowance: 0n,
    quoteAllowance: 0n,
    loading: true,
    error: null as string | null,
  })

  const fetchBalances = useCallback(async () => {
    if (!user) {
      setBalances(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      setBalances(prev => ({ ...prev, loading: true, error: null }))

      const { CONTRACT_ADDRESSES } = await import('../lib/contracts')

      const [
        bookBalances,
        walletBase,
        walletQuote,
        baseAllowance,
        quoteAllowance,
      ] = await Promise.all([
        getBalances(chainId, user),
        erc20BalanceOf(chainId, 'tYBTC', user),
        erc20BalanceOf(chainId, 'tUSDC', user),
        erc20Allowance(chainId, 'tYBTC', user, CONTRACT_ADDRESSES.orderBook),
        erc20Allowance(chainId, 'tUSDC', user, CONTRACT_ADDRESSES.orderBook),
      ])

      setBalances({
        baseFree: bookBalances.baseFree,
        baseLocked: bookBalances.baseLocked,
        quoteFree: bookBalances.quoteFree,
        quoteLocked: bookBalances.quoteLocked,
        walletBase,
        walletQuote,
        baseAllowance,
        quoteAllowance,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Failed to fetch balances:', error)
      setBalances(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balances',
      }))
    }
  }, [chainId, user])

  useEffect(() => {
    fetchBalances()
    const interval = setInterval(fetchBalances, 10000)
    return () => clearInterval(interval)
  }, [fetchBalances])

  return { ...balances, refetch: fetchBalances }
}