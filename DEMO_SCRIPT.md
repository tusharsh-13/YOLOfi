# YOLOfi Demo Video Script & Checklist

## Video Target: 2-3 minutes

---

## Pre-Recording Setup

- [ ] Anvil running on `http://127.0.0.1:8545`
- [ ] Contracts deployed to Anvil
- [ ] Frontend running on `http://localhost:5173`
- [ ] MetaMask connected to Anvil (Chain ID 31337)
- [ ] Test account imported (private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)
- [ ] Screen recording software ready (OBS/Loom)
- [ ] Microphone tested
- [ ] Browser window sized to 1920x1080

---

## Demo Script (2-3 minutes)

### 0:00-0:15 - Introduction & Connect
> "This is YOLOfi - a fully onchain CLOB DEX built for Hack in Hills '26. All order matching happens onchain with price-time priority."
- [ ] Click "Connect Wallet"
- [ ] Select MetaMask
- [ ] Approve connection
- [ ] Show network indicator (Anvil - Chain 31337)

### 0:15-0:30 - Get Test Tokens (Faucet)
> "First, let's get some test tokens from the faucet."
- [ ] Click "💧 Faucet tYBTC (10k)"
- [ ] Confirm transaction in MetaMask
- [ ] Click "💧 Faucet tUSDC (10k)"
- [ ] Confirm transaction
- [ ] Show balances updating in Faucet panel

### 0:30-0:50 - Deposit to OrderBook
> "Now let's deposit tokens into the OrderBook to start trading."
- [ ] Switch to tYBTC tab in Deposit Panel
- [ ] Click "Max" to deposit all 10,000 tYBTC
- [ ] Confirm deposit transaction
- [ ] Switch to tUSDC tab
- [ ] Click "Max" to deposit all 10,000 tUSDC
- [ ] Confirm deposit transaction
- [ ] Show Free vs Locked balances updating

### 0:50-1:20 - Place Orders & Watch Matching
> "Now let's place some orders. Bob will sell 1 tYBTC at 60,000 USDC, and Alice will buy at 65,000."
- [ ] **Bob's Sell Order:**
  - [ ] Switch to SELL side
  - [ ] Price: 60,000
  - [ ] Amount: 1
  - [ ] Click "Place Sell Order"
  - [ ] Confirm transaction
  - [ ] Show OrderBookView: Ask at 60,000 with 1 tYBTC

- [ ] **Alice's Crossing Buy:**
  - [ ] Switch to BUY side
  - [ ] Price: 65,000
  - [ ] Amount: 1
  - [ ] Click "Place Buy Order"
  - [ ] Confirm transaction
  - [ ] **Watch TradeFeed:** TradeExecuted event appears!
  - [ ] **Watch OrderBookView:** Ask at 60,000 disappears
  - [ ] **Show TradeFeed:** Trade at 60,000 (maker price), price improvement!

### 1:20-1:40 - Partial Fill & Cancel
> "Let's try a partial fill. Bob sells 10 tYBTC at 60,000, Alice buys 3."
- [ ] Bob places SELL: 10 tYBTC @ 60,000
- [ ] Alice places BUY: 3 tYBTC @ 65,000
- [ ] Watch partial fill (3/10 filled)
- [ ] Show MyOrders: Bob's order shows 3/10 filled
- [ ] Bob cancels remaining 7
- [ ] Show funds returned to free balance

### 1:40-2:00 - Price Improvement & Fees
> "Notice how Alice got price improvement - she bid 65,000 but got filled at 60,000!"
- [ ] Show TradeFeed: "Price improvement refund"
- [ ] Show TradeFeed: "Fee: 600 USDC (10 bps)"
- [ ] Show MyOrders: Orders removed after fill

### 2:00-2:15 - Verifiable Events
> "All trades are verifiable onchain. Let's check Basescan."
- [ ] Open Basescan (or Anvil logs)
- [ ] Show TradeExecuted event with all parameters
- [ ] Show OrderPlaced/OrderCancelled events

### 2:15-2:30 - Withdraw & Conclusion
> "Let's withdraw our funds."
- [ ] Withdraw remaining tYBTC/tUSDC
- [ ] Show wallet balances updated
> "YOLOfi - fully onchain CLOB. All matching onchain, verifiable, atomic. Thank you!"

---

## Post-Recording Checklist

- [ ] Video length: 2-3 minutes
- [ ] Audio clear, no background noise
- [ ] All transactions visible in MetaMask
- [ ] TradeFeed updates visible in real-time
- [ ] OrderBookView updates visible
- [ ] No failed transactions
- [ ] Export at 1080p minimum
- [ ] Add captions for key actions
- [ ] Upload to YouTube/Drive
- [ ] Add description with links to repo

---

## Key Metrics to Highlight

| Metric | Value |
|--------|-------|
| Test Coverage | 76/76 tests passing |
| Gas (placeLimitOrder) | ~200k avg |
| Gas (cancelOrder) | ~63k avg |
| Max Fills/Tx | 20 (gas cap) |
| Tick Size | 0.01 USDC |
| Lot Size | 0.0001 tYBTC |
| Taker Fee | 10 bps (0.10%) |
| Price Improvement | Maker price, taker refunded |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| MetaMask not connecting | Refresh page, check Anvil running |
| Transaction failed | Check gas limit, increase if needed |
| Order not matching | Check price crossing (buy >= ask, sell <= bid) |
| Balances not updating | Click "Refresh" in DepositPanel |
| Faucet not working | Check chainId is 31337 (Anvil) |

---

## Emergency Reset

If something breaks during demo:
1. Restart Anvil: `anvil`
2. Re-deploy: `forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast`
3. Refresh frontend