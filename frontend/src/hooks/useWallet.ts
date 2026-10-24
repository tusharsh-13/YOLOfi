import { useState, useEffect, useCallback } from 'react'
import { anvil, baseSepolia } from '../lib/chain'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
      selectedAddress: string | null
      chainId: string | null
    }
  }
}

export interface WalletState {
  account: { address: `0x${string}` } | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  walletClient: any | null
}

export function useWallet() {
  const [state, setState] = useState({
    account: null as { address: `0x${string}` } | null,
    chainId: null as number | null,
    isConnected: false,
    isConnecting: false,
    walletClient: null as any,
  })

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    setState(prev => ({ ...prev, isConnecting: true }))

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (accounts.length === 0) throw new Error('No accounts found')

      const chainIdHex = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string
      const chainId = parseInt(chainIdHex, 16)

      const { createWalletClient, custom } = await import('viem')
      const { anvil, baseSepolia } = await import('../lib/chain')

      const walletClient = createWalletClient({
        chain: chainId === baseSepolia.id ? baseSepolia : anvil,
        transport: custom(window.ethereum),
      })

      setState({
        account: { address: accounts[0] as `0x${string}` },
        chainId,
        isConnected: true,
        isConnecting: false,
        walletClient,
      })
    } catch (error) {
      setState(prev => ({ ...prev, isConnecting: false }))
      throw error
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      account: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      walletClient: null,
    })
  }, [])

  const switchChain = useCallback(async (targetChainId: number) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    const { anvil, baseSepolia } = await import('../lib/chain')
    const targetChain = targetChainId === baseSepolia.id ? baseSepolia : anvil

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChain.id.toString(16)}`,
              chainName: targetChain.name,
              nativeCurrency: targetChain.nativeCurrency,
              rpcUrls: targetChain.rpcUrls.default.http,
              blockExplorerUrls: targetChain.blockExplorers?.default.url ? [targetChain.blockExplorers.default.url] : [],
            }],
          })
        } catch (addError) {
          throw new Error('Failed to add network')
        }
      } else {
        throw error
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return

    if (window.ethereum.selectedAddress) {
      const chainIdHex = window.ethereum.chainId
      const chainId = chainIdHex ? parseInt(chainIdHex, 16) : null

      setState(prev => ({
        ...prev,
        account: { address: window.ethereum!.selectedAddress as `0x${string}` },
        chainId,
        isConnected: true,
      }))
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(prev => ({ ...prev, account: null, isConnected: false }))
      } else {
        setState(prev => ({
          ...prev,
          account: { address: accounts[0] as `0x${string}` },
          isConnected: true,
        }))
      }
    }

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16)
      setState(prev => ({ ...prev, chainId }))
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  return {
    account: state.account,
    chainId: state.chainId,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    walletClient: state.walletClient,
    connect,
    disconnect,
    switchChain,
    targetChains: [anvil, baseSepolia] as const,
    isWrongChain: state.chainId !== null && !([anvil.id, baseSepolia.id] as const).includes(state.chainId as 31337 | 84532),
  }
}