import { useState } from 'react'
import { useTrades } from '../hooks/useTrades'
import { formatTimestampShort } from '../lib/format'
import './TradeFeed.css'

interface TradeFeedProps {
  user?: `0x${string}` | null
  chainId?: number
}

export function TradeFeed({ user, chainId = 31337 }: TradeFeedProps) {
  const { trades, loading, error, refetch } = useTrades(chainId, user as `0x${string}` | undefined)
  const [filter, setFilter] = useState<'all' | 'mine' | 'buy' | 'sell'>('all')

  const filteredTrades = trades.filter(trade => {
    if (filter === 'mine' && user) {
      return trade.maker.toLowerCase() === user.toLowerCase() || trade.taker.toLowerCase() === user.toLowerCase()
    }
    if (filter === 'buy') return trade.taker === user
    if (filter === 'sell') return trade.maker === user
    return true
  })

  if (loading) {
    return (
      <div className="trade-feed loading">
        <div className="trade-row skeleton" />
        <div className="trade-row skeleton" />
        <div className="trade-row skeleton" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="trade-feed error">
        <p>Error loading trades: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    )
  }

  if (filteredTrades.length === 0) {
    return (
      <div className="trade-feed empty">
        <p>No trades found</p>
      </div>
    )
  }

  return (
    <div className="trade-feed">
      <div className="trade-feed-header">
        <h3>Trade Feed</h3>
        <div className="filters">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >All</button>
          {user && (
            <button 
              className={filter === 'mine' ? 'active' : ''}
              onClick={() => setFilter('mine')}
            >Mine</button>
          )}
          <button 
            className={filter === 'buy' ? 'active' : ''}
            onClick={() => setFilter('buy')}
          >Buys</button>
          <button 
            className={filter === 'sell' ? 'active' : ''}
            onClick={() => setFilter('sell')}
          >Sells</button>
        </div>
      </div>

      <div className="trades-list">
        {filteredTrades.map((trade, index) => (
          <div key={index} className="trade-row">
            <div className="trade-time">
              {formatTimestampShort(trade.timestamp)}
            </div>
            <div className="trade-side">
              <span className={`side-badge ${trade.taker === user ? 'taker' : trade.maker === user ? 'maker' : ''}`}>
                {trade.taker === user ? 'BUY' : trade.maker === user ? 'SELL' : 
                 trade.maker.toLowerCase() === user?.toLowerCase() ? 'SELL' : 'BUY'}
              </span>
            </div>
            <div className="trade-price">
              {trade.price.toString()}
            </div>
            <div className="trade-amount">
              {trade.taker === user || trade.maker === user ? trade.amount.toString() : trade.amount.toString()}
            </div>
            <div className="trade-fee">
              {trade.fee.toString()}
            </div>
            <div className="trade-hash">
              <a 
                href={`https://sepolia.basescan.org/tx/${trade.txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="tx-link"
              >
                View
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}