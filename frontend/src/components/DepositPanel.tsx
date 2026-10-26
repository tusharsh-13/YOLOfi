import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useBalances } from '../hooks/useBalances'
import { deposit, withdraw, erc20Approve, erc20BalanceOf } from '../lib/contracts'
import { formatBase, formatQuote, parseBase, parseQuote } from '../lib/format'
import { CONTRACT_ADDRESSES } from '../lib/contracts'
import { useDemo } from '../context/DemoContext'

const TOKENS = [
  { symbol: 'tYBTC', key: 'tYBTC', formatFn: formatBase, parseFn: parseBase },
  { symbol: 'tUSDC', key: 'tUSDC', formatFn: formatQuote, parseFn: parseQuote },
] as const

export function DepositPanel() {
  const { isDemoMode, balances: demoBalances, depositToken, withdrawToken, approveToken } = useDemo()
  const { account, chainId } = useWallet()
  const web3Balances = useBalances(chainId || 31337, account as `0x${string}` | null)

  const balances = isDemoMode ? demoBalances : web3Balances
  const baseFree = balances.baseFree
  const baseLocked = balances.baseLocked
  const quoteFree = balances.quoteFree
  const quoteLocked = balances.quoteLocked
  const walletBase = balances.walletBase
  const walletQuote = balances.walletQuote
  const baseAllowance = balances.baseAllowance
  const quoteAllowance = balances.quoteAllowance

  const [activeToken, setActiveToken] = useState<'tYBTC' | 'tUSDC'>('tYBTC')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [approving, setApproving] = useState<'tYBTC' | 'tUSDC' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const token = TOKENS.find(t => t.key === activeToken)!
  const orderBookAddress = CONTRACT_ADDRESSES.orderBook

  const walletBalance = activeToken === 'tYBTC' ? walletBase : walletQuote
  const freeBalance = activeToken === 'tYBTC' ? baseFree : quoteFree
  const lockedBalance = activeToken === 'tYBTC' ? baseLocked : quoteLocked
  const allowance = activeToken === 'tYBTC' ? baseAllowance : quoteAllowance

  const handleDeposit = async () => {
    const amount = token.parseFn(depositAmount)
    if (amount <= 0n) { setError('Amount must be positive'); return }
    if (amount > walletBalance) { setError(`Insufficient ${token.symbol} wallet balance`); return }

    setError(null)
    setSuccess(null)
    setDepositing(true)

    try {
      if (isDemoMode) {
        if (allowance < amount) {
          setApproving(token.key)
          await approveToken(token.key, amount)
          setApproving(null)
        }
        await depositToken(token.key, amount)
      } else {
        if (!account || !chainId) throw new Error('Connect wallet first')
        if (allowance < amount) {
          setApproving(token.key)
          await erc20Approve(chainId, token.key, orderBookAddress, amount)
          setApproving(null)
        }
        await deposit(chainId, token.key, amount)
        web3Balances.refetch()
      }

      setSuccess(`Deposited ${token.formatFn(amount)} ${token.symbol}`)
      setDepositAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed')
    } finally {
      setDepositing(false)
      setApproving(null)
    }
  }

  const handleWithdraw = async () => {
    const amount = token.parseFn(withdrawAmount)
    if (amount <= 0n) { setError('Amount must be positive'); return }
    if (amount > freeBalance) { setError('Insufficient free balance'); return }

    setError(null)
    setSuccess(null)
    setWithdrawing(true)

    try {
      if (isDemoMode) {
        await withdrawToken(token.key, amount)
      } else {
        if (!account || !chainId) throw new Error('Connect wallet first')
        await withdraw(chainId, token.key, amount)
        web3Balances.refetch()
      }

      setSuccess(`Withdrew ${token.formatFn(amount)} ${token.symbol}`)
      setWithdrawAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdraw failed')
    } finally {
      setWithdrawing(false)
    }
  }

  const handleMaxDeposit = async () => {
    if (isDemoMode) {
      setDepositAmount(token.formatFn(walletBalance))
    } else {
      if (!account || !chainId) return
      const bal = await erc20BalanceOf(chainId, token.key, account as unknown as `0x${string}`)
      setDepositAmount(token.formatFn(bal))
    }
  }

  const handleMaxWithdraw = () => {
    setWithdrawAmount(token.formatFn(freeBalance))
  }

  const pendingAllowance = approving === token.key

  return (
    <div className="deposit-panel">
      <h3>Deposit / Withdraw</h3>

      <div className="token-tabs">
        {TOKENS.map(t => (
          <button
            key={t.key}
            className={`token-tab ${activeToken === t.key ? 'active' : ''}`}
            onClick={() => { setActiveToken(t.key); setError(null); setSuccess(null); }}
          >
            {t.symbol}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="balance-grid">
        <div className="balance-card wallet">
          <span className="label">Wallet {token.symbol}</span>
          <span className="value">{token.formatFn(walletBalance)}</span>
        </div>
        <div className="balance-card free">
          <span className="label">Free (Book)</span>
          <span className="value">{token.formatFn(freeBalance)}</span>
        </div>
        <div className="balance-card locked">
          <span className="label">Locked (Orders)</span>
          <span className="value">{token.formatFn(lockedBalance)}</span>
        </div>
        <div className="balance-card allowance">
          <span className="label">Allowance</span>
          <span className="value">
            {allowance === 0n ? '0' : allowance > 10n**18n ? '∞' : token.formatFn(allowance)}
            {pendingAllowance && <span className="pending"> (approving...)</span>}
          </span>
        </div>
      </div>

      <div className="action-section">
        <h4>Deposit</h4>
        <div className="input-group">
          <input
            type="text"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            placeholder={`Amount of ${token.symbol}`}
            disabled={depositing || pendingAllowance}
          />
          <div className="action-buttons">
            <button className="secondary" onClick={handleMaxDeposit} disabled={depositing}>Max</button>
            <button className="primary" onClick={handleDeposit} disabled={depositing || pendingAllowance || !depositAmount}>
              {depositing ? 'Depositing...' : pendingAllowance ? 'Approving...' : 'Deposit'}
            </button>
          </div>
        </div>

        <div className="action-section">
          <h4>Withdraw</h4>
          <div className="input-group">
            <input
              type="text"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder={`Amount of ${token.symbol}`}
              disabled={withdrawing}
            />
            <div className="action-buttons">
              <button className="secondary" onClick={handleMaxWithdraw} disabled={withdrawing || freeBalance === 0n}>Max</button>
              <button className="primary" onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount || token.parseFn(withdrawAmount) > freeBalance}>
                {withdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}