# YOLOfi - Fully Onchain CLOB DEX

## Project Context
Hackathon: Hack in Hills '26
Problem: "Onchain Finance & Trading: build a fully onchain financial product that leverages fast blockchain settlement to create transparent trading markets without centralized offchain infrastructure."

## Core Design Decisions

### 1. Internal Ledger
- Users deposit tokens into OrderBook and trade against internal balances
- Per user: `baseFree`, `baseLocked`, `quoteFree`, `quoteLocked`
- Only deposit/withdraw move real ERC-20s (SafeERC20 + nonReentrant)
- Matching and settlement only mutate storage → atomic by construction

### 2. Price/Amount Units
- **Price**: quote smallest-units per 1e18 base units
- **Amount**: base smallest-units
- Require `price % tickSize == 0` and `amount % lotSize == 0`
- Constructor requires `(tickSize * lotSize) % 1e18 == 0` so `quoteAmount = amount * price / 1e18` is exact
- Default mocks: tYBTC 18 decimals, tUSDC 6 decimals
- `lotSize = 1e14` (0.0001 base), `tickSize = 1e4` (0.01 quote)
- `minOrderSize` configurable

### 3. Order Storage
- Each order: `id`, `owner`, `side`, `price`, `amount`, `filled`, `prev`, `next`
- Each price level: FIFO doubly linked list (`head`, `tail`, `totalRemaining`)
- Active price levels per side: sorted doubly linked list with `bestBid` / `bestAsk` pointer
- `placeLimitOrder` takes optional `hintPrice` (existing level near insertion, 0 = start from best)

### 4. Matching
- Price-time priority
- Trade at MAKER's price (buyers get price-improvement refunds)
- Support partial fills for both maker and taker
- Matching loop bounded by `maxFills` arg (hard cap constant, e.g. 20)
- Leftover amount rests in book unless market/IOC order → unfilled funds unlocked

### 5. Self-Trade
- Revert with `SelfTrade()` if taker would match own resting order

### 6. Fees
- Taker fee in basis points (default 10 = 0.10%, max 100)
- Charged in quote token, accrued to `feeBalance` withdrawable by owner
- Makers pay no fee
- Buys lock notional + max possible taker fee up front; refund unused after matching
- Emit `FeeCollected`
- Fee accounting exact, covered by invariants

### 7. Cancel
- Owner-only, unlinks order, removes empty price levels, unlocks remaining funds

### 8. Market Orders (Phase 3 stretch)
- `placeMarketOrder(side, amount, maxFills)` = IOC at extreme price, never rests

### 9. Security
- Checks-effects-interactions everywhere
- `nonReentrant` on deposit/withdraw (and any function touching external tokens)
- No `tx.origin`, no unbounded loops, no external calls inside matching

## Events (Verifiable History)
- `Deposited(user, token, amount)`
- `Withdrawn(user, token, amount)`
- `OrderPlaced(orderId, owner, side, price, amount)`
- `OrderCancelled(orderId, owner, remaining)`
- `TradeExecuted(makerOrderId, takerOrderId, maker, taker, price, amount, fee, timestamp)`
- `FeeCollected(amount)`
- Index useful fields (`orderId`, `owner`) for frontend filtering

## View Functions
- `getTopLevels(side, n)` → `(prices[], totals[])`
- `getOrder(id)`
- `getUserOrders(user)` (open orders)
- `getSpread()` → `(bestBid, bestAsk)`
- `getBalances(user)`
- Public getters for `tickSize`, `lotSize`, `takerFeeBps`, `base`, `quote`

## Tech Stack
- **Contracts**: Solidity ^0.8.24, Foundry, OpenZeppelin 5.x (ERC20, ReentrancyGuard, SafeERC20)
- **Frontend**: React + TypeScript + Vite + viem (NO wagmi, NO ethers)
- **Wallet**: MetaMask via `window.ethereum` with viem custom transport
- **Styling**: Plain CSS or small CSS file, no heavy UI libraries
- **Chain**: Local Anvil for dev; Base Sepolia (chain id 84532, RPC https://sepolia.base.org) for public deployment
- **Config**: Chain config swappable via env
- **Backend**: None. All reads via viem public client and contract events

## Repo Structure
```
yolofi/
├── CLAUDE.md
├── contracts/
│   ├── foundry.toml
│   ├── src/
│   │   ├── OrderBook.sol
│   │   ├── MockERC20.sol
│   │   └── interfaces/IOrderBook.sol
│   ├── test/
│   │   ├── OrderBook.t.sol
│   │   ├── Matching.t.sol
│   │   └── Invariant.t.sol
│   └── script/Deploy.s.sol
├── frontend/
│   └── src/
│       ├── lib/{chain.ts,abi.ts,contracts.ts,format.ts}
│       ├── hooks/{useWallet.ts,useBook.ts,useBalances.ts,useTrades.ts}
│       └── components/{WalletButton,Faucet,DepositPanel,OrderForm,OrderBookView,MyOrders,TradeFeed}.tsx
├── docs/{architecture.md,flow.md}
└── README.md
```

## Phases
- **Phase 0**: Setup (CLAUDE.md, Foundry, OpenZeppelin, Vite, git)
- **Phase 1**: Tokens + Ledger (MockERC20, IOrderBook, OrderBook skeleton)
- **Phase 2**: Orders without Matching (storage, placeLimitOrder, cancel, views)
- **Phase 3**: Matching, Fees, maxFills (matching loop, events, fuzz/invariant tests)
- **Phase 4**: Deploy (Deploy.s.sol, Base Sepolia, verify)
- **Phase 5**: Frontend Core (lib, wallet, faucet, deposit)
- **Phase 6**: Frontend Trading (order form, book view, trades, my orders)
- **Phase 7**: Polish & Submission (README, docs, demo video)

## Common Commands

### Contracts (from `contracts/` directory)
```bash
# Build
forge build

# Test
forge test
forge test --gas-report
forge test -vvv  # verbose

# Fuzz/Invariant
forge test --fuzz-runs 256
forge test --invariant-runs 256 --invariant-depth 50

# Format
forge fmt

# Coverage
forge coverage

# Deploy to Anvil
anvil  # in separate terminal
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify -vvvv

# Generate ABIs for frontend
forge build && jq '.abi' out/OrderBook.sol/OrderBook.json > ../frontend/src/lib/abi/OrderBook.json
```

### Frontend (from `frontend/` directory)
```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

### Git
```bash
git init
git add .
git commit -m "feat: initial project setup"
```

## Environment Variables
### Contracts (`.env` in `contracts/`)
```
PRIVATE_KEY=your_deployer_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=your_basescan_api_key
```

### Frontend (`.env` in `frontend/`)
```
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org
VITE_ORDERBOOK_ADDRESS=deployed_contract_address
VITE_TYBTC_ADDRESS=deployed_token_address
VITE_TUSDC_ADDRESS=deployed_token_address
```

## Known Limitations (for README)
- MEV/front-running in public mempool
- Single market (one pair)
- Bounded matching (maxFills cap)
- No audit
- Mock tokens only
- Gas costs may be high on L1

## Roadmap
- Batch auctions for MEV resistance
- Multiple markets
- Perpetuals/derivatives
- AI market analysis (TinyFish integration)
- Mobile support
- Formal verification