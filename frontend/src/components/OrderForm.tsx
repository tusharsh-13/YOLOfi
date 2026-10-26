import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useBalances } from '../hooks/useBalances'
import { useDemo } from '../context/DemoContext'
import { placeLimitOrder, getTakerFeeBps } from '../lib/contracts'
import { parsePrice, parseBase, calculateQuoteAmount, calculateFee, formatPrice, formatBase } from '../lib/format'
import './OrderForm.css'

export function OrderForm() {
  const { isDemoMode, balances: demoBalances, placeOrder: demoPlaceOrder, prefillOrder, setPrefillOrder } = useDemo()
  const { account, chainId } = useWallet()
  const web3Balances = useBalances(chainId || 31337, account as `0x${string}` | null)

  const balances = isDemoMode ? demoBalances : web3Balances
  const baseFree = balances.baseFree
  const quoteFree = balances.quoteFree

  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [maxFills, setMaxFills] = useState(20)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [feeBps, setFeeBps] = useState<bigint>(10n)

  // Listen to prefillOrder from DemoTour or OrderBookView
  useEffect(() => {
    if (prefillOrder) {
      if (prefillOrder.side) setSide(prefillOrder.side)
      if (prefillOrder.price) setPrice(prefillOrder.price)
      if (prefillOrder.amount) setAmount(prefillOrder.amount)
      setError(null)
      setSuccess(null)
      setPrefillOrder(null)
    }
  }, [prefillOrder, setPrefillOrder])

  // Fetch contract fee params if connected to web3
  useEffect(() => {
    if (isDemoMode || !chainId) return
    const fetchParams = async () => {
      try {
        const fee = await getTakerFeeBps(chainId)
        setFeeBps(fee)
      } catch {
        // default 10 bps
      }
    }
    fetchParams()
  }, [chainId, isDemoMode])

  // Estimates
  const priceBigInt = price ? parsePrice(price) : 0n
  const amountBigInt = amount ? parseBase(amount) : 0n
  const estimatedNotional = (priceBigInt > 0n && amountBigInt > 0n) ? calculateQuoteAmount(amountBigInt, priceBigInt) : 0n
  const estimatedFee = estimatedNotional > 0n ? calculateFee(estimatedNotional, feeBps) : 0n
  const totalQuoteNeeded = estimatedNotional + estimatedFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const priceVal = parseFloat(price)
    const amountVal = parseFloat(amount)

    if (!priceVal || !amountVal || priceVal <= 0 || amountVal <= 0) {
      setError('Price and amount must be positive numbers')
      return
    }

    if (amountBigInt < 100_000_000_000_000n) {
      setError('Minimum order amount is 0.0001 tYBTC')
      return
    }

    if (side === 'buy' && quoteFree < totalQuoteNeeded) {
      setError(`Insufficient free quote balance. Need $${formatPrice(totalQuoteNeeded)} USDC in internal ledger`)
      return
    }

    if (side === 'sell' && baseFree < amountBigInt) {
      setError(`Insufficient free base balance. Need ${formatBase(amountBigInt)} tYBTC in internal ledger`)
      return
    }

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      if (isDemoMode) {
        const orderId = await demoPlaceOrder(side, priceBigInt, amountBigInt, maxFills)
        setSuccess(`Order #${orderId} processed! (Matched or placed on book)`)
      } else {
        if (!account || !chainId) throw new Error('Connect wallet first')
        const orderId = await placeLimitOrder(
          chainId,
          side === 'buy' ? 0 : 1,
          priceBigInt,
          amountBigInt,
          BigInt(maxFills),
          0n
        )
        setSuccess(`Order placed! Order ID: ${orderId}`)
        web3Balances.refetch()
      }

      setPrice('')
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-form-header">
        <h3>Place Limit Order</h3>
        <span className="order-form-type-badge">GTC · CLOB</span>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Side</label>
        <div className="side-toggle">
          <button
            type="button"
            className={`btn-side btn-buy ${side === 'buy' ? 'active' : ''}`}
            onClick={() => setSide('buy')}
          >
            Buy tYBTC
          </button>
          <button
            type="button"
            className={`btn-side btn-sell ${side === 'sell' ? 'active' : ''}`}
            onClick={() => setSide('sell')}
          >
            Sell tYBTC
          </button>
        </div>
      </div>

      <div className="form-group">
        <div className="label-row">
          <label>Price (USDC per tYBTC)</label>
          <span className="helper-label">Tick: $0.01</span>
        </div>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="e.g., 99500 or 101000"
          step="0.01"
          min="0.01"
          disabled={submitting}
          required
        />
      </div>

      <div className="form-group">
        <div className="label-row">
          <label>Amount (tYBTC)</label>
          <span className="helper-label">Lot: 0.0001 BTC</span>
        </div>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="e.g., 0.25"
          step="0.0001"
          min="0.0001"
          disabled={submitting}
          required
        />
      </div>

      <div className="form-group">
        <label>Max Fills per Tx</label>
        <input
          type="number"
          value={maxFills}
          onChange={e => setMaxFills(parseInt(e.target.value) || 20)}
          min="1"
          max="20"
          disabled={submitting}
        />
      </div>

      <div className="estimation">
        <h4>Order Summary</h4>
        <div className="estimation-row">
          <span>Notional Value:</span>
          <span className="value">${formatPrice(estimatedNotional)} USDC</span>
        </div>
        <div className="estimation-row">
          <span>Taker Fee (0.10% if match):</span>
          <span className="value">${formatPrice(estimatedFee)} USDC</span>
        </div>
        <div className="estimation-row total">
          <span>{side === 'buy' ? 'Total Lock / Cost:' : 'Base Required:'}</span>
          <span className="value">
            {side === 'buy'
              ? `$${formatPrice(totalQuoteNeeded)} USDC`
              : `${formatBase(amountBigInt)} tYBTC`}
          </span>
        </div>
      </div>

      <div className="allowance-info">
        <span className="ledger-balance-hint">
          {side === 'buy'
            ? `Available Free Quote: $${formatPrice(quoteFree)} USDC`
            : `Available Free Base: ${formatBase(baseFree)} tYBTC`}
        </span>
      </div>

      <button
        type="submit"
        className={`submit-btn ${side === 'buy' ? 'submit-buy' : 'submit-sell'}`}
        disabled={submitting}
      >
        {submitting
          ? 'Processing Onchain...'
          : `Submit Limit ${side.toUpperCase()} Order`}
      </button>
    </form>
  )
}