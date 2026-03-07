# Sentinel Guard

Autonomous security guard triggered by Sentinel Node.

## How It Works

1. **Sentinel Node detects threat** (fraudScore >= 70)
2. **HTTP trigger** to CRE workflow
3. **Check bank reserves** (auto-pause if <$1M)
4. **xAI Grok analyzes** threat metadata
5. **Decision:** PAUSE (score >= 80) or MONITOR
6. **DON-signed report** -> Emergency pause

## Trigger

HTTP from Sentinel Node

## Execute

### Simulation
```bash
cd ../..
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --http-payload '{
    "action": "pause",
    "target": "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
    "metadata": {
      "fraudScore": 85,
      "riskFactors": ["Large transfer", "Suspicious pattern"],
      "suspiciousTx": "0xabc..."
    }
  }'
```

### With Broadcast
```bash
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --broadcast --http-payload '{"action":"pause","target":"0xD196..."}'
```

## Example Output

```
=== Pause with DON ===
Alert from Sentinel Node
Fraud Score: 85
Risk Factors: Large transfer, Suspicious pattern
[1.5] Bank reserves... $1,800,000
[2] xAI Analysis... PAUSE (Confidence: 92%)
[3] DON attestation...
[4] Broadcasting...
SUCCESS: Contract PAUSED
```

## Use Case

Protects reserves and token vaults by acting before hacks complete.
