import { useMemo, useState } from 'react'
import { useBook } from '../hooks/useBook'
import { formatBase, formatQuote, formatPrice } from '../lib/format'
import './OrderBookView.css'

interface OrderBookViewProps {
  onPriceClick?: (price: bigint, side: 0 | 1) => void
}

export function OrderBookView({ onPriceClick }: OrderBookViewProps) {
  const { bids, asks, spread, loading, error, refetch } = useBook(31337)
  const [maxVolume, setMaxVolume] = useState<bigint>(0n)

  // Calculate max volume for depth bars (must be before early returns)
  useMemo(() => {
    const maxBid = bids.reduce((max, bid) => bid.total > max ? bid.total : max, 0n)
    const maxAsk = asks.reduce((max, ask) => ask.total > max ? ask.total : max, 0n)
    setMaxVolume(maxBid > maxAsk ? maxBid : maxAsk)
  }, [bids, asks])

  // Calculate cumulative volumes for depth chart (must be before early returns)
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
    return Number(total) / Number(maxVol) * 100
  }

  if (loading) {
    return (
      <div className="order-book-view loading">
        <div className="skeleton asks" />
        <div className="spread skeleton" />
        <div className="skeleton bids" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="order-book-view error">
        <p>Error loading order book: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    )
  }

  return (
    <div className="order-book-view">
      <div className="book-header">
        <div className="column-header ask">ASKS</div>
        <div className="column-header spread">SPREAD</div>
        <div className="column-header bid">BIDS</div>
      </div>

      <div className="asks">
        {asksWithCumulative.slice().reverse().map((ask, index) => (
          <div 
            key={index}
            className="level ask"
            onClick={() => onPriceClick?.(ask.price, 1)}
            style={{ '--volume-ratio': getVolumeRatio(ask.total, maxVolume) } as React.CSSProperties }
          >
            <span className="price">{formatPrice(ask.price)}</span>
            <span className="volume">{formatQuote(ask.total)}</span>
            <div className="depth-bar">
              <div className="bar ask-bar" style={{ width: `${getVolumeRatio(ask.total, maxVolume)}%` }} />
            </div>
            <span className="cumulative">{formatQuote(ask.cumulative)}</span>
          </div>
        ))}
      </div>

      <div className="spread-row">
        <div className="spread-info">
          <span className="best-ask">
            {spread.bestAsk ? formatPrice(spread.bestAsk) : '—'}
          </span>
          <span className="spread-value">
            {spread.bestBid && spread.bestAsk 
              ? formatPrice((spread.bestAsk - spread.bestBid) * 10000n / spread.bestBid) + ' bps'
              : '—'}
          </span>
          <span className="best-bid">
            {spread.bestBid ? formatPrice(spread.bestBid) : '—'}
          </span>
        </div>
      </div>

      <div className="bids">
        {bidsWithCumulative.map((bid, index) => (
          <div 
            key={index}
            className="level bid"
            onClick={() => onPriceClick?.(bid.price, 0)}
            style={{ '--volume-ratio': getVolumeRatio(bid.total, maxVolume) } as React.CSSProperties }
          >
            <span className="cumulative">{formatBase(bid.cumulative)}</span>
            <div className="depth-bar">
              <div className="bar bid-bar" style={{ width: `${getVolumeRatio(bid.total, maxVolume)}%` }} />
            </div>
            <span className="volume">{formatBase(bid.total)}</span>
            <span className="price">{formatPrice(bid.price)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}