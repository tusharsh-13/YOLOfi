import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { formatBase, formatQuote, parseBase, parseQuote } from '../lib/format'
import './Faucet.css'

export function Faucet() {
  const { account, chainId } = useWallet()
  const [minting, setMinting] = useState<'tYBTC' | 'tUSDC' | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [customToken, setCustomToken] = useState<'tYBTC' | 'tUSDC'>('tYBTC')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [balances, setBalances] = useState<{ tYBTC: bigint; tUSDC: bigint }>({ tYBTC: 0n, tUSDC: 0n })
  const [loadingBalances, setLoadingBalances] = useState(false)

  const fetchBalances = async () => {
    if (!account || !chainId) return
    setLoadingBalances(true)
    try {
      const { erc20BalanceOf } = await import('../lib/contracts')
      const [tybtc, tusdc] = await Promise.all([
        erc20BalanceOf(chainId, 'tYBTC', account as unknown as `0x${string}`),
        erc20BalanceOf(chainId, 'tUSDC', account as unknown as `0x${string}`),
      ])
      setBalances({ tYBTC: tybtc, tUSDC: tusdc })
    } catch {
      // ignore
    } finally {
      setLoadingBalances(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [account, chainId])

  const handleFaucet = async (token: 'tYBTC' | 'tUSDC') => {
    if (!account || !chainId) return
    setError(null)
    setSuccess(null)
    setMinting(token)

    try {
      const { erc20Faucet } = await import('../lib/contracts')
      await erc20Faucet(chainId, token)
      const name = token === 'tYBTC' ? 'tYBTC' : 'tUSDC'
      setSuccess(`Minted faucet ${name}`)
      fetchBalances()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faucet failed')
    } finally {
      setMinting(null)
    }
  }

  const handleCustomMint = async () => {
    if (!account || !chainId || !customAmount) return
    const amount = customToken === 'tYBTC' ? parseBase(customAmount) : parseQuote(customAmount)
    if (amount <= 0n) { setError('Amount must be positive'); return }

    setError(null)
    setSuccess(null)
    setMinting(customToken)

    try {
      const { erc20Mint } = await import('../lib/contracts')
      await erc20Mint(chainId, customToken, account as unknown as `0x${string}`, amount)
      const name = customToken === 'tYBTC' ? 'tYBTC' : 'tUSDC'
      setSuccess(`Minted ${customToken === 'tYBTC' ? formatBase(amount) : formatQuote(amount)} ${name}`)
      setCustomAmount('')
      fetchBalances()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed')
    } finally {
      setMinting(null)
    }
  }

  return (
    <div className="faucet">
      <h3>🚰 Faucet</h3>
      <p className="description">Get test tokens for trading</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="balance-display">
        <div className="balance-item">
          <span className="label">tYBTC:</span>
          <span className="value">{loadingBalances ? '...' : formatBase(balances.tYBTC)}</span>
        </div>
        <div className="balance-item">
          <span className="label">tUSDC:</span>
          <span className="value">{loadingBalances ? '...' : formatQuote(balances.tUSDC)}</span>
        </div>
      </div>

      <div className="faucet-buttons">
        <button
          className="faucet-btn"
          onClick={() => handleFaucet('tYBTC')}
          disabled={minting === 'tYBTC' || !account}
        >
          {minting === 'tYBTC' ? 'Minting...' : '💧 Faucet tYBTC (10k)'}
        </button>
        <button
          className="faucet-btn"
          onClick={() => handleFaucet('tUSDC')}
          disabled={minting === 'tUSDC' || !account}
        >
          {minting === 'tUSDC' ? 'Minting...' : '💧 Faucet tUSDC (10k)'}
        </button>
      </div>

      <div className="custom-mint">
        <h4>Custom Mint</h4>
        <div className="custom-mint-row">
          <input
            type="text"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder="Amount (e.g., 100)"
            disabled={minting !== null || !account}
          />
          <select value={customToken} onChange={e => setCustomToken(e.target.value as 'tYBTC' | 'tUSDC')} disabled={minting !== null}>
            <option value="tYBTC">tYBTC</option>
            <option value="tUSDC">tUSDC</option>
          </select>
          <button
            className="mint-btn"
            onClick={handleCustomMint}
            disabled={minting !== null || !account || !customAmount}
          >
            {minting ? 'Minting...' : 'Mint Custom'}
          </button>
        </div>
      </div>
    </div>
  )
}