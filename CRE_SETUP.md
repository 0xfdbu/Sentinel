# Chainlink CRE Setup Guide

This guide explains how the Sentinel project uses **actual Chainlink CRE** (not mocked) for confidential security scanning.

## What Changed

### Before (API Keys Exposed)
```
Browser → Direct xAI API call (API key visible in DevTools) ❌
```

### After (Chainlink CRE)
```
Browser → CRE API Backend → Chainlink CRE → xAI API (API key in TEE) ✅
```

## Architecture

```
┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Frontend   │──────▶│  CRE API        │──────▶│  Chainlink CRE   │
│  (Browser)  │ HTTP  │  (Node.js)      │  CLI  │  (TEE)           │
└─────────────┘      └─────────────────┘      └──────────────────┘
                                                          │
                    API Keys NEVER exposed to browser     │
                    All live in CRE secrets.yaml          ▼
                                                   ┌──────────────┐
                                                   │ xAI Grok API │
                                                   └──────────────┘
```

## File Structure

```
sentinel/
├── workflow/
│   ├── sentinel-workflow.ts      # CRE workflow definition
│   └── secrets.yaml              # API keys (NEVER exposed to browser)
│
├── services/cre-api/             # NEW: Backend API server
│   ├── src/
│   │   ├── index.ts              # Express server
│   │   └── workflow-simulator.ts # Local CRE simulation
│   └── package.json
│
├── frontend/src/hooks/
│   └── useScannerCRE.ts          # NEW: Uses backend API
│
└── scripts/
    └── start-cre-stack.sh        # One-command launcher
```

## Quick Start

### 1. Install Dependencies
```bash
cd sentinel
npm run setup
```

### 2. Configure Environment
```bash
# Already configured in .env:
# - ETHERSCAN_API_KEY
# - GROK_API_KEY
# - SENTINEL_PRIVATE_KEY
```

### 3. Start the Full Stack
```bash
npm run cre:stack
```

This starts:
- Hardhat node (localhost:8545)
- CRE API backend (localhost:3001)
- Frontend (localhost:3000)

### 4. Test the Flow
1. Open http://localhost:3000
2. Register a contract
3. Click "Scan" - this now goes through CRE!

## How It Works

### 1. Frontend Request
```typescript
// useScannerCRE.ts - NO API KEYS!
const response = await fetch('http://localhost:3001/api/scan', {
  method: 'POST',
  body: JSON.stringify({ contractAddress, chainId })
})
```

### 2. Backend Processing
```typescript
// services/cre-api/src/index.ts
app.post('/api/scan', async (req, res) => {
  // Triggers CRE workflow
  const result = await triggerCREWorkflow(contractAddress, chainId)
  res.json(result)
})
```

### 3. CRE Workflow Execution
```typescript
// workflow/sentinel-workflow.ts
sentinelWorkflow
  .step('fetch_source', {
    confidentialHttp: {
      url: 'https://api.etherscan.io/v2/api',
      query: { apikey: '{{secrets.etherscanApiKey}}' } // Hidden!
    }
  })
  .step('ai_security_analysis', {
    llm: {
      provider: 'xai',
      apiKey: '{{secrets.grokApiKey}}', // Hidden!
      model: 'grok-4-1-fast-reasoning'
    }
  })
```

## API Key Security

| Location | Etherscan Key | Grok Key | Private Key |
|----------|---------------|----------|-------------|
| `.env` | ✅ | ✅ | ✅ |
| `secrets.yaml` | ✅ | ✅ | ✅ |
| Browser | ❌ | ❌ | ❌ |
| Frontend Code | ❌ | ❌ | ❌ |

**All API keys are server-side only.**

## Development vs Production

### Development Mode
```bash
# Uses local simulation
CRE_SIMULATE=true
npm run cre:stack
```
- No TEE required
- API calls still server-side
- Fast iteration

### Production Mode
```bash
# Uses actual Chainlink CRE infrastructure
CRE_SIMULATE=false
npm run cre:deploy
npm run cre:api:start
```
- Runs in Chainlink TEE
- Full confidentiality
- Production deployment

## Testing

### Test the API
```bash
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"contractAddress": "0x...", "chainId": 31337}'
```

### Check Health
```bash
curl http://localhost:3001/health
```

## Troubleshooting

### "CRE API not responding"
```bash
# Check if API is running
curl http://localhost:3001/health

# Check logs
tail -f /tmp/cre-api.log
```

### "API key errors"
```bash
# Verify keys are set
echo $ETHERSCAN_API_KEY
echo $GROK_API_KEY

# Test xAI API directly
curl -H "Authorization: Bearer $GROK_API_KEY" \
  https://api.x.ai/v1/models
```

### "Contracts not deployed"
```bash
# Deploy first
cd contracts
npx hardhat run scripts/deploy.js --network hardhat
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run cre:stack` | Start full stack with CRE |
| `npm run cre:api:dev` | Start API backend only |
| `npm run cre:simulate` | Run CRE workflow simulation |
| `npm run cre:deploy` | Deploy workflow to CRE infrastructure |
| `npm run frontend` | Start frontend only |
| `npm run chain` | Start Hardhat node only |

## Next Steps

1. **Get xAI API Key**: https://x.ai/api
2. **Get Etherscan API Key**: https://etherscan.io/apis
3. **Run**: `npm run cre:stack`
4. **Test**: Register and scan a contract

Your API keys are now protected by Chainlink CRE's Confidential HTTP and Compute!
