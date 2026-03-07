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

## Test Results

### Latest Execution

**Transaction Hash:** `0x4958dee48ab99209285b557bf5fd8f7c63e61075139f279028e945a8aa611167`

- **Auto-pause triggered** due to low reserves detected
- **Bank reserves:** $1,400 (below $1M threshold)
- **DON-signed report** broadcast to EmergencyGuardian
- **AI-powered decision** from xAI Grok
- **Zero mock data** - all API calls are real

### API Endpoints Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Bank Reserve API** | First Plaidypus Bank API | USD reserves check |
| **xAI Grok** | `api.x.ai/v1/chat/completions` | AI analysis & pause decision |

### Test Commands

```bash
# Simulation only (no broadcast)
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --http-payload '{"action":"pause","target":"0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1","metadata":{"fraudScore":85,"riskFactors":["Large transfer","Suspicious pattern"]}}'

# With on-chain broadcast (real transaction)
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --broadcast --http-payload '{"action":"pause","target":"0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1","metadata":{"fraudScore":85}}'
```

## Recent Executions

| Date | Trigger | Reserves | Decision | Tx Hash | Status |
|------|---------|----------|----------|---------|--------|
| 2026-03-07 | Low Reserves | $1,400 | PAUSE | [0x4958...](https://sepolia.etherscan.io/tx/0x4958dee48ab99209285b557bf5fd8f7c63e61075139f279028e945a8aa611167) | ✅ Success |

## Use Case

Protects reserves and token vaults by acting before hacks complete.
