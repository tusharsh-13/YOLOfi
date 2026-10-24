# Trade Flow Walkthrough

## Scenario: Alice Buys tYBTC from Bob

### Initial Setup

**Alice** wants to buy tYBTC using tUSDC.
**Bob** wants to sell tYBTC for tUSDC.

| User | tYBTC (18 dec) | tUSDC (6 dec) |
|------|----------------|---------------|
| Alice | 100 | 10,000,000 |
| Bob | 50 | 5,000,000 |

### Step 1: Deposit

Both users deposit tokens into the OrderBook.

**Alice deposits:**
- 10 tYBTC (10 * 10¹⁸ = 10,000,000,000,000,000,000)
- 1,000,000 tUSDC (1,000,000 * 10⁶ = 1,000,000,000,000)

**Bob deposits:**
- 20 tYBTC
- 500,000 tUSDC

**Internal ledger after deposits:**

| User | baseFree | baseLocked | quoteFree | quoteLocked |
|------|----------|------------|-----------|-------------|
| Alice | 10e18 | 0 | 1,000,000e6 | 0 |
| Bob | 20e18 | 0 | 500,000e6 | 0 |

Contract token balances:
- tYBTC: 30 * 10¹⁸
- tUSDC: 1,500,000 * 10⁶

---

### Step 2: Bob Places Sell Order

**Bob places a SELL limit order:**
- Side: SELL (1)
- Price: 60,000 USDC per tYBTC
  - Contract price = 60,000 * 10⁴ = 600,000,000
- Amount: 1 tYBTC = 1 * 10¹⁸ = 1,000,000,000,000,000,000 base units
- Max fills: 20
- Hint price: 0 (start from best)

**Validation:**
- Price % tickSize = 600,000,000 % 10,000 = 0 ✓
- Amount % lotSize = 1e18 % 1e14 = 0 ✓
- Amount >= minOrderSize ✓
- Bob has 20 tYBTC free → sufficient

**Lock funds:**
- Bob's baseLocked += 1e18 (1 tYBTC locked)
- Bob's baseFree = 19e18 (19 tYBTC free)

**Order placed:**
- Order ID: 1
- Owner: Bob
- Side: SELL
- Price: 600,000,000
- Amount: 1,000,000,000,000,000,000
- Filled: 0

**Order book after:**
- Best Ask: 600,000,000 (1 tYBTC at 60,000 USDC)

---

### Step 3: Alice Places Buy Order (Crosses)

**Alice places a BUY limit order:**
- Side: BUY (0)
- Price: 65,000 USDC per tYBTC
  - Contract price = 65,000 * 10⁴ = 650,000,000
- Amount: 1 tYBTC = 1e18 base units
- Max fills: 20
- Hint price: 0

**Validation:**
- Price % tickSize = 650,000,000 % 10,000 = 0 ✓
- Amount % lotSize = 1e18 % 1e14 = 0 ✓
- Amount >= minOrderSize ✓

**Calculate quote amount needed:**
```
quoteAmount = amount * price / 1e18
          = 1e18 * 650,000,000 / 1e18
          = 650,000,000 (650,000 USDC in 6 decimals)
```

**Calculate max fee:**
```
maxFee = quoteAmount * feeBps / 10000
      = 650,000,000 * 10 / 10000
      = 650,000 (650 USDC)
```

**Total locked:**
```
totalLocked = quoteAmount + maxFee
           = 650,000,000 + 650,000
           = 650,650,000
```

**Alice has 1,000,000,000,000 tUSDC free → sufficient**

**Lock funds:**
- Alice's quoteLocked += 650,650,000
- Alice's quoteFree = 1,000,000,000,000 - 650,650,000 = 999,349,350,000

---

### Step 4: Matching Engine Executes Trade

**Matching loop starts:**
- Taker: Alice (BUY at 65,000)
- Maker: Bob (SELL at 60,000)
- Price crosses: 65,000 >= 60,000 ✓

**Match at MAKER's price (Bob's 60,000):**
- Fill amount: min(1 tYBTC, 1 tYBTC) = 1 tYBTC = 1e18

**Calculate trade values:**
```
quoteAmount = fillAmount * makerPrice / 1e18
           = 1e18 * 600,000,000 / 1e18
           = 600,000,000 (600,000 USDC)

fee = quoteAmount * feeBps / 10000
   = 600,000,000 * 10 / 10000
   = 600,000 (600 USDC)
```

**Settlement (internal ledger updates):**

**Alice (BUY taker):**
- baseFree += 1e18 (receives 1 tYBTC)
- quoteLocked -= (quoteAmount + fee) = 600,000,000 + 600,000 = 600,600,000

**Bob (SELL maker):**
- quoteFree += 600,000,000 (receives 600,000 USDC)
- baseLocked -= 1e18 (releases 1 tYBTC)

**Fee collection:**
- feeBalance += 600,000

**Price improvement refund to Alice:**
- Alice locked at 65,000, trade executed at 60,000
- Notional improvement = 1e18 * (650,000,000 - 600,000,000) / 1e18 = 50,000,000
- Fee on improvement = 50,000,000 * 10 / 10000 = 50,000
- Total refund = 50,000,000 + 50,000 = 50,050,000

**Refund applied:**
- Alice's quoteLocked -= 50,050,000
- Alice's quoteFree += 50,050,000

**Order updates:**
- Bob's order (ID 1): filled = 1e18 (fully filled, removed from book)
- Alice's order: filled = 1e18 (fully filled, not rested)

---

### Step 5: Final State

**Internal ledger:**

| User | baseFree | baseLocked | quoteFree | quoteLocked |
|------|----------|------------|-----------|-------------|
| Alice | 11e18 | 0 | 999,399,400,000 | 0 |
| Bob | 19e18 | 0 | 500,600,000,000 | 0 |

**Contract balances:**
- tYBTC: 30 * 10¹⁸ (unchanged)
- tUSDC: 1,500,000 * 10⁶ (unchanged)

**Fee balance:** 600,000 (600 USDC)

---

### Events Emitted

```solidity
// OrderPlaced (Bob's sell)
OrderPlaced(1, Bob, SELL, 600000000, 1000000000000000000)

// OrderPlaced (Alice's buy)
OrderPlaced(2, Alice, BUY, 650000000, 1000000000000000000)

// TradeExecuted
TradeExecuted(
  makerOrderId: 1,      // Bob's order
  takerOrderId: 2,      // Alice's order
  maker: Bob,           // Bob
  taker: Alice,         // Alice
  price: 600000000,     // 60,000 USDC per tYBTC
  amount: 1000000000000000000, // 1 tYBTC
  fee: 600000,          // 600 USDC
  timestamp: 1700000000
)

// FeeCollected
FeeCollected(600000)

// OrderCancelled (Bob's order fully filled - removed from book)
OrderCancelled(1, Bob, 0)

// OrderCancelled (Alice's order fully filled - not rested)
OrderCancelled(2, Alice, 0)
```

---

### Post-Trade Withdrawal

**Alice withdraws 1 tYBTC:**
- baseFree: 11e18 - 1e18 = 10e18
- Contract tYBTC balance: 30e18 - 1e18 = 29e18
- Alice wallet: 100 - 11 + 1 = 90 tYBTC

**Bob withdraws 600,000 tUSDC:**
- quoteFree: 500,600,000,000 - 600,000 = 500,000,000,000
- Contract tUSDC balance: 1,500,000,000,000 - 600,000 = 1,499,400,000,000
- Bob wallet: 500,000,000,000 + 600,000 = 500,600,000

### Key Takeaways

1. **Atomic settlement**: Trade and ledger updates happen in same transaction
2. **Price improvement**: Alice paid 60,000 not 65,000; refunded 50,050,000
3. **Fee collection**: 600,000 USDC (10 bps) collected from taker (Alice)
4. **Atomic execution**: All ledger updates in single transaction - no partial state
5. **Verifiable**: All events onchain, queryable by anyone