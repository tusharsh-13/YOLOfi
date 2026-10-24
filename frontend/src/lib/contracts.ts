import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { anvil, baseSepolia } from './chain'
import { ORDER_BOOK_ABI, ERC20_ABI } from './abi'

export { ORDER_BOOK_ABI }

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

// Contract addresses from environment
const ORDER_BOOK_ADDRESS = (import.meta.env.VITE_ORDERBOOK_ADDRESS || '') as `0x${string}`
const TYBTC_ADDRESS = (import.meta.env.VITE_TYBTC_ADDRESS || '') as `0x${string}`
const TUSDC_ADDRESS = (import.meta.env.VITE_TUSDC_ADDRESS || '') as `0x${string}`

export const CONTRACT_ADDRESSES = {
  orderBook: ORDER_BOOK_ADDRESS,
  tYBTC: TYBTC_ADDRESS,
  tUSDC: TUSDC_ADDRESS,
} as const

export function getChainFromId(chainId: number) {
  return chainId === baseSepolia.id ? baseSepolia : anvil
}

export function getPublicClient(chainId: number) {
  const chain = getChainFromId(chainId)
  return createPublicClient({
    chain: chain as any,
    transport: http(chain.rpcUrls.default.http[0]),
  })
}

export function getWalletClient(_chainId: number) {
  if (typeof window === 'undefined' || !window.ethereum) return null
  const chain = getChainFromId(anvil.id) // default to anvil for wallet client
  return createWalletClient({
    chain: chain as any,
    transport: custom(window.ethereum),
  })
}

async function simulateWrite(
  publicClient: any,
  walletClient: any,
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args: any[]
) {
  const { request } = await publicClient.simulateContract({
    address,
    abi,
    functionName,
    args,
    account: walletClient.account!,
  })
  return request
}

async function writeAndWait(
  walletClient: any,
  request: any
) {
  const hash = await walletClient.writeContract(request)
  const publicClient = getPublicClient(walletClient.chain?.id ?? anvil.id)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return receipt
}

// OrderBook wrappers
export async function deposit(
  chainId: number,
  token: 'tYBTC' | 'tUSDC',
  amount: bigint
) {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  const request = await simulateWrite(publicClient, walletClient, CONTRACT_ADDRESSES.orderBook, ORDER_BOOK_ABI, 'deposit', [tokenAddress, amount])
  return writeAndWait(walletClient, request)
}

export async function withdraw(
  chainId: number,
  token: 'tYBTC' | 'tUSDC',
  amount: bigint
) {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  const request = await simulateWrite(publicClient, walletClient, CONTRACT_ADDRESSES.orderBook, ORDER_BOOK_ABI, 'withdraw', [tokenAddress, amount])
  return writeAndWait(walletClient, request)
}

export async function placeLimitOrder(
  chainId: number,
  side: 0 | 1,
  price: bigint,
  amount: bigint,
  maxFills: bigint = 20n,
  hintPrice: bigint = 0n
) {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const request = await simulateWrite(publicClient, walletClient, CONTRACT_ADDRESSES.orderBook, ORDER_BOOK_ABI, 'placeLimitOrder', [side, price, amount, maxFills, hintPrice])
  return writeAndWait(walletClient, request)
}

export async function cancelOrder(chainId: number, orderId: bigint) {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const request = await simulateWrite(publicClient, walletClient, CONTRACT_ADDRESSES.orderBook, ORDER_BOOK_ABI, 'cancelOrder', [orderId])
  return writeAndWait(walletClient, request)
}

export async function getBalances(chainId: number, user: `0x${string}`) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'getBalances',
    args: [user],
  })
}

export async function getOrder(chainId: number, orderId: bigint) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'getOrder',
    args: [orderId],
  })
}

export async function getTopLevels(chainId: number, side: 0 | 1, n: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'getTopLevels',
    args: [side, BigInt(n)],
  })
}

export async function getUserOrders(chainId: number, user: `0x${string}`) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'getUserOrders',
    args: [user],
  })
}

export async function getSpread(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'getSpread',
  })
}

// ERC20 wrappers
export async function erc20BalanceOf(chainId: number, token: 'tYBTC' | 'tUSDC', user: `0x${string}`) {
  const publicClient = getPublicClient(chainId)
  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [user],
  })
}

export async function erc20Allowance(chainId: number, token: 'tYBTC' | 'tUSDC', owner: `0x${string}`, spender: `0x${string}`) {
  const publicClient = getPublicClient(chainId)
  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

export async function erc20Approve(chainId: number, token: 'tYBTC' | 'tUSDC', spender: `0x${string}`, amount: bigint) {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  const request = await simulateWrite(publicClient, walletClient, tokenAddress, ERC20_ABI, 'approve', [spender, amount])
  return writeAndWait(walletClient, request)
}

export async function erc20Mint(chainId: number, token: 'tYBTC' | 'tUSDC', to: `0x${string}`, amount: bigint) {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  const request = await simulateWrite(publicClient, walletClient, tokenAddress, ERC20_ABI, 'mint', [to, amount])
  return writeAndWait(walletClient, request)
}

export async function erc20Faucet(chainId: number, token: 'tYBTC' | 'tUSDC') {
  const publicClient = getPublicClient(chainId)
  const walletClient = getWalletClient(chainId)
  if (!walletClient) throw new Error('Wallet not connected')

  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  const request = await simulateWrite(publicClient, walletClient, tokenAddress, ERC20_ABI, 'faucet', [])
  return writeAndWait(walletClient, request)
}

export async function erc20Decimals(chainId: number, token: 'tYBTC' | 'tUSDC') {
  const publicClient = getPublicClient(chainId)
  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })
}

export async function erc20Symbol(chainId: number, token: 'tYBTC' | 'tUSDC') {
  const publicClient = getPublicClient(chainId)
  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  })
}

export async function erc20Name(chainId: number, token: 'tYBTC' | 'tUSDC') {
  const publicClient = getPublicClient(chainId)
  const tokenAddress = token === 'tYBTC' ? CONTRACT_ADDRESSES.tYBTC : CONTRACT_ADDRESSES.tUSDC
  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
  })
}

// Contract config getters
export async function getTickSize(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'tickSize',
  })
}

export async function getLotSize(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'lotSize',
  })
}

export async function getMinOrderSize(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'minOrderSize',
  })
}

export async function getTakerFeeBps(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'takerFeeBps',
  })
}

export async function getFeeBalance(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'feeBalance',
  })
}

export async function getBaseToken(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'base',
  })
}

export async function getQuoteToken(chainId: number) {
  const publicClient = getPublicClient(chainId)
  return publicClient.readContract({
    address: CONTRACT_ADDRESSES.orderBook,
    abi: ORDER_BOOK_ABI,
    functionName: 'quote',
  })
}