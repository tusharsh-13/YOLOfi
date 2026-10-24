import { useWallet } from './hooks/useWallet'
import { WalletButton } from './components/WalletButton'
import { Faucet } from './components/Faucet'
import { DepositPanel } from './components/DepositPanel'
import { OrderForm } from './components/OrderForm'
import { OrderBookView } from './components/OrderBookView'
import { MyOrders } from './components/MyOrders'
import { TradeFeed } from './components/TradeFeed'
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