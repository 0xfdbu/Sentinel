# Blacklist Manager

Sync security blacklists to on-chain PolicyEngine.

## How It Works

1. **Fetch data** from 4 sources:
   - GoPlus Security API (SlowMist + ScamSniffer)
   - ScamSniffer GitHub (2,500+ addresses)
   - Sentinel Sanctions (Lazarus, Tornado Cash)
2. **Merge & deduplicate** inside CRE TEE
3. **Compute Merkle root**
4. **Update PolicyEngine** on-chain

## Trigger

Cron (daily) or HTTP trigger

## Execute

### Full Sync
```bash
cd ../..
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --trigger-index 1 --http-payload '{"action":"full-sync"}'
```

### With Broadcast
```bash
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --broadcast --trigger-index 1 --http-payload '{"action":"full-sync"}'
```

## Example Output

```
=== Blacklist Manager ===
[1] Sanctions... 27 addresses
[2] ScamSniffer... 2530 addresses (GitHub Data Fetch)
[3] Merging... 2559 unique
[4] Demo limit: 2559 -> 10
[5] Merkle root: 0xabc...
[6] Broadcasting...
SUCCESS: Blacklist updated
```

## Demo Mode

Limited to 10 addresses per batch for gas efficiency.
