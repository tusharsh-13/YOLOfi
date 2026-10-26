import { useState } from 'react'
import { useDemo } from '../context/DemoContext'
import './DemoTour.css'

const STEPS = [
  {
    step: 1,
    badge: 'Step 1 of 5',
    title: 'Claim Test Tokens (Faucet)',
    summary: 'Mint mock tYBTC (18 decimals) and tUSDC (6 decimals) into your simulated wallet.',
    detail: 'In real DeFi, users acquire tokens from a faucet or DEX. On YOLOfi, each test token is an OpenZeppelin ERC-20 with a public minting faucet.',
    actionLabel: '⚡ Auto-Mint 1.0 tYBTC + 50k USDC',
  },
  {
    step: 2,
    badge: 'Step 2 of 5',
    title: 'Deposit into Internal Ledger',
    summary: 'Move tokens from your wallet into the OrderBook contract ledger.',
    detail: 'Only deposit and withdraw transfer external ERC-20s. Matching and settlement only mutate internal balances (baseFree, quoteFree), ensuring 100% atomic execution without token transfer overhead.',
    actionLabel: '⚡ Auto-Deposit 1.0 tYBTC + 25k USDC',
  },
  {
    step: 3,
    badge: 'Step 3 of 5',
    title: 'Place a Resting Limit Order',
    summary: 'Submit a buy or sell order that sits in the book awaiting a counterparty.',
    detail: 'Orders are stored in FIFO queues at discrete price levels (tick size 0.01 USDC, lot size 0.0001 BTC). Funds are safely locked in baseLocked or quoteLocked until filled or cancelled.',
    actionLabel: '⚡ Load Resting Bid ($97,500)',
  },
  {
    step: 4,
    badge: 'Step 4 of 5',
    title: 'Execute an Atomic Match',
    summary: 'Cross the spread to immediately match against resting makers in price-time order.',
    detail: 'Trades execute at the maker\'s price. If a buyer bids $102,000 but the best ask is $101,000, the buyer receives a price-improvement refund! Makers pay 0% fees, while takers pay 10 bps (0.10%).',
    actionLabel: '⚡ Load Market-Crossing Buy ($101,000)',
  },
  {
    step: 5,
    badge: 'Step 5 of 5',
    title: 'Cancel Orders & Settle / Withdraw',
    summary: 'Cancel open resting orders or withdraw settled tokens back to your wallet.',
    detail: 'Cancelling an order immediately unlocks remaining funds back to your free balance and deletes empty price levels. Free funds can be withdrawn back to your ERC-20 wallet at any time.',
    actionLabel: '⚡ Auto-Cancel First Open Order',
  },
]

export function DemoTour() {
  const {
    currentStep,
    setCurrentStep,
    runStepAction,
    resetDemo,
    currentAccount,
    switchAccount,
    isDemoMode,
    setDemoMode,
  } = useDemo()

  const [loading, setLoading] = useState(false)
  const currentStepData = STEPS.find(s => s.step === currentStep) || STEPS[0]

  const handleAction = async () => {
    try {
      setLoading(true)
      await runStepAction(currentStep)
    } finally {
      setLoading(false)
    }
  }

  if (!isDemoMode) {
    return (
      <div className="demo-tour-banner minimized">
        <div className="minimized-inner">
          <span className="minimized-text">🔌 Connected to Web3 Provider.</span>
          <button className="btn-return-demo" onClick={() => setDemoMode(true)}>
            ⚡ Switch Back to Interactive Demo Flow
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="demo-tour-banner" aria-label="Interactive Demo Walkthrough">
      <div className="demo-tour-header">
        <div className="demo-tour-title-group">
          <div className="demo-live-pill">
            <span className="live-dot" />
            <span>INTERACTIVE DEMO FLOW</span>
          </div>
          <span className="demo-hint-text">
            No Web3 wallet or gas required · Experience every onchain state transition
          </span>
        </div>

        <div className="demo-tour-controls">
          <div className="persona-switcher">
            <span className="persona-label">Trader:</span>
            <button
              className={`persona-btn ${currentAccount.id === 'alice' ? 'active' : ''}`}
              onClick={() => switchAccount('alice')}
              title="Trade as Alice (Taker / Retail)"
            >
              Alice
            </button>
            <button
              className={`persona-btn ${currentAccount.id === 'bob' ? 'active' : ''}`}
              onClick={() => switchAccount('bob')}
              title="Trade as Bob (Market Maker)"
            >
              Bob
            </button>
          </div>

          <button className="demo-reset-btn" onClick={resetDemo} title="Reset demo balances and book">
            ↺ Reset State
          </button>
        </div>
      </div>

      {/* Stepper Progress Tabs */}
      <div className="demo-stepper">
        {STEPS.map(s => {
          const isDone = s.step < currentStep
          const isActive = s.step === currentStep
          return (
            <button
              key={s.step}
              className={`stepper-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => setCurrentStep(s.step)}
            >
              <div className="stepper-circle">
                {isDone ? '✓' : s.step}
              </div>
              <div className="stepper-label-group">
                <span className="stepper-num">Step {s.step}</span>
                <span className="stepper-title">{s.title.split('(')[0].trim()}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Active Step Card */}
      <div className="demo-step-card">
        <div className="step-card-content">
          <div className="step-card-badge">{currentStepData.badge}</div>
          <h3 className="step-card-title">{currentStepData.title}</h3>
          <p className="step-card-summary">{currentStepData.summary}</p>
          <div className="step-card-detail">
            <strong>Architecture Note:</strong> {currentStepData.detail}
          </div>
        </div>

        <div className="step-card-actions">
          <button
            className="btn-step-action"
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? 'Processing...' : currentStepData.actionLabel}
          </button>

          <div className="step-nav-buttons">
            <button
              className="btn-step-nav"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            >
              ← Prev
            </button>
            <button
              className="btn-step-nav"
              disabled={currentStep === 5}
              onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
