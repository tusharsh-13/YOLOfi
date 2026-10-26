import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useDemo } from '../context/DemoContext'
import { cancelOrder, getOrder, getUserOrders } from '../lib/contracts'
import { formatBase, formatPrice } from '../lib/format'
import './MyOrders.css'

interface MyOrdersProps {
  chainId?: number
}

interface Web3Order {
  id: bigint
  owner: `0x${string}`
  side: number
  price: bigint
  amount: bigint
  filled: bigint
  prev: bigint
  next: bigint
  userPrev: bigint
  userNext: bigint
}

export function MyOrders({ chainId = 31337 }: MyOrdersProps) {
  const { isDemoMode, myOrders: demoOrders, cancelOrder: demoCancelOrder } = useDemo()
  const { account } = useWallet()
  const [web3OrderIds, setWeb3OrderIds] = useState<bigint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    if (isDemoMode || !account || !chainId) return
    setLoading(true)
    try {
      const userOrders = await getUserOrders(chainId, account as unknown as `0x${string}`)
      setWeb3OrderIds([...userOrders])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [account, chainId, isDemoMode])

  const handleCancel = async (orderId: bigint) => {
    try {
      if (isDemoMode) {
        await demoCancelOrder(orderId)
      } else {
        await cancelOrder(chainId, orderId)
        setWeb3OrderIds(prev => prev.filter(id => id !== orderId))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancel failed')
    }
  }

  if (isDemoMode) {
    return (
      <div className="my-orders">
        <div className="my-orders-header">
          <div className="my-orders-title-group">
            <h3>My Open Orders</h3>
            <span className="orders-count-badge">{demoOrders.length}</span>
          </div>
          <span className="mode-badge">⚡ Instant Settle</span>
        </div>

        {demoOrders.length === 0 ? (
          <div className="my-orders-empty">
            <p>No open resting orders</p>
            <span className="empty-subtext">Submit a limit order that does not cross the spread to see it rest here.</span>
          </div>
        ) : (
          <div className="orders-list">
            {demoOrders.map(order => {
              const remaining = order.amount - order.filled
              const isBuy = order.side === 0
              return (
                <div key={order.id.toString()} className={`order-row ${isBuy ? 'order-buy' : 'order-sell'}`}>
                  <div className="order-main-info">
                    <div className="order-side-tag">
                      <span className={`side-badge ${isBuy ? 'buy' : 'sell'}`}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                      <span className="order-id">#{order.id.toString()}</span>
                    </div>

                    <div className="order-details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Price:</span>
                        <span className="detail-val price">${formatPrice(order.price)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Remaining:</span>
                        <span className="detail-val">{formatBase(remaining)} tYBTC</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className="detail-val status-open">Resting in Book</span>
                      </div>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => handleCancel(order.id)}
                      title="Cancel order and unlock funds"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="my-orders">
      <div className="my-orders-header">
        <h3>My Orders</h3>
        <button className="refresh-btn" onClick={fetchOrders} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="orders-list loading">
          <div className="order-row skeleton" />
          <div className="order-row skeleton" />
        </div>
      ) : web3OrderIds.length === 0 ? (
        <div className="my-orders-empty">
          <p>No open orders</p>
        </div>
      ) : (
        <div className="orders-list">
          {web3OrderIds.map(orderId => (
            <Web3OrderRow
              key={orderId.toString()}
              orderId={orderId}
              chainId={chainId}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Web3OrderRow({
  orderId,
  chainId,
  onCancel,
}: {
  orderId: bigint
  chainId: number
  onCancel: (orderId: bigint) => void
}) {
  const [order, setOrder] = useState<Web3Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true)
      try {
        const orderData = await getOrder(chainId, orderId)
        setOrder(orderData)
      } catch (err) {
        console.error('Failed to fetch order:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [chainId, orderId])

  if (loading) return <div className="order-row skeleton" />
  if (!order) return null

  const isBuy = order.side === 0
  const remaining = order.amount - order.filled

  return (
    <div className={`order-row ${isBuy ? 'order-buy' : 'order-sell'}`}>
      <div className="order-main-info">
        <div className="order-side-tag">
          <span className={`side-badge ${isBuy ? 'buy' : 'sell'}`}>
            {isBuy ? 'BUY' : 'SELL'}
          </span>
          <span className="order-id">#{order.id.toString()}</span>
        </div>
        <div className="order-details-grid">
          <div className="detail-item">
            <span className="detail-label">Price:</span>
            <span className="detail-val price">${formatPrice(order.price)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Remaining:</span>
            <span className="detail-val">{formatBase(remaining)} tYBTC</span>
          </div>
        </div>
      </div>
      <div className="order-actions">
        <button className="cancel-btn" onClick={() => onCancel(order.id)}>
          Cancel
        </button>
      </div>
    </div>
  )
}