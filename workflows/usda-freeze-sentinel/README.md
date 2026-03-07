# Scam Freeze Sentinel

Real-time freeze protection for USDA transfers.

## How It Works

1. **USDA Transfer event** emitted
2. **CRE workflow triggers** on EVM Log
3. **Multi-source security check:**
   - GoPlus API (SlowMist, ScamSniffer, sanctions)
   - ScamSniffer GitHub blacklist
4. **xAI Grok risk assessment**
5. **Decision:** FREEZE or MONITOR
6. **DON-signed report** to Freezer contract

## Trigger

EVM Log: USDA Transfer event

## Execute

```bash
cd ../..
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation \
  --evm-tx-hash TX_HASH --evm-event-index 0
```

### With Broadcast
```bash
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation \
  --broadcast --evm-tx-hash TX_HASH --evm-event-index 0
```

## Example Output

```
=== Scam Freeze Sentinel ===
Transfer: 0xUserA -> 0xSuspiciousAddress
Amount: 5,000 USDA
[1] GoPlus... HIGH_RISK (phishing address)
[2] ScamSniffer... FOUND in blacklist
[3] AI assessment... Risk: 95/100
Decision: FREEZE
SUCCESS: Address FROZEN
```

## Security Sources

- SlowMist database
- ScamSniffer aggregation
- Criminal sanctions
- Phishing detection
