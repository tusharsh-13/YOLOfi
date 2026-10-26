import { useState } from 'react'
import { DemoProvider, useDemo } from './context/DemoContext'
import { useWallet } from './hooks/useWallet'
import { WalletButton } from './components/WalletButton'
import { Faucet } from './components/Faucet'
import { DepositPanel } from './components/DepositPanel'
import { OrderForm } from './components/OrderForm'
import { OrderBookView } from './components/OrderBookView'
import { MyOrders } from './components/MyOrders'
import { TradeFeed } from './components/TradeFeed'
import { LandingPage } from './components/LandingPage'
import { DemoTour } from './components/DemoTour'
import { ToastContainer } from './components/ToastContainer'
import './App.css'

function AppContent() {
  const [view, setView] = useState<'landing' | 'app'>('landing')
  const { isDemoMode, setDemoMode } = useDemo()
  const { chainId, isConnected, targetChains, switchChain, isWrongChain } = useWallet()
  const currentChain = (chainId !== null ? targetChains.find(c => c.id === chainId) : null) || targetChains[0]
  const isTargetChain = isConnected && chainId !== null && targetChains.some(c => c.id === chainId)

  const handleLaunchDemo = () => {
    setDemoMode(true)
    setView('app')
  }

  const handleLaunchApp = () => {
    setView('app')
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLaunchApp={handleLaunchApp}
        onLaunchDemo={handleLaunchDemo}
      />
    )
  }

  const showTradingInterface = isDemoMode || (isConnected && isTargetChain)

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-left">
          <button
            className="logo-btn"
            onClick={() => setView('landing')}
            title="Back to home"
          >
            <span className="logo-wordmark">YOLOfi</span>
          </button>
          <span className="header-pair-badge">tYBTC / tUSDC</span>
          {isDemoMode && (
            <span className="demo-mode-tag">
              ⚡ DEMO FLOW
            </span>
          )}
        </div>

        <div className="header-center">
          <div className={`network-indicator ${isDemoMode ? 'demo-active' : isConnected ? 'connected' : 'idle'} ${!isDemoMode && isWrongChain ? 'wrong-chain' : ''}`}>
            <span className="dot" />
            <span>
              {isDemoMode
                ? 'Local Anvil · Simulated Onchain Matching'
                : isConnected
                ? `${currentChain.name} · Chain ${chainId}`
                : 'Not connected'}
              {!isDemoMode && isWrongChain && ' · Wrong network'}
            </span>
          </div>
        </div>

        <div className="header-right">
          <WalletButton />
        </div>
      </header>

      <main className="main">
        {/* Interactive Guided Stepper Banner */}
        {isDemoMode && <DemoTour />}

        {showTradingInterface ? (
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
              <p>Please switch to one of the supported networks to continue, or switch to the interactive demo flow.</p>
              <div className="network-list">
                {targetChains.map(chain => (
                  <button key={chain.id} className="network-button" onClick={() => switchChain(chain.id)}>
                    Switch to {chain.name} (Chain {chain.id})
                  </button>
                ))}
                <button className="network-button demo-btn" onClick={() => setDemoMode(true)}>
                  ⚡ Switch to Interactive Demo Flow (No Wallet Needed)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="welcome panel-card">
            <div className="welcome-mark">◈</div>
            <h2>Explore YOLOfi Onchain CLOB</h2>
            <p>Experience the complete onchain order matching flow with zero setup, or connect your Web3 wallet.</p>
            <div className="welcome-actions">
              <button className="btn-primary-demo" onClick={() => setDemoMode(true)}>
                ⚡ Start Interactive Demo (No Wallet Required)
              </button>
              <WalletButton />
            </div>
          </div>
        )}
      </main>

      <ToastContainer />

      <footer className="footer">
        <p>
          YOLOfi · Hack in Hills '26 · Fully Onchain CLOB DEX ·{' '}
          <button className="footer-link" onClick={() => setView('landing')}>
            Back to Home
          </button>{' '}
          ·{' '}
          <button
            className="footer-link"
            onClick={() => setDemoMode(!isDemoMode)}
          >
            {isDemoMode ? 'Switch to Web3 Mode' : 'Switch to Demo Flow'}
          </button>
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <DemoProvider>
      <AppContent />
    </DemoProvider>
  )
}