import { useWallet } from './hooks/useWallet'
import { WalletButton } from './components/WalletButton'
import { Faucet } from './components/Faucet'
import { DepositPanel } from './components/DepositPanel'
import './App.css'

function App() {
  const { chainId, isConnected, targetChains, switchChain } = useWallet()
  const currentChain = targetChains.find(c => c.id === chainId) || targetChains[0]
  const isTargetChain = targetChains.some(c => c.id === chainId)

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">YOLOfi</h1>
          <span className="subtitle">Fully Onchain CLOB DEX</span>
        </div>
        <div className="header-center">
          <div className="network-indicator">
            <span className={`chain-badge ${isTargetChain ? '' : 'wrong-chain'}`}>
              {currentChain.name} (Chain {chainId})
              {!isTargetChain && ' ⚠️ Wrong Network'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <WalletButton />
        </div>
      </header>

      <main className="main">
        {isConnected && isTargetChain ? (
          <div className="grid">
            <aside className="sidebar">
              <Faucet />
              <div className="divider" />
              <DepositPanel />
            </aside>
            <section className="trading-section">
              <div className="trading-placeholder">
                <h2>Trading Interface</h2>
                <p>OrderBookView, OrderForm, MyOrders, TradeFeed coming in Phase 6</p>
                <div className="status">
                  <span className="status-indicator connected" />
                  <span>Connected to {currentChain.name}</span>
                </div>
                <div className="contract-info">
                  <strong>OrderBook:</strong> {import.meta.env.VITE_ORDERBOOK_ADDRESS || 'Not configured'}<br />
                  <strong>tYBTC:</strong> {import.meta.env.VITE_TYBTC_ADDRESS || 'Not configured'}<br />
                  <strong>tUSDC:</strong> {import.meta.env.VITE_TUSDC_ADDRESS || 'Not configured'}
                </div>
              </div>
            </section>
          </div>
        ) : isConnected && !isTargetChain ? (
          <div className="wrong-network">
            <h2>Wrong Network</h2>
            <p>Please switch to one of the supported networks:</p>
            <ul>
              {targetChains.map(chain => (
                <li key={chain.id}>
                  <button onClick={() => switchChain(chain.id)}>
                    Switch to {chain.name} (Chain {chain.id})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="welcome">
            <h2>Welcome to YOLOfi</h2>
            <p>A fully onchain central limit order book (CLOB) DEX</p>
            <p>Connect your wallet to start trading</p>
            <WalletButton />
          </div>
        )}
      </main>

      <footer className="footer">
        <p>YOLOfi - Hack in Hills '26 | Fully Onchain CLOB DEX</p>
      </footer>
    </div>
  )
}

export default App