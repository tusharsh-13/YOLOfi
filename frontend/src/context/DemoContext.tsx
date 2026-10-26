import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { formatBase, formatQuote, formatPrice, calculateQuoteAmount, calculateFee } from '../lib/format'

export interface DemoBalances {
  baseFree: bigint
  baseLocked: bigint
  quoteFree: bigint
  quoteLocked: bigint
  walletBase: bigint
  walletQuote: bigint
  baseAllowance: bigint
  quoteAllowance: bigint
}

export interface DemoLevel {
  price: bigint
  total: bigint
}

export interface DemoOrder {
  id: bigint
  owner: `0x${string}`
  side: number // 0 = buy, 1 = sell
  price: bigint
  amount: bigint
  filled: bigint
  timestamp: number
}

export interface DemoTrade {
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

export interface DemoToast {
  id: string
  type: 'success' | 'trade' | 'info' | 'error'
  title: string
  message: string
  txHash?: string
}

export interface DemoAccount {
  id: 'alice' | 'bob'
  name: string
  address: `0x${string}`
  description: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'alice',
    name: 'Alice (Demo Trader)',
    address: '0x71C84d830C8C7E777cE177e77b61D9839420dEAd',
    description: 'Primary active trader persona',
  },
  {
    id: 'bob',
    name: 'Bob (Market Maker)',
    address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    description: 'Liquidity provider & counter-party',
  },
]

// Default initial state
const INITIAL_BALANCES: DemoBalances = {
  baseFree: 2_000_000_000_000_000_000n, // 2.0 tYBTC
  baseLocked: 0n,
  quoteFree: 100_000_000_000n, // 100,000.00 tUSDC
  quoteLocked: 0n,
  walletBase: 5_000_000_000_000_000_000n, // 5.0 tYBTC
  walletQuote: 250_000_000_000n, // 250,000.00 tUSDC
  baseAllowance: 100_000_000_000_000_000_000n, // 100 tYBTC
  quoteAllowance: 10_000_000_000_000n, // 10,000,000 tUSDC
}

const INITIAL_BIDS: DemoLevel[] = [
  { price: 99_500_000_000n, total: 500_000_000_000_000_000n }, // $99,500, 0.50 tYBTC
  { price: 98_000_000_000n, total: 350_000_000_000_000_000n }, // $98,000, 0.35 tYBTC
  { price: 96_500_000_000n, total: 800_000_000_000_000_000n }, // $96,500, 0.80 tYBTC
  { price: 95_000_000_000n, total: 1_200_000_000_000_000_000n }, // $95,000, 1.20 tYBTC
  { price: 93_500_000_000n, total: 1_500_000_000_000_000_000n }, // $93,500, 1.50 tYBTC
]

const INITIAL_ASKS: DemoLevel[] = [
  { price: 101_000_000_000n, total: 250_000_000_000_000_000n }, // $101,000, 0.25 tYBTC
  { price: 102_500_000_000n, total: 600_000_000_000_000_000n }, // $102,500, 0.60 tYBTC
  { price: 104_000_000_000n, total: 400_000_000_000_000_000n }, // $104,000, 0.40 tYBTC
  { price: 105_000_000_000n, total: 1_000_000_000_000_000_000n }, // $105,000, 1.00 tYBTC
  { price: 106_500_000_000n, total: 1_800_000_000_000_000_000n }, // $106,500, 1.80 tYBTC
]

const INITIAL_TRADES: DemoTrade[] = [
  {
    makerOrderId: 101n,
    takerOrderId: 102n,
    maker: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    taker: '0x71C84d830C8C7E777cE177e77b61D9839420dEAd',
    price: 100_000_000_000n, // $100,000
    amount: 250_000_000_000_000_000n, // 0.25 tYBTC
    fee: 25_000_000n, // $25.00
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 180),
    txHash: '0x3a4b9c1d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
  },
  {
    makerOrderId: 98n,
    takerOrderId: 99n,
    maker: '0x71C84d830C8C7E777cE177e77b61D9839420dEAd',
    taker: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    price: 99_000_000_000n, // $99,000
    amount: 150_000_000_000_000_000n, // 0.15 tYBTC
    fee: 14_850_000n, // $14.85
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 520),
    txHash: '0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
  },
]

function randomTxHash(): `0x${string}` {
  const chars = '0123456789abcdef'
  let result = '0x'
  for (let i = 0; i < 64; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result as `0x${string}`
}

export interface DemoContextType {
  isDemoMode: boolean
  setDemoMode: (val: boolean) => void
  currentAccount: DemoAccount
  switchAccount: (id: 'alice' | 'bob') => void
  currentStep: number
  setCurrentStep: (step: number) => void
  balances: DemoBalances
  bids: DemoLevel[]
  asks: DemoLevel[]
  spread: { bestBid: bigint; bestAsk: bigint }
  myOrders: DemoOrder[]
  trades: DemoTrade[]
  toasts: DemoToast[]
  addToast: (toast: Omit<DemoToast, 'id'>) => void
  removeToast: (id: string) => void
  prefillOrder: { side?: 'buy' | 'sell'; price?: string; amount?: string } | null
  setPrefillOrder: (val: { side?: 'buy' | 'sell'; price?: string; amount?: string } | null) => void

  // Actions
  faucetMint: (token: 'tYBTC' | 'tUSDC', amount?: bigint) => Promise<void>
  depositToken: (token: 'tYBTC' | 'tUSDC', amount: bigint) => Promise<void>
  withdrawToken: (token: 'tYBTC' | 'tUSDC', amount: bigint) => Promise<void>
  approveToken: (token: 'tYBTC' | 'tUSDC', amount?: bigint) => Promise<void>
  placeOrder: (side: 'buy' | 'sell', price: bigint, amount: bigint, maxFills?: number) => Promise<bigint>
  cancelOrder: (orderId: bigint) => Promise<void>
  runStepAction: (step: number) => Promise<void>
  resetDemo: () => void
}

const DemoContext = createContext<DemoContextType | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true)
  const [currentAccount, setCurrentAccount] = useState<DemoAccount>(DEMO_ACCOUNTS[0])
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [balances, setBalances] = useState<DemoBalances>(INITIAL_BALANCES)
  const [bids, setBids] = useState<DemoLevel[]>(INITIAL_BIDS)
  const [asks, setAsks] = useState<DemoLevel[]>(INITIAL_ASKS)
  const [myOrders, setMyOrders] = useState<DemoOrder[]>([])
  const [trades, setTrades] = useState<DemoTrade[]>(INITIAL_TRADES)
  const [toasts, setToasts] = useState<DemoToast[]>([])
  const [prefillOrder, setPrefillOrder] = useState<{ side?: 'buy' | 'sell'; price?: string; amount?: string } | null>(null)
  const [nextOrderId, setNextOrderId] = useState<bigint>(1001n)

  const spread = {
    bestBid: bids.length > 0 ? bids[0].price : 0n,
    bestAsk: asks.length > 0 ? asks[0].price : 0n,
  }

  const addToast = useCallback((toast: Omit<DemoToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [ { ...toast, id }, ...prev.slice(0, 4) ])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const switchAccount = useCallback((id: 'alice' | 'bob') => {
    const target = DEMO_ACCOUNTS.find(a => a.id === id) || DEMO_ACCOUNTS[0]
    setCurrentAccount(target)
    addToast({
      type: 'info',
      title: `Switched Persona to ${target.name}`,
      message: `Now trading from ${target.address.slice(0, 8)}... (${target.description})`,
    })
  }, [addToast])

  // Faucet
  const faucetMint = useCallback(async (token: 'tYBTC' | 'tUSDC', amount?: bigint) => {
    const tx = randomTxHash()
    const defaultAmount = token === 'tYBTC' ? 1_000_000_000_000_000_000n : 50_000_000_000n // 1 BTC or 50,000 USDC
    const mintAmt = amount || defaultAmount

    setBalances(prev => ({
      ...prev,
      walletBase: token === 'tYBTC' ? prev.walletBase + mintAmt : prev.walletBase,
      walletQuote: token === 'tUSDC' ? prev.walletQuote + mintAmt : prev.walletQuote,
    }))

    const formatted = token === 'tYBTC' ? `${formatBase(mintAmt)} tYBTC` : `${formatQuote(mintAmt)} tUSDC`
    addToast({
      type: 'success',
      title: 'Faucet Mint Successful',
      message: `Minted ${formatted} into mock wallet.`,
      txHash: tx,
    })

    if (currentStep === 1) {
      setCurrentStep(2)
    }
  }, [addToast, currentStep])

  // Approve
  const approveToken = useCallback(async (token: 'tYBTC' | 'tUSDC', amount?: bigint) => {
    const defaultAmt = token === 'tYBTC' ? 100_000_000_000_000_000_000n : 10_000_000_000_000n
    const appAmt = amount || defaultAmt

    setBalances(prev => ({
      ...prev,
      baseAllowance: token === 'tYBTC' ? prev.baseAllowance + appAmt : prev.baseAllowance,
      quoteAllowance: token === 'tUSDC' ? prev.quoteAllowance + appAmt : prev.quoteAllowance,
    }))

    addToast({
      type: 'success',
      title: `${token} Approved`,
      message: `OrderBook contract approved to transfer ${token}.`,
      txHash: randomTxHash(),
    })
  }, [addToast])

  // Deposit
  const depositToken = useCallback(async (token: 'tYBTC' | 'tUSDC', amount: bigint) => {
    if (amount <= 0n) throw new Error('Deposit amount must be positive')

    const isBase = token === 'tYBTC'
    const walletBalance = isBase ? balances.walletBase : balances.walletQuote
    if (walletBalance < amount) {
      throw new Error(`Insufficient ${token} wallet balance for deposit`)
    }

    const tx = randomTxHash()
    setBalances(prev => ({
      ...prev,
      walletBase: isBase ? prev.walletBase - amount : prev.walletBase,
      walletQuote: !isBase ? prev.walletQuote - amount : prev.walletQuote,
      baseFree: isBase ? prev.baseFree + amount : prev.baseFree,
      quoteFree: !isBase ? prev.quoteFree + amount : prev.quoteFree,
    }))

    const formatted = isBase ? `${formatBase(amount)} tYBTC` : `${formatQuote(amount)} tUSDC`
    addToast({
      type: 'success',
      title: 'Deposit Settled to Ledger',
      message: `Transferred ${formatted} to OrderBook internal free balance.`,
      txHash: tx,
    })

    if (currentStep === 2) {
      setCurrentStep(3)
    }
  }, [balances, addToast, currentStep])

  // Withdraw
  const withdrawToken = useCallback(async (token: 'tYBTC' | 'tUSDC', amount: bigint) => {
    if (amount <= 0n) throw new Error('Withdraw amount must be positive')

    const isBase = token === 'tYBTC'
    const freeBalance = isBase ? balances.baseFree : balances.quoteFree
    if (freeBalance < amount) {
      throw new Error(`Insufficient free ${token} balance to withdraw`)
    }

    const tx = randomTxHash()
    setBalances(prev => ({
      ...prev,
      baseFree: isBase ? prev.baseFree - amount : prev.baseFree,
      quoteFree: !isBase ? prev.quoteFree - amount : prev.quoteFree,
      walletBase: isBase ? prev.walletBase + amount : prev.walletBase,
      walletQuote: !isBase ? prev.walletQuote + amount : prev.walletQuote,
    }))

    const formatted = isBase ? `${formatBase(amount)} tYBTC` : `${formatQuote(amount)} tUSDC`
    addToast({
      type: 'info',
      title: 'Withdrawal Complete',
      message: `Withdrew ${formatted} back to mock wallet.`,
      txHash: tx,
    })
  }, [balances, addToast])

  // Place Limit Order with Atomic In-Memory Matching
  const placeOrder = useCallback(async (
    side: 'buy' | 'sell',
    price: bigint,
    amount: bigint,
    _maxFills = 20
  ): Promise<bigint> => {
    if (amount <= 0n) throw new Error('Amount must be positive')
    if (price <= 0n) throw new Error('Price must be positive')

    const orderId = nextOrderId
    setNextOrderId(prev => prev + 1n)
    const tx = randomTxHash()

    let remainingAmount = amount
    const takerFeeBps = 10n // 0.10%

    if (side === 'buy') {
      // BUY ORDER
      const notional = calculateQuoteAmount(amount, price)
      const maxFee = calculateFee(notional, takerFeeBps)
      const totalNeeded = notional + maxFee

      if (balances.quoteFree < totalNeeded) {
        throw new Error(`Insufficient free quote balance. Need $${formatPrice(totalNeeded)}, have $${formatPrice(balances.quoteFree)}`)
      }

      // Check if crosses any asks
      const updatedAsks = [...asks]
      const newTrades: DemoTrade[] = []
      let filledBase = 0n
      let spentQuote = 0n
      let totalFee = 0n

      while (updatedAsks.length > 0 && remainingAmount > 0n && price >= updatedAsks[0].price) {
        const bestAskLevel = updatedAsks[0]
        const fillAmount = remainingAmount < bestAskLevel.total ? remainingAmount : bestAskLevel.total
        const makerPrice = bestAskLevel.price
        const tradeQuote = calculateQuoteAmount(fillAmount, makerPrice)
        const fee = calculateFee(tradeQuote, takerFeeBps)

        filledBase += fillAmount
        spentQuote += tradeQuote
        totalFee += fee
        remainingAmount -= fillAmount

        // Record trade
        newTrades.push({
          makerOrderId: 200n + BigInt(newTrades.length),
          takerOrderId: orderId,
          maker: DEMO_ACCOUNTS[1].address, // Bob
          taker: currentAccount.address,
          price: makerPrice,
          amount: fillAmount,
          fee,
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          txHash: tx,
        })

        if (bestAskLevel.total > fillAmount) {
          bestAskLevel.total -= fillAmount
        } else {
          updatedAsks.shift()
        }
      }

      // Update state if trades executed
      if (newTrades.length > 0) {
        setAsks(updatedAsks)
        setTrades(prev => [...newTrades, ...prev])

        const notionalAtLimit = calculateQuoteAmount(filledBase, price)
        const refund = (notionalAtLimit + calculateFee(notionalAtLimit, takerFeeBps)) - (spentQuote + totalFee)

        setBalances(prev => ({
          ...prev,
          quoteFree: prev.quoteFree - (spentQuote + totalFee),
          baseFree: prev.baseFree + filledBase,
        }))

        addToast({
          type: 'trade',
          title: '⚡ Trade Executed Atomically!',
          message: `Filled ${formatBase(filledBase)} tYBTC against book. Price improvement refund: $${formatPrice(refund)}. Taker fee: $${formatPrice(totalFee)}.`,
          txHash: tx,
        })

        if (currentStep === 4) {
          setCurrentStep(5)
        }
      }

      // If leftover remains, it rests in the book as a bid
      if (remainingAmount > 0n) {
        const remainingNotional = calculateQuoteAmount(remainingAmount, price)
        const remainingFee = calculateFee(remainingNotional, takerFeeBps)
        const lockAmount = remainingNotional + remainingFee

        setBalances(prev => ({
          ...prev,
          quoteFree: prev.quoteFree - lockAmount,
          quoteLocked: prev.quoteLocked + lockAmount,
        }))

        // Insert into bids (sorted descending by price)
        const newBids = [...bids]
        const existingIdx = newBids.findIndex(b => b.price === price)
        if (existingIdx >= 0) {
          newBids[existingIdx].total += remainingAmount
        } else {
          newBids.push({ price, total: remainingAmount })
          newBids.sort((a, b) => (b.price > a.price ? 1 : -1))
        }
        setBids(newBids)

        // Add to user orders
        setMyOrders(prev => [
          {
            id: orderId,
            owner: currentAccount.address,
            side: 0,
            price,
            amount,
            filled: amount - remainingAmount,
            timestamp: Date.now(),
          },
          ...prev,
        ])

        addToast({
          type: 'success',
          title: `Limit Buy Order #${orderId} Resting`,
          message: `Resting ${formatBase(remainingAmount)} tYBTC bid @ $${formatPrice(price)}. Locked $${formatPrice(lockAmount)}.`,
          txHash: tx,
        })

        if (currentStep === 3) {
          setCurrentStep(4)
        }
      }
    } else {
      // SELL ORDER
      if (balances.baseFree < amount) {
        throw new Error(`Insufficient free base balance. Need ${formatBase(amount)} tYBTC, have ${formatBase(balances.baseFree)}`)
      }

      const updatedBids = [...bids]
      const newTrades: DemoTrade[] = []
      let filledBase = 0n
      let receivedQuote = 0n
      let totalFee = 0n

      while (updatedBids.length > 0 && remainingAmount > 0n && price <= updatedBids[0].price) {
        const bestBidLevel = updatedBids[0]
        const fillAmount = remainingAmount < bestBidLevel.total ? remainingAmount : bestBidLevel.total
        const makerPrice = bestBidLevel.price
        const tradeQuote = calculateQuoteAmount(fillAmount, makerPrice)
        const fee = calculateFee(tradeQuote, takerFeeBps)

        filledBase += fillAmount
        receivedQuote += tradeQuote
        totalFee += fee
        remainingAmount -= fillAmount

        newTrades.push({
          makerOrderId: 300n + BigInt(newTrades.length),
          takerOrderId: orderId,
          maker: DEMO_ACCOUNTS[1].address,
          taker: currentAccount.address,
          price: makerPrice,
          amount: fillAmount,
          fee,
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          txHash: tx,
        })

        if (bestBidLevel.total > fillAmount) {
          bestBidLevel.total -= fillAmount
        } else {
          updatedBids.shift()
        }
      }

      if (newTrades.length > 0) {
        setBids(updatedBids)
        setTrades(prev => [...newTrades, ...prev])

        setBalances(prev => ({
          ...prev,
          baseFree: prev.baseFree - filledBase,
          quoteFree: prev.quoteFree + (receivedQuote - totalFee),
        }))

        addToast({
          type: 'trade',
          title: '⚡ Sell Trade Executed!',
          message: `Sold ${formatBase(filledBase)} tYBTC. Received $${formatPrice(receivedQuote - totalFee)} USDC (net of fee).`,
          txHash: tx,
        })

        if (currentStep === 4) {
          setCurrentStep(5)
        }
      }

      if (remainingAmount > 0n) {
        setBalances(prev => ({
          ...prev,
          baseFree: prev.baseFree - remainingAmount,
          baseLocked: prev.baseLocked + remainingAmount,
        }))

        const newAsks = [...asks]
        const existingIdx = newAsks.findIndex(a => a.price === price)
        if (existingIdx >= 0) {
          newAsks[existingIdx].total += remainingAmount
        } else {
          newAsks.push({ price, total: remainingAmount })
          newAsks.sort((a, b) => (a.price > b.price ? 1 : -1))
        }
        setAsks(newAsks)

        setMyOrders(prev => [
          {
            id: orderId,
            owner: currentAccount.address,
            side: 1,
            price,
            amount,
            filled: amount - remainingAmount,
            timestamp: Date.now(),
          },
          ...prev,
        ])

        addToast({
          type: 'success',
          title: `Limit Sell Order #${orderId} Resting`,
          message: `Resting ${formatBase(remainingAmount)} tYBTC ask @ $${formatPrice(price)}. Locked ${formatBase(remainingAmount)} tYBTC.`,
          txHash: tx,
        })

        if (currentStep === 3) {
          setCurrentStep(4)
        }
      }
    }

    return orderId
  }, [nextOrderId, balances, asks, bids, currentAccount, addToast, currentStep])

  // Cancel Order
  const cancelOrder = useCallback(async (orderId: bigint) => {
    const order = myOrders.find(o => o.id === orderId)
    if (!order) return

    const remaining = order.amount - order.filled
    const tx = randomTxHash()

    // Unlock balance
    if (order.side === 0) {
      // Buy order: unlock quote
      const remainingNotional = calculateQuoteAmount(remaining, order.price)
      const remainingFee = calculateFee(remainingNotional, 10n)
      const unlockQuote = remainingNotional + remainingFee

      setBalances(prev => ({
        ...prev,
        quoteLocked: prev.quoteLocked > unlockQuote ? prev.quoteLocked - unlockQuote : 0n,
        quoteFree: prev.quoteFree + unlockQuote,
      }))

      setBids(prev => {
        return prev
          .map(b => (b.price === order.price ? { ...b, total: b.total > remaining ? b.total - remaining : 0n } : b))
          .filter(b => b.total > 0n)
      })
    } else {
      setBalances(prev => ({
        ...prev,
        baseLocked: prev.baseLocked > remaining ? prev.baseLocked - remaining : 0n,
        baseFree: prev.baseFree + remaining,
      }))

      setAsks(prev => {
        return prev
          .map(a => (a.price === order.price ? { ...a, total: a.total > remaining ? a.total - remaining : 0n } : a))
          .filter(a => a.total > 0n)
      })
    }

    setMyOrders(prev => prev.filter(o => o.id !== orderId))

    addToast({
      type: 'info',
      title: `Order #${orderId} Cancelled`,
      message: `Unlinked from book and returned ${order.side === 0 ? 'USDC' : 'tYBTC'} back to free balance.`,
      txHash: tx,
    })
  }, [myOrders, addToast])

  // Run Step Helper
  const runStepAction = useCallback(async (step: number) => {
    if (step === 1) {
      await faucetMint('tYBTC', 1_000_000_000_000_000_000n)
      await faucetMint('tUSDC', 50_000_000_000n)
    } else if (step === 2) {
      await depositToken('tYBTC', 1_000_000_000_000_000_000n)
      await depositToken('tUSDC', 25_000_000_000n)
    } else if (step === 3) {
      setPrefillOrder({
        side: 'buy',
        price: '97500',
        amount: '0.5',
      })
      addToast({
        type: 'info',
        title: 'Step 3: Resting Limit Order Pre-Filled',
        message: 'Order form loaded with Buy 0.5 tYBTC @ $97,500 (below market). Click "Place Buy Order" to rest it on the book!',
      })
    } else if (step === 4) {
      const askPrice = asks.length > 0 ? (Number(asks[0].price) / 1e6).toString() : '101000'
      setPrefillOrder({
        side: 'buy',
        price: askPrice,
        amount: '0.25',
      })
      addToast({
        type: 'info',
        title: 'Step 4: Market Crossing Order Pre-Filled',
        message: `Order form set to Buy 0.25 tYBTC @ $${askPrice}. Click "Place Buy Order" to match against maker and execute atomically!`,
      })
    } else if (step === 5) {
      if (myOrders.length > 0) {
        await cancelOrder(myOrders[0].id)
      } else {
        await withdrawToken('tYBTC', 500_000_000_000_000_000n)
      }
    }
  }, [faucetMint, depositToken, asks, myOrders, cancelOrder, withdrawToken, addToast])

  const resetDemo = useCallback(() => {
    setBalances(INITIAL_BALANCES)
    setBids(INITIAL_BIDS)
    setAsks(INITIAL_ASKS)
    setMyOrders([])
    setTrades(INITIAL_TRADES)
    setCurrentStep(1)
    setPrefillOrder(null)
    addToast({
      type: 'info',
      title: 'Demo State Reset',
      message: 'Initial demo balances and order book restored.',
    })
  }, [addToast])

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        setDemoMode: setIsDemoMode,
        currentAccount,
        switchAccount,
        currentStep,
        setCurrentStep,
        balances,
        bids,
        asks,
        spread,
        myOrders,
        trades,
        toasts,
        addToast,
        removeToast,
        prefillOrder,
        setPrefillOrder,
        faucetMint,
        depositToken,
        withdrawToken,
        approveToken,
        placeOrder,
        cancelOrder,
        runStepAction,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider')
  }
  return context
}
