# Volume Guardian

AI-powered volume limit adjustments based on market conditions.

## How It Works

1. **Fetch market data** from Finnhub & CoinGecko
2. **Read on-chain** USDA total supply
3. **Check bank reserves**
4. **Calculate reserve ratio**
5. **xAI Grok analysis** -> Decision
6. **Update VolumePolicyDON** if threshold crossed

## Trigger

Cron (every 15 minutes)

## Execute

```bash
cd ../..
cre workflow simulate ./workflows/volume-sentinel --target local-simulation
```

### With Broadcast
```bash
cre workflow simulate ./workflows/volume-sentinel --target local-simulation --broadcast
```

## Example Output

```
=== Volume Sentinel ===
[1] Market data... BTC +5.2%, ETH +3.1%
[2] News sentiment... 12 bullish, 3 bearish
[3] Reserves... $1.8M | Supply: 1M USDA
[4] AI analysis... Decision: INCREASE
Current: 100k -> New: 120k USDA/day (+20%)
SUCCESS: Volume limit updated
```

## Market Conditions

| Condition | AI Action | Volume Change |
|-----------|-----------|---------------|
| Bullish news + price up | Increase | +20% |
| Bearish news + price down | Decrease | -20% |
| Critical (hack, -20%) | Pause | Set to 0 |
