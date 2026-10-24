# YOLOfi - Fully Onchain CLOB DEX

> **Hack in Hills '26** - Onchain Finance & Trading Track

A fully onchain central limit order book (CLOB) DEX for the tYBTC/tUSDC trading pair. All order matching, settlement, and fee collection happens atomically onchain - no centralized matching engine, no offchain infrastructure.

## Problem Statement

> "Onchain Finance & Trading: build a fully onchain financial product that leverages fast blockchain settlement to create transparent trading markets without centralized offchain infrastructure."

Traditional DEXs (AMMs like Uniswap) suffer from:
- Impermanent loss for liquidity providers
- Slippage on large orders
- MEV extraction from sandwich attacks
- No price-time priority (fair ordering)

Centralized limit order books (CLOBs) like Binance/Bybit:
- Require trust in centralized matching engine
- Opaque order matching (no verifiable execution)
- Custodial risk (exchange holds user funds)
- Single point of failure

## Solution: YOLOfi

YOLOfi is a **fully onchain CLOB** where:
- Orders are placed, matched, and settled atomically onchain
- Price-time priority enforced by smart contract logic
- All execution is verifiable via onchain events
- Users retain custody until trade execution (internal ledger)
- No centralized matching engine - the blockchain IS the matching engine

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      YOLOfi Architecture                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite + viem)                             │
│  ├─ Wallet Connection (MetaMask)                            │
│  ├─ OrderBookView (real-time bids/asks via events)          │
│  ├─ OrderForm (place/cancel limit orders)                   │
│  ├─ TradeFeed (live trade history)                          │
│  └─ MyOrders (manage open orders)                           │
├─────────────────────────────────────────────────────────────┤
│  Smart Contract (OrderBook.sol)                             │
│  ├─ Internal Ledger (baseFree, baseLocked, quoteFree,      │
│  │   quoteLocked per user)                                   │
│  ├─ Order Storage (FIFO queues per price level)             │
│  ├─ Price Level Management (sorted linked lists)            │
│  ├─ Matching Engine (price-time priority, partial fills)    │
│  ├─ Fee Collection (taker fee in quote, accrued to owner)   │
│  └─ Events (Deposited, OrderPlaced, TradeExecuted, etc.)    │
├─────────────────────────────────────────────────────────────┤
│  Base Sepolia (Chain ID: 84532)                             │
│  ├─ tYBTC (18 decimals) - Base token                        │
│  └─ tUSDC (6 decimals) - Quote token                        │
└─────────────────────────────────────────────────────────────┘
```

### Core Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Internal Ledger** | Atomic settlement - only deposit/withdraw touch ERC20s; matching only mutates storage |
| **Price = quote units per 1e18 base** | Exact math: `quoteAmount = amount * price / 1e18` with no rounding when `(tickSize * lotSize) % 1e18 == 0` |
| **Tick Size = 10,000 (0.01 USDC)** | Prevents dust spam; price must be multiple of tick |
| **Lot Size = 100,000,000,000,000 (0.0001 tYBTC)** | Minimum order granularity; prevents dust orders |
| **FIFO per price level** | Fair time priority within same price |
| **Max 20 fills per transaction** | Gas limit protection; large orders rest in book |
| **Maker price + price improvement** | Takers get better price; refunded the difference |
| **Taker fee (10 bps) in quote** | Only takers pay; makers pay 0; fee accrues to owner |

### Gas Report (from `forge test --gas-report`)

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| placeLimitOrder | 22,020 | 202,867 | 239,340 | 263,049 | 46 |
| cancelOrder | 23,908 | 63,396 | 75,138 | 86,066 | 8 |
| deposit | 27,018 | 77,525 | 86,512 | 86,541 | 17 |
| withdraw | 27,458 | 42,730 | 50,718 | 50,764 | 11 |
| getTopLevels | 5,778 | 14,758 | 14,828 | 20,397 | 10 |
| getUserOrders | 3,165 | 6,540 | 7,215 | 8,565 | 4 |

## Deployed Contracts (Base Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| tYBTC | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | [Basescan](https://sepolia.basescan.org/address/0x5FbDB2315678afecb367f032d93F642f64180aa3) |
| tUSDC | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | [Basescan](https://sepolia.basescan.org/address/0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512) |
| OrderBook | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | [Basescan](https://sepolia.basescan.org/address/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0) |

> **Note**: These are Anvil local deployment addresses. For Base Sepolia deployment, run the deploy script with `--rpc-url https://sepolia.base.org --broadcast --verify`.

## Quick Start

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- [Node.js 20+](https://nodejs.org/) with `npm`
- [MetaMask](https://metamask.io/) browser extension

### Smart Contract Development

```bash
# Install Foundry dependencies
cd contracts
forge install

# Run tests (76 tests passing)
forge test

# Run with gas report
forge test --gas-report

# Run invariant tests
forge test --invariant-runs 256 --invariant-depth 50

# Format code
forge fmt

# Start local Anvil
anvil

# Deploy to local Anvil (in separate terminal)
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Deploy to Base Sepolia
export PRIVATE_KEY=<your_private_key>
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
export ETHERSCAN_API_KEY=<your_basescan_key>
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
```

### Frontend Development

```bash
cd frontend
npm install

# Sync ABIs from contracts (run after contract changes)
npm run abi

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Running the Full Stack Locally

1. **Terminal 1** - Start Anvil:
   ```bash
   anvil
   ```

2. **Terminal 2** - Deploy contracts:
   ```bash
   cd contracts
   export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
   ```

3. **Terminal 3** - Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Open** `http://localhost:5173` in browser
5. **Connect MetaMask** to Anvil (Chain ID 31337, RPC http://127.0.0.1:8545)
6. **Import Anvil account** (private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)
7. **Use Faucet** to mint tYBTC/tUSDC
8. **Deposit** tokens to OrderBook
9. **Place orders** and watch matching!

## Gas Optimizations

- **Storage packing**: Packed bools and smaller integers where possible
- **Linked lists**: O(1) order insertion/removal at price levels
- **Sorted price levels**: Linked list with hint price for O(log n) insertion
- **Max fills cap**: Prevents unbounded gas consumption
- **Storage over memory**: Used storage for order book (cheaper than calldata for large structures)

## Known Limitations

| Limitation | Mitigation / Roadmap |
|------------|---------------------|
| **MEV/front-running** in public mempool | Batch auctions for MEV resistance (roadmap) |
| **Single market** (one pair) | Multiple markets support (roadmap) |
| **Bounded matching** (max 20 fills/tx) | Large orders rest in book; user must re-submit |
| **No formal audit** | Audit before production use |
| **Mock tokens only** | Real tokens for production deployment |
| **Gas costs on L1** | Optimized for L2/Base; L1 gas may be high |

## Roadmap

- [ ] **Batch Auctions** - MEV-resistant frequent batch auctions
- [ ] **Multiple Markets** - Dynamic market creation factory
- [ ] **Perpetuals/Derivatives** - Funding rates, liquidation engine
- [ ] **AI Market Analysis** - TinyFish integration for market signals
- [ ] **Mobile Support** - PWA with offline-first caching
- [ ] **Formal Verification** - Certora/KeVM proofs for critical invariants

## Project Structure

```
yolofi/
├── contracts/                 # Foundry smart contracts
│   ├── src/
│   │   ├── OrderBook.sol      # Core CLOB logic
│   │   ├── MockERC20.sol      # Test tokens
│   │   └── interfaces/        # Solidity interfaces
│   ├── test/
│   │   ├── OrderBook.t.sol    # Unit tests
│   │   ├── Matching.t.sol     # Matching engine tests
│   │   └── Invariant.t.sol    # Invariant/fuzz tests
│   ├── script/Deploy.s.sol    # Deployment script
│   └── foundry.toml
├── frontend/                  # React + Vite + viem frontend
│   ├── src/
│   │   ├── lib/               # Utilities (chain, abi, contracts, format)
│   │   ├── hooks/             # React hooks (useWallet, useBook, useBalances, useTrades)
│   │   ├── components/        # React components
│   │   │   ├── WalletButton.tsx
│   │   │   ├── Faucet.tsx
      │   │   ├── DepositPanel.tsx
      │   │   ├── OrderForm.tsx
      │   │   ├── OrderBookView.tsx
      │   │   ├── MyOrders.tsx
      │   │   └── TradeFeed.tsx
      │   ├── App.tsx
      │   └── App.css
      └── sync-abis.mjs         # ABI sync script
├── docs/
│   ├── architecture.md        # Architecture diagram
│   └── flow.md               # Trade flow walkthrough
└── README.md
```

## Demo Video Checklist

- [ ] Connect MetaMask to Anvil/Base Sepolia
- [ ] Use Faucet to mint 10 tYBTC + 10,000 tUSDC
- [ ] Deposit 5 tYBTC + 5,000 tUSDC to OrderBook
- [ ] Place BUY order: 0.1 tYBTC @ 60,000 USDC
- [ ] Place SELL order: 0.05 tYBTC @ 59,000 USDC (crosses)
- [ ] Observe TradeExecuted event in TradeFeed
- [ ] Show OrderBookView with updated bids/asks
- [ ] Show MyOrders with partial fill
  - Cancel remaining order
  - Verify funds returned to free balance
- [ ] Show TradeFeed with live updates
- [ ] Demonstrate price improvement refund
  - Place buy at 65,000, existing sell at 60,000
  - Show buyer gets 60,000 price + refund of 5,000 difference

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Foundry** - Smart contract development framework
- **viem** - TypeScript Ethereum library
- **OpenZeppelin** - Secure contract primitives
- **Base** - L2 for fast, cheap transactions
- **OpenZeppelin Contracts v5** - Secure ERC20, ReentrancyGuard
- **Hack in Hills '26** - Hackathon organizers

---

**Built for Hack in Hills '26** - *Onchain Finance & Trading Track*

> *"The blockchain IS the matching engine."*