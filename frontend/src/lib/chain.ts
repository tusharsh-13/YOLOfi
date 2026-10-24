import { defineChain, type Chain } from 'viem'

export const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'Anvil Explorer', url: 'http://127.0.0.1:8545' },
  },
})

export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org' },
  },
})

export const CHAINS = [anvil, baseSepolia] as const

export function getChainConfig(chainId: number) {
  switch (chainId) {
    case anvil.id:
      return anvil
    case baseSepolia.id:
      return baseSepolia
    default:
      return anvil
  }
}

export type { Chain }
export const DEFAULT_CHAIN = anvil