# ETH Reserve Mint (eth-por-unified)

Mint USDA stablecoins backed by ETH collateral with 5-source validation.

## How It Works

1. **User deposits ETH** to SentinelVault
2. **Vault emits** ETHDeposited event
3. **CRE workflow triggers** and fetches (exactly 5 HTTP calls):
   - **Coinbase + Binance** prices (2-source median)
   - **GoPlus** security check (multi-source aggregation)
   - **Bank API** reserves for PoR
   - **xAI Grok** final review
4. **DON-signed report** mints USDA via MintingConsumer

> **HTTP Budget (5 calls):** Simulation has 5 HTTP call limit. Production DON has unlimited.
> - **Active in sim:** Coinbase, Binance, GoPlus, Bank API, xAI
> - **Skipped in sim:** Kraken, ScamSniffer, OFAC Sanctions

## Trigger

EVM Log: ETHDeposited event from 0x12fe97b889158380e1D94b69718F89E521b38c11

## Execute

### Simulation (no mint)
```bash
cd ../..
cre workflow simulate ./workflows/eth-por-unified --target local-simulation \
  --evm-tx-hash TX_HASH --evm-event-index 0
```

### With Broadcast (actually mints)
```bash
cre workflow simulate ./workflows/eth-por-unified --target local-simulation \
  --broadcast --evm-tx-hash TX_HASH --evm-event-index 0
```

## Example

```bash
# Deposit 0.001 ETH first
cast send 0x12fe97b889158380e1D94b69718F89E521b38c11 \
  "depositETH()" --value 0.001ether --rpc-url $SEPOLIA_RPC \
  --private-key $CRE_ETH_PRIVATE_KEY

# Then trigger workflow with the tx hash
```

## Example Output

```
=== ETH + PoR Unified ===
User: 0x9Eb..., ETH: 0.001
Chainlink price: $1973.95
[1] Coinbase... CB: $1972 ✓ (HTTP #1)
[2] Binance... BN: $1972 ✓ (HTTP #2)
   [SKIP] Kraken (HTTP limit - prod only)
Median=$1972, Dev=1bps, USDA=1.97179
[3] GoPlus... Low Risk ✓ (HTTP #3)
   [SKIP] ScamSniffer (HTTP limit - prod only)
   [SKIP] Sanctions (HTTP limit - prod only)
[4] Bank reserves... $1800.21 ✓ (HTTP #4)
[5] LLM Review... APPROVED (Risk: low, 95%) ✓ (HTTP #5)
SUCCESS: 0x0fab... - 1.97179 USDA minted
```

## Test Results

### Latest Execution

**Transaction Hash:** `0xab06808be7434ebedba2b1bf09acbc425818b524d6d9452525c745b9cfb9f713`

- **Minted:** 0.033013 USDA
- **ETH Price:** $1967.78 (3-source median)
- **User deposit:** 0.001 ETH
- **DON-signed report** broadcast to MintingConsumer
- **5 HTTP calls (max):** Coinbase, Binance, GoPlus, Bank API, xAI
- **Skipped in sim (budget):** Kraken, ScamSniffer, OFAC Sanctions
- **Zero mock data** - all API calls are real

### API Endpoints Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Coinbase** | `api.coinbase.com/v2/exchange-rates?currency=ETH` | ETH/USD price |
| **Binance** | `api.binance.com/api/v3/ticker/price?symbol=ETHUSDT` | ETH/USD price |
| **GoPlus** | `api.gopluslabs.io/api/v1/address_security/{address}` | Beneficiary security check |
| **ScamSniffer** | `raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/all.json` | Blacklist check |
| **Bank API** | First Plaidypus Bank API | USD reserves for PoR |
| **xAI Grok** | `api.x.ai/v1/chat/completions` | Final approval |

### Test Commands

```bash
# First, deposit ETH to vault
cast send 0x12fe97b889158380e1D94b69718F89E521b38c11 \
  "depositETH()" --value 0.001ether --rpc-url $SEPOLIA_RPC \
  --private-key $CRE_ETH_PRIVATE_KEY

# Simulation only (no mint)
cre workflow simulate ./workflows/eth-por-unified --target local-simulation \
  --evm-tx-hash TX_HASH --evm-event-index 0

# With on-chain broadcast (actually mints USDA)
cre workflow simulate ./workflows/eth-por-unified --target local-simulation \
  --broadcast --evm-tx-hash TX_HASH --evm-event-index 0
```

## Recent Executions

| Date | ETH Deposit | Price | Minted USDA | Tx Hash | Status |
|------|-------------|-------|-------------|---------|--------|
| 2026-03-07 | 0.001 ETH | $1967.78 | 0.033013 | [0xab06...](https://sepolia.etherscan.io/tx/0xab06808be7434ebedba2b1bf09acbc425818b524d6d9452525c745b9cfb9f713) | ✅ Success |
