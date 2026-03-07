# ETH Reserve Mint (eth-por-unified)

Mint USDA stablecoins backed by ETH collateral with 5-source validation.

## How It Works

1. **User deposits ETH** to SentinelVault
2. **Vault emits** ETHDeposited event
3. **CRE workflow triggers** and fetches:
   - Coinbase, Kraken, Binance prices (3-source median)
   - ScamSniffer blacklist (2,530 addresses)
   - First Plaidypus Bank reserves
4. **xAI Grok** final approval
5. **DON-signed report** mints USDA via MintingConsumer

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
[1] Coinbase... CB: $1972
[2] Kraken... KR: $1972
[3] Binance... BN: $1972
Median=$1972, Dev=1bps, USDA=1.97179
[4] ScamSniffer... Clean (2530 addresses)
[5] Bank reserves... $1800.21
[6] LLM Review... APPROVED (Risk: low, 95%)
SUCCESS: 0x0fab... - 1.97179 USDA minted
```
