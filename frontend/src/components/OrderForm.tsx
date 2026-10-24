import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useBalances } from '../hooks/useBalances'
import { placeLimitOrder, getTakerFeeBps } from '../lib/contracts'
import { calculateQuoteAmount, calculateFee, validateTickPrice, validateLotAmount, validateMinOrderSize } from '../lib/format'
import './OrderForm.css'

export function OrderForm() {
  const { account, chainId } = useWallet()
  const { baseAllowance, quoteAllowance, refetch } = useBalances(chainId || 31337, account as `0x${string}` | null)
  
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [maxFills, setMaxFills] = useState(20)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [feeBps, setFeeBps] = useState<bigint>(0n)

  // Fetch contract params
  useEffect(() => {
    if (!chainId) return
    const fetchParams = async () => {
      const [fee] = await Promise.all([
        getTakerFeeBps(chainId),
      ])
      setFeeBps(fee)
    }
    fetchParams()
  }, [chainId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !chainId) return
    
    const priceVal = parseFloat(price)
    const amountVal = parseFloat(amount)
    
    if (!priceVal || !amountVal || priceVal <= 0 || amountVal <= 0) {
      setError('Price and amount must be positive numbers')
      return
    }

    // Parse to contract units
    const priceBigInt = BigInt(Math.round(priceVal * 1e18)) // price is quote units per 1e18 base
    const amountBigInt = side === 'buy' 
      ? BigInt(Math.round(amountVal * 1e6)) // quote amount in 6 decimals
      : BigInt(Math.round(amountVal * 1e18)) // base amount in 18 decimals

    // Validation
    if (!validateTickPrice(priceBigInt)) {
      setError('Price must be multiple of tick size')
      return
    }
    if (!validateLotAmount(amountBigInt)) {
      setError('Amount must be multiple of lot size')
      return
    }
    if (!validateMinOrderSize(amountBigInt)) {
      setError('Amount must be at least minimum order size')
      return
    }

    // Check allowance for buys (quote token)
    if (side === 'buy') {
      const quoteAmount = calculateQuoteAmount(amountBigInt, priceBigInt)
      const fee = calculateFee(quoteAmount, feeBps)
      const totalNeeded = quoteAmount + fee
      if (quoteAllowance < totalNeeded) {
        setError(`Insufficient USDC allowance. Need ${totalNeeded}, have ${quoteAllowance}`)
        return
      }
    } else {
      if (baseAllowance < amountBigInt) {
        setError(`Insufficient tYBTC allowance. Need ${amountBigInt}, have ${baseAllowance}`)
        return
      }
    }

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const orderId = await placeLimitOrder(chainId, side === 'buy' ? 0 : 1, priceBigInt, amountBigInt, BigInt(maxFills), 0n)
      setSuccess(`Order placed! Order ID: ${orderId}`)
      setPrice('')
      setAmount('')
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Estimated cost/fee calculation
  let estimatedQuote = 0n
  let estimatedFee = 0n
  let estimatedTotal = 0n
  
  if (price && amount) {
    const priceVal = parseFloat(price)
    const amountVal = parseFloat(amount)
    if (priceVal > 0 && amountVal > 0) {
      const priceBigInt = BigInt(Math.round(priceVal * 1e18))
      const amountBigInt = side === 'buy' 
        ? BigInt(Math.round(amountVal * 1e6))
        : BigInt(Math.round(amountVal * 1e18))
      
      estimatedQuote = calculateQuoteAmount(amountBigInt, priceBigInt)
      estimatedFee = calculateFee(estimatedQuote, feeBps)
      estimatedTotal = estimatedQuote + estimatedFee
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h3>Place Limit Order</h3>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Side</label>
        <div className="side-toggle">
          <button
            type="button"
            className={side === 'buy' ? 'active' : ''}
            onClick={() => setSide('buy')}
          >
            Buy
          </button>
          <button
            type="button"
            className={side === 'sell' ? 'active' : ''}
            onClick={() => setSide('sell')}
          >
            Sell
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Price (USDC per tYBTC)</label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="e.g., 65000"
          step="0.01"
          min="0.01"
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label>{side === 'buy' ? 'Amount (USDC)' : 'Amount (tYBTC)'}</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={side === 'buy' ? 'e.g., 1000' : 'e.g., 0.01'}
          step={side === 'buy' ? '0.01' : '0.0001'}
          min="0"
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label>Max Fills</label>
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
        <h4>Estimation</h4>
        <div className="estimation-row">
          <span>Estimated {side === 'buy' ? 'tYBTC' : 'USDC'} received:</span>
          <span className="value">{side === 'buy' ? estimatedQuote - estimatedFee : estimatedQuote - estimatedFee}</span>
        </div>
        <div className="estimation-row">
          <span>Estimated fee ({Number(feeBps) / 100}%):</span>
          <span className="value">{estimatedFee}</span>
        </div>
        <div className="estimation-row total">
          <span>Total {side === 'buy' ? 'USDC' : 'tYBTC'} needed:</span>
          <span className="value">{side === 'buy' ? estimatedTotal : estimatedTotal}</span>
        </div>
      </div>

      <div className="allowance-info">
        {side === 'buy' ? (
          <>
            <span>USDC allowance:</span>
            <span className={quoteAllowance >= estimatedTotal ? 'sufficient' : 'insufficient'}>
              {quoteAllowance} / {estimatedTotal}
            </span>
          </>
        ) : (
          <>
            <span>tYBTC allowance:</span>
            <span className={baseAllowance >= BigInt(Math.round(parseFloat(amount) * 1e18)) ? 'sufficient' : 'insufficient'}>
              {baseAllowance} / {BigInt(Math.round(parseFloat(amount) * 1e18))}
            </span>
          </>
        )}
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'Placing Order...' : `Place ${side.charAt(0).toUpperCase() + side.slice(1)} Order`}
      </button>
    </form>
  )
}