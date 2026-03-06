# Volume Sentinel - ACE Volume Limit Adjustment Workflow

A Chainlink CRE workflow that dynamically adjusts ACE (Access Control Engine) volume limits based on market news sentiment, crypto price data, and AI analysis.

## Overview

This workflow fetches real-time market data from multiple sources:
- **Finnhub API**: Market news headlines
- **CoinGecko API**: Crypto price and volume data
- **xAI Grok**: AI-powered risk analysis and recommendation engine

Based on this analysis, it generates DON-signed reports to update the ACE VolumePolicy contract on Sepolia.

## Workflow Steps

1. **Fetch News** (Finnhub): Gets latest 24h news for the token
2. **Fetch Market Data** (CoinGecko): Gets price, volume, market cap
3. **Calculate Sentiment**: Aggregates news sentiment + price movement
4. **AI Analysis** (xAI Grok): Sends data to Grok-4-1-fast-reasoning for risk assessment
5. **Decision**: Determines volume limit adjustment (increase/decrease/maintain/pause)
6. **DON Report**: Generates ECDSA-signed report
7. **Broadcast**: Sends to VolumePolicyDON contract via `writeReport`

## Configuration

### Contract Addresses (Sepolia)
- **VolumePolicyDON**: `0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33`

### API Keys (Stored in secrets.yaml)
- **Finnhub**: `YOUR_FINNHUB_API_KEY`
- **CoinGecko**: `YOUR_COINGECKO_API_KEY`
- **xAI**: `YOUR_XAI_API_KEY`

### Settings
- **Model**: `grok-4-1-fast-reasoning`
- **Default Volume Limit**: 1000 tokens
- **Min Volume Limit**: 100 tokens
- **Max Volume Limit**: 10000 tokens
- **Adjustment Threshold**: 15% (changes below this are skipped unless forced)

## Usage

### Local Simulation
```bash
cre workflow simulate volume-sentinel --target local-simulation
```

### HTTP Trigger Payload
```json
{
  "tokenSymbol": "USDA",
  "tokenAddress": "0x500D640f4fE39dAF609C6E14C83b89A68373EaFe",
  "currentLimit": "1000000000000000000000",
  "forceAdjust": false
}
```

### Fields
- `tokenSymbol`: Token symbol for news lookup
- `tokenAddress`: Contract address for volume policy
- `currentLimit`: Current volume limit in wei (optional, uses default if not provided)
- `forceAdjust`: Force adjustment even if below threshold (default: false)

## Response

### Success
```json
{
  "success": true,
  "txHash": "0x...",
  "action": "increase",
  "previousLimit": "1000",
  "newLimit": "1200",
  "changePercent": 20,
  "riskLevel": "low",
  "sentiment": {
    "overall": "bullish",
    "score": 45,
    "confidence": 0.8
  },
  "reasoning": "Positive market sentiment with strong volume...",
  "verification": {
    "newsArticles": 5,
    "sentimentScore": 45,
    "aiModel": "grok-4-1-fast-reasoning",
    "signatureVerified": true
  }
}
```

### Skipped (Below Threshold)
```json
{
  "success": true,
  "action": "maintain",
  "skipped": true,
  "currentLimit": "1000",
  "newLimit": "1050",
  "changePercent": 5,
  "reasoning": "Change below 15% threshold"
}
```

## AI Risk Levels

| Level | Condition | Action |
|-------|-----------|--------|
| **low** | Normal market | Increase/maintain limits |
| **medium** | Some volatility | Decrease limits slightly |
| **high** | Significant stress | Substantial reduction |
| **critical** | Emergency (hack, -20% drop) | Pause immediately |

## Deployment

### Production
```bash
# Set secrets first
cre secrets set --env production coingeckoApiKey=CG-...
cre secrets set --env production xaiApiKey=xai-...
cre secrets set --env production finnhubApiKey=d6k7...

# Deploy
cre workflow deploy volume-sentinel --target production
```

## Security Notes

- All API keys are stored in `secrets.yaml` and injected via CRE's confidential HTTP
- Reports are signed with ECDSA by the DON (Decentralized Oracle Network)
- Only DON-signed reports can modify the VolumePolicy contract
- The workflow runs inside a TEE (Trusted Execution Environment)

## Files

- `index.ts` - Main workflow logic
- `config.json` - Workflow configuration with contract addresses
- `secrets.yaml` - API keys (local simulation only)
- `workflow.yaml` - CRE workflow definition
- `test-workflow.ts` - Test payloads for local development
