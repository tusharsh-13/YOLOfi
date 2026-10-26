import { useState } from 'react'
import { useTrades } from '../hooks/useTrades'
import { useDemo } from '../context/DemoContext'
import { formatTimestampShort, formatPrice, formatBase, formatAddress } from '../lib/format'
import './TradeFeed.css'

interface TradeFeedProps {
  user?: `0x${string}` | null
  chainId?: number
}

export function TradeFeed({ user, chainId = 31337 }: TradeFeedProps) {
  const { isDemoMode, trades: demoTrades, currentAccount } = useDemo()
  const { trades: web3Trades, loading, error, refetch } = useTrades(chainId, user as `0x${string}` | undefined)
  const [filter, setFilter] = useState<'all' | 'mine'>('all')

  const rawTrades = isDemoMode ? demoTrades : web3Trades
  const activeUser = isDemoMode ? currentAccount.address : user

  const filteredTrades = rawTrades.filter(trade => {
    if (filter === 'mine' && activeUser) {
      return (
        trade.maker.toLowerCase() === activeUser.toLowerCase() ||
        trade.taker.toLowerCase() === activeUser.toLowerCase()
      )
    }
    return true
  })

  if (!isDemoMode && loading) {
    return (
      <div className="trade-feed loading">
        <div className="trade-row skeleton" />
        <div className="trade-row skeleton" />
        <div className="trade-row skeleton" />
      </div>
    )
  }

  if (!isDemoMode && error) {
    return (
      <div className="trade-feed error">
        <p>Error loading trades: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    )
  }

  return (
    <div className="trade-feed">
      <div className="trade-feed-header">
        <div className="trade-title-group">
          <h3>Live Trade Feed</h3>
          <span className="trade-counter-badge">{filteredTrades.length}</span>
        </div>
        <div className="filters">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'mine' ? 'active' : ''}
            onClick={() => setFilter('mine')}
          >
            My Trades
          </button>
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <div className="trade-feed empty">
          <p>No trades executed yet</p>
          <span className="empty-subtext">Cross the spread to see atomic onchain matching in real-time.</span>
        </div>
      ) : (
        <div className="trades-table-container">
          <div className="trades-header-row">
            <span>PRICE</span>
            <span>AMOUNT</span>
            <span>FEE</span>
            <span>MAKER / TAKER</span>
            <span>TIME</span>
          </div>

          <div className="trades-list">
            {filteredTrades.map((trade, index) => {
              const isMine =
                activeUser &&
                (trade.maker.toLowerCase() === activeUser.toLowerCase() ||
                  trade.taker.toLowerCase() === activeUser.toLowerCase())

              return (
                <div
                  key={`${trade.txHash}-${index}`}
                  className={`trade-row ${isMine ? 'trade-mine' : ''}`}
                >
                  <span className="trade-price">${formatPrice(trade.price)}</span>
                  <span className="trade-amount">{formatBase(trade.amount)} BTC</span>
                  <span className="trade-fee">${formatPrice(trade.fee)}</span>
                  <span className="trade-parties" title={`Maker: ${trade.maker} | Taker: ${trade.taker}`}>
                    {formatAddress(trade.maker)} → {formatAddress(trade.taker)}
                  </span>
                  <span className="trade-time">
                    {formatTimestampShort(trade.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}