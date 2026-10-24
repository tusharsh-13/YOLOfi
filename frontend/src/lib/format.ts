import { formatUnits, parseUnits } from 'viem'

export const PRICE_SCALE = 10n ** 18n
export const TICK_SIZE = 10n ** 4n
export const LOT_SIZE = 10n ** 14n
export const MIN_ORDER_SIZE = 10n ** 14n

export function formatBase(amount: bigint, decimals = 18): string {
  return formatUnits(amount, decimals)
}

export function formatQuote(amount: bigint, decimals = 6): string {
  return formatUnits(amount, decimals)
}

export function parseBase(amount: string, decimals = 18): bigint {
  return parseUnits(amount, decimals)
}

export function parseQuote(amount: string, decimals = 6): bigint {
  return parseUnits(amount, decimals)
}

export function formatPrice(price: bigint): string {
  // price is quote units per 1e18 base
  // Display as price / 1e18 * 1e6 (quote decimals) for readability
  const display = (price * 10n ** 6n) / PRICE_SCALE
  return formatQuote(display, 6)
}

export function parsePrice(priceStr: string): bigint {
  // Parse display price back to contract price units
  const parsed = parseQuote(priceStr, 6)
  return (parsed * PRICE_SCALE) / 10n ** 6n
}

export function formatAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals)
}

export function parseAmount(amountStr: string, decimals: number): bigint {
  return parseUnits(amountStr, decimals)
}

export function roundToTick(price: bigint): bigint {
  return (price / TICK_SIZE) * TICK_SIZE
}

export function roundToLot(amount: bigint): bigint {
  return (amount / LOT_SIZE) * LOT_SIZE
}

export function roundUpToLot(amount: bigint): bigint {
  return ((amount + LOT_SIZE - 1n) / LOT_SIZE) * LOT_SIZE
}

export function roundDownToLot(amount: bigint): bigint {
  return (amount / LOT_SIZE) * LOT_SIZE
}

export function roundUpToTick(price: bigint): bigint {
  return ((price + TICK_SIZE - 1n) / TICK_SIZE) * TICK_SIZE
}

export function roundDownToTick(price: bigint): bigint {
  return (price / TICK_SIZE) * TICK_SIZE
}

export function validateTickPrice(price: bigint): boolean {
  return price % TICK_SIZE === 0n
}

export function validateLotAmount(amount: bigint): boolean {
  return amount % LOT_SIZE === 0n
}

export function validateMinOrderSize(amount: bigint): boolean {
  return amount >= MIN_ORDER_SIZE
}

export function calculateQuoteAmount(baseAmount: bigint, price: bigint): bigint {
  // quoteAmount = baseAmount * price / 1e18
  return (baseAmount * price) / PRICE_SCALE
}

export function calculateFee(quoteAmount: bigint, feeBps: bigint): bigint {
  return (quoteAmount * feeBps) / 10000n
}

export function formatAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

export function formatTimestampShort(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleTimeString()
}

export function formatBigNumber(num: bigint, decimals = 18): string {
  if (num === 0n) return '0'
  const str = num.toString()
  const prefix = str.length > decimals ? str.slice(0, -decimals) : '0'
  const suffix = str.length > decimals ? str.slice(-decimals).padStart(decimals, '0') : str.padStart(decimals, '0')
  
  // Trim trailing zeros from suffix
  const trimmedSuffix = suffix.replace(/0+$/, '')
  
  if (trimmedSuffix === '') {
    return prefix
  }
  return `${prefix}.${trimmedSuffix}`
}

export function sideToString(side: 0 | 1): 'BUY' | 'SELL' {
  return side === 0 ? 'BUY' : 'SELL'
}

export function stringToSide(str: string): 0 | 1 {
  return str.toUpperCase() === 'BUY' ? 0 : 1
}

export const SIDE_BUY = 0 as const
export const SIDE_SELL = 1 as const

export const TOKEN_TYBTC = 'tYBTC' as const
export const TOKEN_TUSDC = 'tUSDC' as const