import { useDemo } from '../context/DemoContext'
import './ToastContainer.css'

export function ToastContainer() {
  const { toasts, removeToast } = useDemo()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => {
        const icon =
          toast.type === 'success' ? '✓' :
          toast.type === 'trade' ? '⚡' :
          toast.type === 'error' ? '⚠' : 'ℹ'

        return (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <div className="toast-icon-badge">{icon}</div>
            <div className="toast-body">
              <div className="toast-header-row">
                <span className="toast-title">{toast.title}</span>
                <button
                  className="toast-close-btn"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="toast-message">{toast.message}</p>
              {toast.txHash && (
                <div className="toast-tx-row">
                  <span className="tx-label">Tx Hash:</span>
                  <span className="tx-hash" title={toast.txHash}>
                    {toast.txHash.slice(0, 10)}...{toast.txHash.slice(-8)}
                  </span>
                  <span className="tx-simulated-pill">Simulated Onchain</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
