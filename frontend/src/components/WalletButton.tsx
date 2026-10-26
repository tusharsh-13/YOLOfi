import { useWallet } from '../hooks/useWallet'
import { useDemo } from '../context/DemoContext'
import { formatAddress } from '../lib/format'
import './WalletButton.css'

export function WalletButton() {
  const { isDemoMode, setDemoMode, currentAccount, switchAccount } = useDemo()
  const { account, chainId, isConnected, isConnecting, connect, disconnect, switchChain, targetChains } = useWallet()

  const handleConnect = async () => {
    try {
      await connect()
      setDemoMode(false)
    } catch (error) {
      console.error('Failed to connect:', error)
      alert('Failed to connect wallet. Please ensure MetaMask is installed.')
    }
  }

  if (isDemoMode) {
    return (
      <div className="wallet-connected demo-mode-wallet">
        <div className="wallet-info">
          <span className="address" title={currentAccount.address}>
            {formatAddress(currentAccount.address)}
          </span>
          <span className="chain-badge demo-badge" title="Simulated Local Anvil / Base Sepolia">
            ⚡ Demo Active
          </span>
        </div>
        <div className="wallet-actions">
          <button
            className="switch-persona-btn"
            onClick={() => switchAccount(currentAccount.id === 'alice' ? 'bob' : 'alice')}
            title="Toggle between Alice (Taker) and Bob (Maker)"
          >
            {currentAccount.id === 'alice' ? '👤 Alice' : '👤 Bob'}
          </button>
          <button
            className="real-wallet-toggle-btn"
            onClick={handleConnect}
            title="Connect MetaMask extension"
          >
            Connect Real Wallet
          </button>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="wallet-actions-group">
        <button className="wallet-button" onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        <button className="demo-toggle-btn" onClick={() => setDemoMode(true)}>
          ⚡ Demo Mode
        </button>
      </div>
    )
  }

  const currentChain = targetChains.find(c => c.id === chainId) || targetChains[0]
  const isTargetChain = targetChains.some(c => c.id === chainId)

  return (
    <div className="wallet-connected">
      <div className="wallet-info">
        <span className="address">{account && formatAddress(account.address)}</span>
        <span className={`chain-badge ${isTargetChain ? '' : 'wrong-chain'}`}>
          {currentChain?.name || `Chain ${chainId}`}
          {!isTargetChain && ' ⚠️'}
        </span>
      </div>
      <div className="wallet-actions">
        {!isTargetChain && (
          <button
            className="switch-chain-btn"
            onClick={() => switchChain(targetChains[0].id)}
            title="Switch network"
          >
            Switch to {targetChains[0].name}
          </button>
        )}
        <button className="demo-toggle-btn" onClick={() => setDemoMode(true)}>
          ⚡ Demo Mode
        </button>
        <button className="disconnect-btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    </div>
  )
}