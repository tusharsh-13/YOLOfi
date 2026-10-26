import { useState } from 'react'
import './LandingPage.css'

interface LandingPageProps {
  onLaunchApp: () => void
  onLaunchDemo?: () => void
}

export function LandingPage({ onLaunchApp, onLaunchDemo }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const launchDemo = onLaunchDemo || onLaunchApp

  return (
    <div className="landing-shell">
      {/* ── HEADER ── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-header-left">
            <a href="#" className="landing-logo-link">
              <span className="landing-logo-text">YOLOfi</span>
            </a>
            <nav className="landing-nav">
              <a href="#features" className="landing-nav-link">Features</a>
              <a href="#how-it-works" className="landing-nav-link">How it Works</a>
              <a href="#markets" className="landing-nav-link">Markets</a>
              <a href="#architecture" className="landing-nav-link">Architecture</a>
              <a href="#faq" className="landing-nav-link">FAQ</a>
            </nav>
          </div>
          <div className="landing-header-right">
            <div className="network-pill">
              <span className="status-dot-wrapper">
                <span className="status-dot-ping" />
                <span className="status-dot" />
              </span>
              <span className="network-pill-label">Base Sepolia</span>
            </div>
            <button className="btn-demo-header" onClick={launchDemo}>
              ⚡ Interactive Demo
            </button>
            <button className="btn-primary" onClick={onLaunchApp}>
              Launch App
              <span className="material-symbols-outlined btn-icon">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* Ambient Glow Blobs */}
        <div className="glow-blob glow-blob-1" />
        <div className="glow-blob glow-blob-2" />
        <div className="glow-blob glow-blob-3" />

        {/* ── 1. HERO ── */}
        <section className="hero-section">
          <div className="hero-grid">
            {/* Left: Copy */}
            <div className="hero-copy">
              <div className="eyebrow-pill">
                <span className="status-dot-wrapper sm">
                  <span className="status-dot-ping" />
                  <span className="status-dot" />
                </span>
                <span className="eyebrow-label">Base Sepolia Public Testnet Live</span>
                <span className="eyebrow-version">• v0.8.2</span>
              </div>

              <h1 className="hero-headline font-editorial">
                Trade onchain. <br />
                <span className="italic brand-gradient-text">Verify</span> everything.
              </h1>

              <p className="hero-subhead">
                A fully onchain order book. Orders, matching, and settlement all happen in
                deterministic smart contracts — with no opaque offchain engine or hidden custody.
              </p>

              <div className="hero-ctas">
                <button className="btn-hero-primary" onClick={launchDemo}>
                  ⚡ Try Interactive Demo
                  <span className="material-symbols-outlined btn-icon">arrow_forward</span>
                </button>
                <button className="btn-hero-secondary" onClick={onLaunchApp}>
                  <span className="material-symbols-outlined btn-icon-left cyan">play_circle</span>
                  Connect Wallet
                </button>
              </div>

              <div className="trust-strip">
                <div className="trust-pill">
                  <span className="material-symbols-outlined trust-icon">check_circle</span>
                  <span>Fully Onchain</span>
                </div>
                <div className="trust-pill">
                  <span className="material-symbols-outlined trust-icon">shield</span>
                  <span>Self-Custodial</span>
                </div>
                <div className="trust-pill">
                  <span className="material-symbols-outlined trust-icon">schedule</span>
                  <span>Price-Time FIFO</span>
                </div>
                <div className="trust-pill">
                  <span className="material-symbols-outlined trust-icon">electric_bolt</span>
                  <span>Atomic Settle</span>
                </div>
              </div>
            </div>

            {/* Right: Order Book Widget */}
            <div className="hero-widget-wrapper">
              <div className="hero-widget-glow" />
              <div className="hero-orderbook-card">
                {/* Card Header */}
                <div className="ob-card-header">
                  <div className="ob-pair">
                    <span className="ob-pair-dot" />
                    <span className="ob-pair-name">tYBTC / tUSDC</span>
                    <span className="ob-version-badge">CLOB v1</span>
                  </div>
                  <div className="ob-gas">
                    <span className="ob-gas-label">Gas: 0.0004 Gwei</span>
                    <span className="ob-gas-dot" />
                  </div>
                </div>

                {/* Column labels */}
                <div className="ob-col-labels">
                  <span>Price (USDC)</span>
                  <span className="text-right">Size (tYBTC)</span>
                  <span className="text-right">Total Depth</span>
                </div>

                {/* Asks */}
                <div className="ob-asks">
                  {[
                    { price: '68,454.50', size: '1.4820', depth: '101.4K', pct: 78 },
                    { price: '68,453.00', size: '0.9240', depth: '63.2K', pct: 52 },
                    { price: '68,452.50', size: '0.5110', depth: '34.9K', pct: 31 },
                  ].map((row, i) => (
                    <div key={i} className="ob-level ob-level-ask">
                      <div className="ob-depth-bar ask-bar" style={{ width: `${row.pct}%` }} />
                      <span className="ob-price ask-price">{row.price}</span>
                      <span className="ob-size">{row.size}</span>
                      <span className="ob-depth">{row.depth}</span>
                    </div>
                  ))}
                </div>

                {/* Mid Price */}
                <div className="ob-mid">
                  <div className="ob-mid-price">
                    <span className="ob-mid-value">$68,450.20</span>
                    <span className="material-symbols-outlined ob-mid-icon">trending_up</span>
                  </div>
                  <div className="ob-spread">
                    <span className="ob-spread-label">Spread $4.50</span>
                    <span className="ob-spread-pct">0.006%</span>
                  </div>
                </div>

                {/* Bids */}
                <div className="ob-bids">
                  {[
                    { price: '68,448.00', size: '0.7200', depth: '49.2K', pct: 44 },
                    { price: '68,446.50', size: '1.1940', depth: '81.7K', pct: 68 },
                    { price: '68,445.00', size: '1.6500', depth: '112.9K', pct: 86 },
                  ].map((row, i) => (
                    <div key={i} className="ob-level ob-level-bid">
                      <div className="ob-depth-bar bid-bar" style={{ width: `${row.pct}%` }} />
                      <span className="ob-price bid-price">{row.price}</span>
                      <span className="ob-size">{row.size}</span>
                      <span className="ob-depth">{row.depth}</span>
                    </div>
                  ))}
                </div>

                {/* Settlement Ticker */}
                <div className="ob-ticker">
                  <div className="ob-ticker-left">
                    <span className="material-symbols-outlined ob-ticker-icon">verified</span>
                    <span className="ob-ticker-label">Last Settle: <span className="ob-ticker-block">#19,402,112</span></span>
                  </div>
                  <span className="ob-ticker-matched">0.45 ETH matched</span>
                </div>
              </div>

              {/* Toast */}
              <div className="hero-toast">
                <div className="hero-toast-icon">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div className="hero-toast-copy">
                  <span className="hero-toast-title">Sub-second Execution</span>
                  <span className="hero-toast-sub">Base L2 sequencer finality</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. STATS BAND ── */}
        <section className="stats-band">
          <div className="stats-grid">
            {[
              { num: '100%', color: 'cyan', title: 'Onchain Matching', desc: 'Order book memory state lives in contract storage slots, not AWS servers.' },
              { num: '0',    color: 'purple', title: 'Intermediaries', desc: 'No market maker backdoors, no front-running privileged relays, zero brokers.' },
              { num: '1',    color: 'pink', title: 'Tx to Settle', desc: 'Matching, token debit, and atomic delivery committed in a single atomic block.' },
              { num: '100%', color: 'cyan2', title: 'Verifiable State', desc: 'Inspect bid-ask balance, fill queues, and audit receipts natively on BaseScan.' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <span className={`stat-num stat-num-${stat.color}`}>{stat.num}</span>
                <span className="stat-title">{stat.title}</span>
                <p className="stat-desc">{stat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. LIVE MARKETS TABLE ── */}
        <section className="markets-section" id="markets">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">
                <span className="eyebrow-text">Real-Time Liquidity</span>
                <span className="eyebrow-dot">•</span>
                <span className="eyebrow-sub">Base Sepolia CLOB</span>
              </div>
              <h2 className="section-title font-editorial">
                Verified Spot <span className="italic brand-gradient-text">Markets</span>
              </h2>
            </div>
            <div className="markets-filter">
              <button className="filter-btn active">All Pairs</button>
              <button className="filter-btn">USDC Base</button>
              <button className="filter-btn">High Volume</button>
            </div>
          </div>

          <div className="markets-table-wrapper">
            <table className="markets-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Last Price</th>
                  <th>Best Bid / Ask</th>
                  <th>Spread</th>
                  <th>24h Vol</th>
                  <th>Trend (24h)</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Active row */}
                <tr className="market-row active-row">
                  <td>
                    <div className="market-pair">
                      <div className="market-icon market-icon-btc">₿</div>
                      <div>
                        <div className="market-name">tYBTC / tUSDC</div>
                        <div className="market-sub">Testnet Bitcoin Perp</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="market-price">$68,450.20</div>
                    <div className="market-change positive">+4.82% ▲</div>
                  </td>
                  <td>
                    <div className="market-bid">$68,448.00</div>
                    <div className="market-ask">$68,452.50</div>
                  </td>
                  <td>
                    <span>$4.50</span>
                    <span className="spread-pct">(0.006%)</span>
                  </td>
                  <td className="market-vol">$14.2M</td>
                  <td>
                    <svg className="sparkline" viewBox="0 0 120 32" fill="none">
                      <path d="M0 24 L20 22 L40 26 L60 16 L80 18 L100 8 L120 4" stroke="var(--secondary-container)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M0 24 L20 22 L40 26 L60 16 L80 18 L100 8 L120 4 L120 32 L0 32 Z" fill="var(--secondary-container)" fillOpacity="0.12"/>
                    </svg>
                  </td>
                  <td className="text-right">
                    <button className="btn-trade" onClick={onLaunchApp}>Trade Now</button>
                  </td>
                </tr>
                {/* Coming soon rows */}
                {[
                  { symbol: 'Ξ', name: 'tETH / tUSDC', sub: 'Ethereum Base Pool', price: '$3,520.10' },
                  { symbol: '◎', name: 'tSOL / tUSDC', sub: 'Solana Bridge Asset', price: '$178.40' },
                ].map((row, i) => (
                  <tr key={i} className="market-row coming-soon-row">
                    <td>
                      <div className="market-pair">
                        <div className="market-icon market-icon-gray">{row.symbol}</div>
                        <div>
                          <div className="market-pair-name-row">
                            <span className="market-name">{row.name}</span>
                            <span className="coming-soon-badge">Coming soon</span>
                          </div>
                          <div className="market-sub">{row.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td className="market-dim">{row.price}</td>
                    <td className="market-dim">—</td>
                    <td className="market-dim">—</td>
                    <td className="market-dim">—</td>
                    <td><div className="sparkline-placeholder" /></td>
                    <td className="text-right">
                      <span className="btn-waitlist">Waitlist</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 4. PROBLEM VS YOLOfi ── */}
        <section className="comparison-section" id="comparison">
          <div className="comparison-inner">
            <div className="comparison-header">
              <span className="eyebrow-text">The Paradigms Compared</span>
              <h2 className="section-title font-editorial">
                Black Box vs <span className="italic brand-gradient-text">Deterministic</span> Onchain
              </h2>
              <p className="section-sub">Traditional DEXes compromise by running offchain order routers. YOLOfi commits all logic directly to the EVM state machine.</p>
            </div>

            <div className="comparison-cards">
              {/* Traditional */}
              <div className="comparison-card traditional-card">
                <div className="comparison-card-top">
                  <span className="card-label">Traditional Exchange / Hybrid DEX</span>
                  <span className="material-symbols-outlined card-icon-danger">lock</span>
                </div>
                <div className="comparison-visual">
                  <div className="black-box-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--error)' }}>cloud_off</span>
                  </div>
                  <p className="comparison-visual-label">Internal Opaque Matching Server</p>
                  <p className="comparison-visual-desc">Trades settled later; order prioritization handled in private server memory without proofs.</p>
                </div>
                <ul className="comparison-list">
                  <li><span className="material-symbols-outlined list-icon danger">close</span>Custodial risk: Exchange holds private keys or settlement IOUs.</li>
                  <li><span className="material-symbols-outlined list-icon danger">close</span>Privileged front-running: VIP latency pipes trade ahead of public users.</li>
                  <li><span className="material-symbols-outlined list-icon danger">close</span>Audit impossibility: Zero live block verification of matching queues.</li>
                </ul>
                <div className="comparison-status">Status: Trust-dependent</div>
              </div>

              {/* YOLOfi */}
              <div className="comparison-card yolofi-card">
                <div className="comparison-card-glow" />
                <div className="comparison-card-top" style={{ position: 'relative', zIndex: 1 }}>
                  <span className="card-label label-primary">YOLOfi Onchain Protocol</span>
                  <span className="material-symbols-outlined card-icon-success">verified</span>
                </div>
                <div className="comparison-visual yolofi-flow" style={{ position: 'relative', zIndex: 1 }}>
                  <div className="flow-row">
                    <span className="flow-node flow-node-user">User Order</span>
                    <span className="material-symbols-outlined flow-arrow animate-pulse">arrow_forward</span>
                    <span className="flow-node flow-node-contract">OrderBook.sol</span>
                    <span className="material-symbols-outlined flow-arrow animate-pulse">arrow_forward</span>
                    <span className="flow-node flow-node-chain">Base Ledger</span>
                  </div>
                  <p className="flow-label">Smart Contract FIFO Execution Engine</p>
                  <p className="comparison-visual-desc">Both orders cross inside EVM storage slots; tokens atomically transfer in the exact same transaction.</p>
                </div>
                <ul className="comparison-list" style={{ position: 'relative', zIndex: 1 }}>
                  <li><span className="material-symbols-outlined list-icon success">check_circle</span>Non-custodial: Tokens remain under smart vault allowance until instantaneous settlement.</li>
                  <li><span className="material-symbols-outlined list-icon success">check_circle</span>Deterministic queue: Price-time priority enforced by immutable solidity state loops.</li>
                  <li><span className="material-symbols-outlined list-icon success">check_circle</span>100% Onchain audit: Every placement, fill, and cancel yields a verifiable transaction hash.</li>
                </ul>
                <div className="comparison-status success-status" style={{ position: 'relative', zIndex: 1 }}>
                  <span>Status: Zero Trust Required</span>
                  <a href="#" className="view-contract-link">View OrderBook.sol <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span></a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. FEATURES ── */}
        <section className="features-section" id="features">
          <div className="features-inner">
            <div className="features-header">
              <span className="eyebrow-text">Engine Architecture</span>
              <h2 className="section-title font-editorial">
                Engineered for Verifiable <span className="italic brand-gradient-text">Dominance</span>
              </h2>
              <p className="section-sub max-w-2xl">Discover why native onchain order books are the inevitable end-state of algorithmic trading.</p>
            </div>

            <div className="features-grid">
              {/* Feature 1: Large */}
              <div className="feature-card feature-large">
                <div className="feature-icon-wrap purple-icon">
                  <span className="material-symbols-outlined">list_alt</span>
                </div>
                <h3 className="feature-title">Deterministic Price-Time Priority</h3>
                <p className="feature-desc">Orders are strictly matched onchain. The highest bid and lowest ask always execute first, with identical prices processed by exact block timestamp FIFO.</p>
                <div className="feature-visual queue-visual">
                  <div className="queue-label">ONCHAIN QUEUE STACK #0x8291</div>
                  <div className="queue-item queue-item-head">
                    <span className="queue-order-id">Order #1041 (Head)</span>
                    <span className="queue-size">0.85 tYBTC @ $68,450.00</span>
                    <span className="queue-block">Block #194,001 [FIFO 1]</span>
                  </div>
                  <div className="queue-item">
                    <span className="queue-order-id">Order #1042</span>
                    <span className="queue-size dim">0.40 tYBTC @ $68,450.00</span>
                    <span className="queue-block dim">Block #194,003 [FIFO 2]</span>
                  </div>
                  <div className="queue-item queue-item-dim">
                    <span className="queue-order-id dim">Order #1043</span>
                    <span className="queue-size dim">1.10 tYBTC @ $68,449.50</span>
                    <span className="queue-block dim">Block #194,005 [FIFO 3]</span>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="feature-card feature-medium">
                <div className="feature-icon-wrap cyan-icon">
                  <span className="material-symbols-outlined">hub</span>
                </div>
                <h3 className="feature-title">Single-Block Atomic Settlement</h3>
                <p className="feature-desc">No clearing houses or credit risk. The moment an order finds a match, token contracts swap balances immediately.</p>
                <div className="feature-visual swap-visual">
                  <div className="swap-side buy-side">BUY 0.50 tYBTC</div>
                  <div className="swap-center">
                    <span className="material-symbols-outlined swap-icon">swap_horiz</span>
                  </div>
                  <div className="swap-side sell-side">SELL 0.50 tYBTC</div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="feature-card feature-small">
                <div className="feature-icon-wrap pink-icon">
                  <span className="material-symbols-outlined">percent</span>
                </div>
                <h3 className="feature-title">Partial Fills & Instant Refunds</h3>
                <p className="feature-desc">Unfilled liquidity remains resting onchain or cancels instantly with zero locked funds.</p>
                <div className="feature-visual fill-visual">
                  <div className="fill-row">
                    <span className="fill-label">Fill Status</span>
                    <span className="fill-value">65% Filled</span>
                  </div>
                  <div className="fill-bar-track">
                    <div className="fill-bar-fill" style={{ width: '65%' }} />
                  </div>
                  <span className="fill-sub">Resting balance cancelable at 0 gas cost</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="feature-card feature-small">
                <div className="feature-icon-wrap purple-icon">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <h3 className="feature-title">Transparent 0.10% Flat Fee</h3>
                <p className="feature-desc">No hidden spreads, PFOF, or variable tier tricks. Fixed onchain fee structure.</p>
                <div className="feature-visual fee-visual">
                  <div className="fee-row">
                    <span className="material-symbols-outlined fee-icon">toll</span>
                    <span className="fee-label">Contract Fee</span>
                  </div>
                  <span className="fee-value">0.10%</span>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="feature-card feature-small">
                <div className="feature-icon-wrap cyan-icon">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <h3 className="feature-title">Permanent Ledger Proofs</h3>
                <p className="feature-desc">Every tick emits onchain event logs. Plug into any indexer or block explorer for 100% complete transaction auditing.</p>
                <div className="feature-visual receipt-visual">
                  <div className="receipt-row">
                    <span className="receipt-key">Tx Hash:</span>
                    <span className="receipt-val cyan-val">0x7f9a...3c21</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-key">Status:</span>
                    <span className="receipt-val success-val">Success (2 sec ago)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. HOW IT WORKS ── */}
        <section className="how-section" id="how-it-works">
          <div className="how-inner">
            <div className="how-header">
              <div>
                <span className="eyebrow-text">Workflow Telemetry</span>
                <h2 className="section-title font-editorial">
                  How YOLOfi Works in <span className="italic brand-gradient-text">6 Steps</span>
                </h2>
              </div>
              <p className="how-sub">Seamless EVM contract lifecycle from signature to settlement without third-party custodians.</p>
            </div>

            <div className="steps-grid">
              {[
                { n: '01', title: 'Connect Wallet', desc: 'Link MetaMask, Coinbase Wallet, or Rabby on Base Sepolia.' },
                { n: '02', title: 'Deposit Tokens', desc: 'Approve vault allowance using standard ERC-20 Permit2 mechanics.' },
                { n: '03', title: 'Place Order', desc: 'Submit signed Limit or Market trade tickets straight to the EVM.' },
                { n: '04', title: 'Match Onchain', desc: 'Smart contract iterates the linked list queue to execute crossings.' },
                { n: '05', title: 'Settle Atomically', desc: 'Tokens transfer in real time into respective user balance positions.' },
                { n: '06', title: 'View Ledger', desc: 'Verify order status, balance, and transaction hash on BaseScan.' },
              ].map((step) => (
                <div key={step.n} className="step-card">
                  <span className="step-number font-editorial">{step.n}</span>
                  <span className="step-title">{step.title}</span>
                  <p className="step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. GET STARTED ── */}
        <section className="get-started-section">
          <div className="get-started-inner">
            <div className="get-started-header">
              <div>
                <span className="eyebrow-text">Quick Start Pipeline</span>
                <h2 className="section-title font-editorial">
                  Get Started in <span className="italic brand-gradient-text">3 Minutes</span>
                </h2>
              </div>
              <div className="testnet-notice">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--secondary)' }}>info</span>
                <span>Runs on Base Sepolia public testnet. No real funds needed.</span>
              </div>
            </div>

            <div className="get-started-cards">
              {[
                {
                  n: 1, title: 'Connect MetaMask',
                  desc: 'Switch your network to Base Sepolia testnet in one automated click.',
                  btn: 'Connect Wallet', icon: 'link',
                },
                {
                  n: 2, title: 'Claim Testnet Tokens',
                  desc: 'Use our built-in faucet to get free tYBTC and tUSDC to trade with.',
                  btn: 'Open Faucet', icon: 'faucet',
                },
                {
                  n: 3, title: 'Place Your First Order',
                  desc: 'Choose a market, set your limit price and size, then hit Place Order.',
                  btn: 'Launch App', icon: 'arrow_forward',
                },
              ].map((card) => (
                <div key={card.n} className="gs-card">
                  <div>
                    <span className="gs-num">{card.n}</span>
                    <h3 className="gs-title">{card.title}</h3>
                    <p className="gs-desc">{card.desc}</p>
                  </div>
                  <button className="gs-btn" onClick={onLaunchApp}>
                    <span>{card.btn}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{card.icon}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. ONCHAIN ARCHITECTURE ── */}
        <section className="architecture-section" id="architecture">
          <div className="architecture-inner">
            <div className="architecture-heading">
              <span className="eyebrow-text">Full Stack Topography</span>
              <h2 className="section-title font-editorial">
                Under the Hood <span className="italic brand-gradient-text">Architecture</span>
              </h2>
              <p className="section-sub">No centralized matching backend. Orders and settlement are handled by open, verifiable EVM contracts.</p>
            </div>
            <div className="architecture-card">
              <div className="architecture-flow">
                <div className="architecture-node">
                  <span className="material-symbols-outlined architecture-icon">devices</span>
                  <strong>React Client</strong>
                  <span>Wallet &amp; user interface</span>
                </div>
                <span className="architecture-connector">viem ⇄</span>
                <div className="architecture-node contract-node">
                  <span className="material-symbols-outlined architecture-icon">account_tree</span>
                  <strong>OrderBook.sol</strong>
                  <span>Solidity matching engine</span>
                </div>
                <span className="architecture-connector">Base L2 ⇄</span>
                <div className="architecture-node">
                  <span className="material-symbols-outlined architecture-icon">database</span>
                  <strong>Base Sepolia</strong>
                  <span>Onchain state &amp; events</span>
                </div>
              </div>
              <div className="architecture-ledger">
                <span className="material-symbols-outlined">verified</span>
                <span>Orders, fills, and token balances are verifiable from contract state and transaction logs.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. WHO IT'S FOR ── */}
        <section className="audience-section">
          <div className="audience-inner">
            <div className="architecture-heading">
              <span className="eyebrow-text">Ecosystem Profiles</span>
              <h2 className="section-title font-editorial">
                Built for Every <span className="italic brand-gradient-text">Participant</span>
              </h2>
            </div>
            <div className="audience-grid">
              {[
                { icon: 'candlestick_chart', name: 'Retail Traders', text: 'Place and manage limit orders with transparent price-time priority.', tag: 'Self-Custodial' },
                { icon: 'query_stats', name: 'Algo & Quant Desks', text: 'Read public market state and interact with the order book through direct RPC calls.', tag: 'Direct EVM Access' },
                { icon: 'water', name: 'Market Makers', text: 'Provide liquidity with resting orders and cancel them whenever needed.', tag: 'Onchain Liquidity' },
                { icon: 'code', name: 'Web3 Developers', text: 'Build on an open Solidity order book and verifiable event stream.', tag: 'Composable Contracts' },
              ].map((profile) => (
                <article className="audience-card" key={profile.name}>
                  <span className="material-symbols-outlined audience-icon">{profile.icon}</span>
                  <h3>{profile.name}</h3>
                  <p>{profile.text}</p>
                  <span className="audience-tag">{profile.tag}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. ROADMAP ── */}
        <section className="roadmap-section">
          <div className="roadmap-inner">
            <div className="architecture-heading">
              <span className="eyebrow-text">Protocol Trajectory</span>
              <h2 className="section-title font-editorial">
                Roadmap &amp; <span className="italic brand-gradient-text">Deployments</span>
              </h2>
            </div>
            <div className="roadmap-grid">
              {[
                { period: 'Q1 2026', status: 'Live now', title: 'Testnet Trading', text: 'Base Sepolia order book, tYBTC/tUSDC market, and test-token faucet.' },
                { period: 'Q2 2026', status: 'Upcoming', title: 'Protocol Hardening', text: 'Testing, UX improvements, and independent security review before any production deployment.' },
                { period: 'Q3 2026', status: 'Planned', title: 'Market Expansion', text: 'Explore additional markets after contract and liquidity requirements are met.' },
                { period: 'Future', status: 'Research', title: 'Composable Access', text: 'Investigate developer tooling and integrations based on community feedback.' },
              ].map((milestone, index) => (
                <article className={`roadmap-card${index === 0 ? ' roadmap-current' : ''}`} key={milestone.period}>
                  <div className="roadmap-meta">
                    <span>{milestone.period}</span>
                    <span className="roadmap-status">{milestone.status}</span>
                  </div>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 11. FAQ ── */}
        <section className="faq-section" id="faq">
          <div className="faq-inner">
            <div className="faq-header">
              <span className="eyebrow-text">Need Answers?</span>
              <h2 className="section-title font-editorial">
                Frequently Asked <span className="italic brand-gradient-text">Questions</span>
              </h2>
            </div>
            <div className="faq-grid">
              {[
                {
                  q: 'Is YOLOfi safe to use?',
                  a: 'YOLOfi runs entirely in smart contracts on Base Sepolia testnet. All logic is open-source and auditable on-chain. No intermediary holds your funds — your tokens remain under your wallet control via ERC-20 allowances until atomic settlement occurs.',
                },
                {
                  q: 'What is a CLOB DEX?',
                  a: 'A Central Limit Order Book (CLOB) DEX is an exchange where buyers and sellers post limit orders at specific prices. Unlike AMMs, the matching engine processes these orders in strict price-time priority — giving you the best available price on every trade.',
                },
                {
                  q: 'How do I get testnet tokens?',
                  a: 'Connect your wallet and use the built-in faucet in the trading terminal. You\'ll receive free tYBTC and tUSDC tokens for testing. No real funds are required to trade on Base Sepolia.',
                },
                {
                  q: 'What wallets are supported?',
                  a: 'Any EIP-1193 compatible browser wallet works: MetaMask, Coinbase Wallet, Rabby, and more. Simply connect and switch to Base Sepolia testnet.',
                },
                {
                  q: 'What are the trading fees?',
                  a: 'YOLOfi charges a flat 0.10% taker fee on all fills. This fee is hardcoded in the smart contract and is completely transparent — no hidden spreads, no PFOF, no variable tier tricks.',
                },
                {
                  q: 'Can I cancel my orders?',
                  a: 'Yes. Any resting limit order can be cancelled at any time with zero penalty. Unfilled portions of partially-filled orders can also be cancelled instantly, with locked tokens returned to your wallet immediately.',
                },
              ].map((faq, i) => (
                <div key={i} className={`faq-card${openFaq === i ? ' faq-open' : ''}`}>
                  <button
                    className="faq-toggle"
                    type="button"
                    aria-expanded={openFaq === i}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="faq-q">{faq.q}</span>
                    <span className="material-symbols-outlined faq-chevron">expand_more</span>
                  </button>
                  {openFaq === i && <p className="faq-a" id={`faq-answer-${i}`}>{faq.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 12. CTA BANNER ── */}
        <section className="cta-banner">
          <div className="cta-glow" />
          <div className="cta-content">
            <h2 className="cta-title font-editorial">
              Ready to trade <span className="italic brand-gradient-text">without compromise?</span>
            </h2>
            <p className="cta-sub">Join the onchain trading revolution. No custodians. No opacity. No excuses.</p>
            <div className="cta-actions">
              <button className="btn-hero-primary" onClick={onLaunchApp}>
                Launch Trading App
                <span className="material-symbols-outlined btn-icon">arrow_forward</span>
              </button>
              <a href="https://sepolia.basescan.org" target="_blank" rel="noreferrer" className="btn-hero-secondary">
                <span className="material-symbols-outlined btn-icon-left">search</span>
                View on BaseScan
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <span className="landing-logo-text">YOLOfi</span>
            <span className="footer-tagline">Fully Onchain CLOB DEX · Hack in Hills '26</span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#markets">Markets</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-chain">
            <div className="network-pill sm">
              <span className="status-dot-wrapper sm">
                <span className="status-dot-ping" />
                <span className="status-dot" />
              </span>
              <span>Base Sepolia · Chain 84532</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 YOLOfi. Open-source smart contracts. Zero custodians.</p>
        </div>
      </footer>
    </div>
  )
}
