import { useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useBook } from '../hooks/useBook'
import { useDemo } from '../context/DemoContext'
import { formatBase, formatPrice } from '../lib/format'
import './OrderBookView.css'

interface OrderBookViewProps {
  onPriceClick?: (price: bigint, side: 0 | 1) => void
}

export function OrderBookView({ onPriceClick }: OrderBookViewProps) {
  const { isDemoMode, bids: demoBids, asks: demoAsks, spread: demoSpread, setPrefillOrder } = useDemo()
  const { chainId } = useWallet()
  const { bids: web3Bids, asks: web3Asks, spread: web3Spread, loading, error, refetch } = useBook(chainId ?? 31337)

  const bids = isDemoMode ? demoBids : web3Bids
  const asks = isDemoMode ? demoAsks : web3Asks
  const spread = isDemoMode ? demoSpread : web3Spread

  const maxVolume = useMemo(() => {
    const maxBid = bids.reduce((max, bid) => (bid.total > max ? bid.total : max), 0n)
    const maxAsk = asks.reduce((max, ask) => (ask.total > max ? ask.total : max), 0n)
    return maxBid > maxAsk ? maxBid : maxAsk
  }, [bids, asks])

  const bidsWithCumulative = useMemo(() => {
    let cumulative = 0n
    return bids.map(bid => {
      cumulative += bid.total
      return { ...bid, cumulative }
    })
  }, [bids])

  const asksWithCumulative = useMemo(() => {
    let cumulative = 0n
    return asks.map(ask => {
      cumulative += ask.total
      return { ...ask, cumulative }
    })
  }, [asks])

  const getVolumeRatio = (total: bigint, maxVol: bigint) => {
    if (maxVol === 0n) return 0
    return Math.min(100, Math.max(5, (Number(total) / Number(maxVol)) * 100))
  }

  const handleLevelClick = (price: bigint, side: 0 | 1) => {
    if (onPriceClick) {
      onPriceClick(price, side)
    }
    const priceStr = (Number(price) / 1e6).toString()
    setPrefillOrder({
      side: side === 0 ? 'sell' : 'buy', // Clicking ask prepares a buy, clicking bid prepares a sell
      price: priceStr,
    })
  }

  if (!isDemoMode && loading) {
    return (
      <div className="order-book-view loading">
        <div className="skeleton asks" />
        <div className="spread skeleton" />
        <div className="skeleton bids" />
      </div>
    )
  }

  if (!isDemoMode && error) {
    return (
      <div className="order-book-view error">
        <p>Error loading order book: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    )
  }

  const spreadDiff = spread.bestAsk && spread.bestBid && spread.bestAsk > spread.bestBid
    ? spread.bestAsk - spread.bestBid
    : 0n

  const spreadBps = spread.bestBid > 0n
    ? Number((spreadDiff * 10000n) / spread.bestBid)
    : 0

  return (
    <div className="order-book-view">
      <div className="order-book-header-panel">
        <span className="book-title">Order Book (CLOB)</span>
        <span className="book-live-tag">
          {isDemoMode ? '⚡ Real-time Mock' : 'Onchain Events'}
        </span>
      </div>

      <div className="book-header">
        <div className="column-header ask">PRICE (USDC)</div>
        <div className="column-header size">SIZE (tYBTC)</div>
        <div className="column-header total">CUMULATIVE</div>
      </div>

      {/* ASKS (Sells) – displayed top to bottom ascending */}
      <div className="asks">
        {asks.length === 0 ? (
          <div className="empty-book-side">No asks resting</div>
        ) : (
          asksWithCumulative
            .slice()
            .reverse()
            .map((ask, index) => {
              const ratio = getVolumeRatio(ask.total, maxVolume)
              return (
                <div
                  key={`${ask.price.toString()}-${index}`}
                  className="level ask"
                  onClick={() => handleLevelClick(ask.price, 1)}
                  title="Click to load price into Buy Order"
                >
                  <span className="price">${formatPrice(ask.price)}</span>
                  <span className="volume">{formatBase(ask.total)}</span>
                  <div className="depth-bar">
                    <div className="bar ask-bar" style={{ width: `${ratio}%` }} />
                  </div>
                  <span className="cumulative">{formatBase(ask.cumulative)}</span>
                </div>
              )
            })
        )}
      </div>

      {/* SPREAD INDICATOR */}
      <div className="spread-row">
        <div className="spread-info">
          <span className="spread-label">Spread:</span>
          <span className="spread-val-usdc">
            {spreadDiff > 0n ? `$${formatPrice(spreadDiff)} USDC` : '—'}
          </span>
          <span className="spread-val-bps">
            {spreadBps > 0 ? `(${spreadBps} bps)` : ''}
          </span>
        </div>
      </div>

      {/* BIDS (Buys) – displayed top to bottom descending */}
      <div className="bids">
        {bids.length === 0 ? (
          <div className="empty-book-side">No bids resting</div>
        ) : (
          bidsWithCumulative.map((bid, index) => {
            const ratio = getVolumeRatio(bid.total, maxVolume)
            return (
              <div
                key={`${bid.price.toString()}-${index}`}
                className="level bid"
                onClick={() => handleLevelClick(bid.price, 0)}
                title="Click to load price into Sell Order"
              >
                <span className="price">${formatPrice(bid.price)}</span>
                <span className="volume">{formatBase(bid.total)}</span>
                <div className="depth-bar">
                  <div className="bar bid-bar" style={{ width: `${ratio}%` }} />
                </div>
                <span className="cumulative">{formatBase(bid.cumulative)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}