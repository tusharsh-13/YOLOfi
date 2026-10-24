import { useWallet } from '../hooks/useWallet'
import { formatAddress } from '../lib/format'
import './WalletButton.css'

export function WalletButton() {
  const { account, chainId, isConnected, isConnecting, connect, disconnect, switchChain, targetChains } = useWallet()

  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('Failed to connect:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  if (!isConnected) {
    return (
      <button className="wallet-button" onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
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
        {!targetChains.some(c => c.id === chainId) && (
          <button
            className="switch-chain-btn"
            onClick={() => switchChain(targetChains[0].id)}
            title="Switch to Anvil"
          >
            Switch to {targetChains[0].name}
          </button>
        )}
        <button className="disconnect-btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    </div>
  )
}