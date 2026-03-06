# Volume Sentinel - Testing Guide

## Prerequisites

1. **CRE CLI installed** and configured
2. **Node.js** 18+ with npm
3. **Sentinel Node** running (for scheduled triggers)

## Setup

```bash
cd sentinel/workflows/volume-sentinel

# Install dependencies
npm install

# Or use the global CRE SDK
```

## Test Steps

### 1. Local Simulation (No Broadcast)

```bash
# Test without broadcasting to blockchain
cre workflow simulate volume-sentinel --target local-simulation
```

Expected output:
- ✅ Fetches news from Finnhub
- ✅ Fetches crypto data from CoinGecko
- ✅ Calculates sentiment
- ✅ Analyzes with xAI Grok
- ✅ Returns recommendation (increase/decrease/maintain/pause)

### 2. Broadcast Test (With Blockchain Write)

```bash
# Test with actual broadcast to VolumePolicyDON
./test-broadcast.sh

# Or manually:
cre workflow simulate volume-sentinel --target local-simulation --broadcast
```

This will:
1. Generate a DON-signed report (ECDSA)
2. Call `writeReport()` on VolumePolicyDON
3. Emit `DailyLimitUpdated` event

### 3. Verify on Blockchain

```bash
# Check current daily volume limit
cast call 0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33 \
  "dailyVolumeLimit()(uint256)" \
  --rpc-url https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH

# Check if report was used
cast call 0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33 \
  "usedReports(bytes32)(bool)" \
  <REPORT_HASH> \
  --rpc-url https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH
```

### 4. HTTP Trigger Test

```bash
# Trigger via API (requires sentinel-node running)
curl -X POST http://localhost:9001/workflows/volume-sentinel/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "forceAdjust": true,
    "currentLimit": "1000000000000000000000"
  }'
```

### 5. Scheduled Trigger (15 minutes)

The sentinel node automatically triggers this workflow every 15 minutes:

```bash
# Check scheduler status
curl http://localhost:9001/workflows/volume-sentinel/status
```

Response:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "intervalMinutes": 15,
    "workflowPath": "workflows/volume-sentinel",
    "contract": {
      "volumePolicy": "0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33",
      "token": "0x500D640f4fE39dAF609C6E14C83b89A68373EaFe"
    }
  }
}
```

## Expected Behaviors

### Market Conditions → Actions

| Condition | Sentiment | AI Action | Volume Change |
|-----------|-----------|-----------|---------------|
| Bullish news + price up | Positive | Increase | +20% |
| Bearish news + price down | Negative | Decrease | -20% |
| Neutral/sideways | Neutral | Maintain | No change |
| Critical (hack, -20% drop) | Very Negative | Pause | Set to 0 |

### Threshold Logic

- Default threshold: **15%**
- Changes below 15% are skipped (unless `forceAdjust: true`)
- Changes above 15% trigger blockchain transaction

## Debugging

### Check Logs

```bash
# Sentinel node logs (in another terminal)
npm run dev

# Look for:
# 🔄 [Volume Sentinel] Triggering workflow...
# ✅ Workflow completed
```

### Manual Workflow Run

```bash
# From sentinel root
cd workflows/volume-sentinel

# Edit config.json to use hardcoded values (no secrets.yaml)
# Then run:
cre workflow simulate volume-sentinel --target local-simulation --broadcast
```

### Common Issues

1. **"workflow not found"**
   - Ensure workflow files are in `sentinel/workflows/volume-sentinel/`
   - Check `workflow.yaml` has correct paths

2. **"API key invalid"**
   - Verify secrets.yaml has correct keys
   - For production, set via: `cre secrets set --env production ...`

3. **"writeReport failed"**
   - Check VolumePolicyDON has DON_SIGNER_ROLE set
   - Verify sender has permission

4. **"Report already used"**
   - Each report hash must be unique
   - Check `usedReports` mapping on contract

## Production Deployment

```bash
# 1. Set secrets
cre secrets set --env production finnhubApiKey=d6k7...
cre secrets set --env production coingeckoApiKey=CG-YPMU3n...
cre secrets set --env production xaiApiKey=xai-0fZC...

# 2. Deploy workflow
cre workflow deploy volume-sentinel --target production

# 3. Start sentinel node with scheduler
WORKFLOW_SCHEDULER_ENABLED=true npm start
```

## Monitoring

Monitor the VolumePolicyDON events:

```solidity
event DailyLimitUpdated(uint256 newLimit, string reason, bytes32 reportHash);
event ReportProcessed(bytes32 indexed reportHash, uint8 instruction);
```

Use Etherscan or Tenderly to watch these events.
