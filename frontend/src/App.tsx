import { useState } from 'react'
import { useWallet } from './hooks/useWallet'
import { WalletButton } from './components/WalletButton'
import { Faucet } from './components/Faucet'
import { DepositPanel } from './components/DepositPanel'
import { OrderForm } from './components/OrderForm'
import { OrderBookView } from './components/OrderBookView'
import { MyOrders } from './components/MyOrders'
import { TradeFeed } from './components/TradeFeed'
import { LandingPage } from './components/LandingPage'
import './App.css'

function App() {
  const [view, setView] = useState<'landing' | 'app'>('landing')
  const { chainId, isConnected, targetChains, switchChain, isWrongChain } = useWallet()
  const currentChain = (chainId !== null ? targetChains.find(c => c.id === chainId) : null) || targetChains[0]
  const isTargetChain = isConnected && chainId !== null && targetChains.some(c => c.id === chainId)

  if (view === 'landing') {
    return <LandingPage onLaunchApp={() => setView('app')} />
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-left">
          {/* Back to landing */}
          <button
            className="logo-btn"
            onClick={() => setView('landing')}
            title="Back to home"
          >
            <span className="logo-wordmark">YOLOfi</span>
          </button>
          <span className="header-pair-badge">tYBTC / tUSDC</span>
        </div>

        <div className="header-center">
          <div className={`network-indicator ${isConnected ? 'connected' : 'idle'} ${isWrongChain ? 'wrong-chain' : ''}`}>
            <span className="dot" />
            <span>
              {isConnected ? `${currentChain.name} · Chain ${chainId}` : 'Not connected'}
              {isWrongChain && ' · Wrong network'}
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
              <div className="trading-main">
                <div className="book-and-form">
                  <OrderBookView />
                  <div className="divider-vertical" />
                  <OrderForm />
                </div>
                <div className="divider" />
                <div className="bottom-panels">
                  <MyOrders />
                  <TradeFeed />
                </div>
              </div>
            </section>
          </div>
        ) : isWrongChain ? (
          <div className="wrong-network">
            <div className="panel-card compact-panel">
              <h2>Wrong Network</h2>
              <p>Please switch to one of the supported networks to continue.</p>
              <div className="network-list">
                {targetChains.map(chain => (
                  <button key={chain.id} className="network-button" onClick={() => switchChain(chain.id)}>
                    Switch to {chain.name} (Chain {chain.id})
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="welcome panel-card">
            <div className="welcome-mark">◈</div>
            <h2>Connect Your Wallet</h2>
            <p>Connect to Base Sepolia or local Anvil to start trading onchain.</p>
            <div className="welcome-actions">
              <WalletButton />
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>YOLOfi · Hack in Hills '26 · Fully Onchain CLOB DEX · <button className="footer-link" onClick={() => setView('landing')}>Back to Home</button></p>
      </footer>
    </div>
  )
}

export default App