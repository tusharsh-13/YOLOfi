import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { cancelOrder, getOrder, getUserOrders } from '../lib/contracts'
import { formatBase, formatPrice, formatAddress } from '../lib/format'
import './MyOrders.css'

interface MyOrdersProps {
  chainId?: number
}

interface Order {
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
  const { account } = useWallet()
  const [orders, setOrders] = useState<bigint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<bigint | null>(null)

  const fetchOrders = async () => {
    if (!account || !chainId) return
    setLoading(true)
    try {
      const userOrders = await getUserOrders(chainId, account as unknown as `0x${string}`)
      setOrders([...userOrders])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (orderId: bigint) => {
    if (!confirm('Cancel this order?')) return
    
    try {
      await cancelOrder(chainId, orderId)
      setOrders(prev => prev.filter(id => id !== orderId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancel failed')
    }
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
          <div className="order-row skeleton" />
        </div>
      ) : orders.length === 0 ? (
        <div className="my-orders-empty">
          <p>No open orders</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(orderId => (
            <OrderRow 
              key={orderId.toString()} 
              orderId={orderId}
              chainId={chainId}
              onCancel={handleCancel}
              onToggleExpand={() => setExpandedOrder(expandedOrder === orderId ? null : orderId)}
              isExpanded={expandedOrder === orderId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderRow({ orderId, chainId, onCancel, onToggleExpand, isExpanded }: { 
  orderId: bigint
  chainId: number
  onCancel: (orderId: bigint) => void
  onToggleExpand: () => void
  isExpanded: boolean
}) {
  const [order, setOrder] = useState<Order | null>(null)
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

  if (loading) {
    return <div className="order-row skeleton" />
  }

  if (!order) {
    return <div className="order-row error">Failed to load order</div>
  }

  const side = order.side === 0 ? 'BUY' : 'SELL'
  const remaining = order.amount - order.filled
  const progress = order.amount > 0n ? Number((order.filled * 10000n) / order.amount) / 100 : 0
  const progressStr = progress.toFixed(2)

  return (
    <div className={`order-row ${isExpanded ? 'expanded' : ''}`}>
      <div className="order-main" onClick={onToggleExpand}>
        <div className={`order-side ${side.toLowerCase()}`}>{side}</div>
        <div className="order-price">{formatPrice(order.price)}</div>
        <div className="order-amount">
          <span className="filled">{formatBase(order.filled)}</span>
          <span className="separator">/</span>
          <span className="total">{formatBase(order.amount)}</span>
        </div>
        <div className="order-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressStr}%` }} />
          </div>
          <span className="progress-text">{progressStr}%</span>
        </div>
        <div className="order-remaining">
          {formatBase(remaining)} remaining
        </div>
        <div className="order-actions">
          {remaining > 0n && (
            <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); onCancel(orderId); }}>
              Cancel
            </button>
          )}
          <button className="expand-btn" onClick={onToggleExpand}>
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && order && (
        <div className="order-expanded">
          <div className="expanded-row">
            <span>Order ID:</span>
            <span className="monospace">{orderId.toString()}</span>
          </div>
          <div className="expanded-row">
            <span>Side:</span>
            <span>{side}</span>
          </div>
          <div className="expanded-row">
            <span>Price:</span>
            <span className="monospace">{formatPrice(order.price)}</span>
          </div>
          <div className="expanded-row">
            <span>Total Amount:</span>
            <span className="monospace">{formatBase(order.amount)}</span>
          </div>
          <div className="expanded-row">
            <span>Filled:</span>
            <span className="monospace">{formatBase(order.filled)}</span>
          </div>
          <div className="expanded-row">
            <span>Remaining:</span>
            <span className="monospace">{formatBase(remaining)}</span>
          </div>
          <div className="expanded-row">
            <span>Owner:</span>
            <span className="monospace">{formatAddress(order.owner)}</span>
          </div>
        </div>
      )}
    </div>
  )
}