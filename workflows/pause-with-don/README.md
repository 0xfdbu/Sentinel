# Sentinel Guard

Autonomous security guard triggered by Sentinel Node when high fraud score detected.

## How It Works

1. **Sentinel Node monitors** blockchain for suspicious transactions (flash loans, etc.)
2. **Threshold triggered** (fraudScore >= 70) → HTTP trigger to CRE workflow
3. **Investigation phase**:
   - GoPlus API: Check from/to addresses for honeypot, blacklist, mintable
   - Proof of Reserve: Validate bank reserves (auto-pause if <$1M)
4. **xAI Grok analyzes** ALL evidence and makes PAUSE/MONITOR decision
5. **DON-signed report** → Broadcast to EmergencyGuardianDON

## Key Design

- **No scoring in workflow** - Sentinel Node does initial scoring
- **Pure investigation** - GoPlus, PoR provide data
- **xAI decides** - Based on all evidence, not just scores
- **Automatic broadcast** - enable_broadcast: true by default

## Trigger

HTTP from Sentinel Node with:
```json
{
  "action": "pause",
  "target": "0xFA93de331FCd870D83C21A0275d8b3E7aA883F45",
  "broadcast": true,
  "metadata": {
    "fraudScore": 85,
    "riskFactors": ["Flash loan pattern", "Suspicious transfer"],
    "suspiciousTx": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "10000"
  }
}
```

## Test Commands

### Simulation (no broadcast)
```bash
cd ../..
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --http-payload '{
    "action": "pause",
    "target": "0xFA93de331FCd870D83C21A0275d8b3E7aA883F45",
    "metadata": {
      "fraudScore": 85,
      "riskFactors": ["Flash loan pattern", "Suspicious transfer"],
      "suspiciousTx": "0xabc123...",
      "from": "0x123...",
      "to": "0x456...",
      "value": "10000"
    }
  }'
```

### With Broadcast
```bash
cd ../..
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --broadcast \
  --http-payload '{
    "action": "pause",
    "target": "0xFA93de331FCd870D83C21A0275d8b3E7aA883F45",
    "broadcast": true,
    "metadata": {
      "fraudScore": 85,
      "riskFactors": ["Flash loan pattern"],
      "suspiciousTx": "0xabc...",
      "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "to": "0x8ba1f109551bD432803012645Hac136c9821CB",
      "value": "50000"
    }
  }'
```

## Example Output

```
=== Pause with DON (Sentinel Node Alert) ===
[1] Alert received from Sentinel Node
    Fraud Score: 85
    Risk Factors: Flash loan pattern, Suspicious transfer
    Target: 0xFA93de331FCd870D83C21A0275d8b3E7aA883F45

[1.5] Checking Proof of Reserve via HTTP...
   ✓ Bank reserves: $1,800,000 USD
   ✓ Reserve ratio: 1.80x

[1.6] Checking GoPlus security for 0x742d35...
   ✓ GoPlus risk score: 45/100
   Risk factors: Honeypot detected, Proxy contract
[1.6] Checking GoPlus security for 0x8ba1f1...
   ✓ GoPlus risk score: 20/100
   Risk factors: Mintable token

[2] xAI Investigation starting...
   Evidence: Sentinel alert + GoPlus investigation + PoR status
   ✓ AI Decision: PAUSE
   ✓ Confidence: 92%
   Reasoning: High-value flash loan pattern with honeypot recipient risk

🚨 AI confirms PAUSE is warranted
    Confidence: 92%

[3] Generating DON-signed pause report...
   ✓ Report hash: 0xabc123...

[4] Creating DON attestation...
   ✓ Report signed: 1 signatures

[5] Broadcasting to EmergencyGuardianDON...
   ✓ PAUSE EXECUTED!
   Tx Hash: 0xdef789...

✅ WORKFLOW COMPLETE
```

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **EmergencyGuardianDON** | [`0x777403644f2eE19f887FBB129674a93dCEEda7d4`](https://sepolia.etherscan.io/address/0x777403644f2eE19f887FBB129674a93dCEEda7d4) | Receives pause commands (IReceiver) |
| **Target (USDA)** | [`0xFA93de331FCd870D83C21A0275d8b3E7aA883F45`](https://sepolia.etherscan.io/address/0xFA93de331FCd870D83C21A0275d8b3E7aA883F45) | Contract to pause |
| **Chainlink Forwarder** | [`0x15fC6ae953E024d975e77382eEeC56A9101f9F88`](https://sepolia.etherscan.io/address/0x15fC6ae953E024d975e77382eEeC56A9101f9F88) | DON report delivery |
