# Chainlink CRE Confidential HTTP Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SENTINEL SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────────────┐      │
│   │   Frontend   │─────▶│  API Server  │─────▶│   CRE Workflow       │      │
│   │  (React)     │◀─────│   (Node.js)  │◀─────│   (TEE - WASM)       │      │
│   └──────────────┘      └──────────────┘      └──────────────────────┘      │
│                                │                         │                    │
│                                │                         ▼                    │
│                                │              ┌──────────────────────┐      │
│                                │              │  Confidential HTTP   │      │
│                                │              │  - API keys injected │      │
│                                │              │  - Never in logs     │      │
│                                │              │  - Never in mempool  │      │
│                                │              └──────────────────────┘      │
│                                │                         │                    │
│                                ▼                         ▼                    │
│                       ┌──────────────┐          ┌──────────────┐             │
│                       │  Etherscan   │          │     XAI      │             │
│                       │     API      │          │     API      │             │
│                       └──────────────┘          └──────────────┘             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Two Modes of Operation

### 1. SIMULATION Mode (Default for Hackathon)

In this mode, the API server makes **direct API calls**. The API key is in the `.env` file.

**Use case**: Development, testing, hackathon demos

```bash
# Run in simulation mode
npm run api
# or
CRE_MODE=SIMULATION npm run api
```

### 2. CRE Mode (Production)

In this mode, the API server calls the **CRE workflow running in TEE**. The API key is stored in Chainlink's Vault DON and injected at runtime.

**Use case**: Production, maximum security

```bash
# Run with CRE (requires deployed workflow)
CRE_MODE=CRE npm run api
```

## Why Confidential HTTP Matters

### Without Confidential HTTP (Public API Call)
```
API Server ──▶ XAI API
     │
     ▼
Logs: "Authorization: Bearer xai-..."
     │
     ▼
Mempool: Transaction data visible
     │
     ▼
⚠️ Attacker can steal API key!
```

### With Confidential HTTP (TEE)
```
API Server ──▶ CRE Workflow (TEE) ──▶ XAI API
                      │
                      ▼
              Vault DON injects key
                      │
              ┌───────┴───────┐
              ▼               ▼
         API key NEVER    Response encrypted
         leaves TEE       with TEE key
```

## API Key Security Comparison

| Aspect | Direct API Call | Confidential HTTP (CRE) |
|--------|----------------|------------------------|
| Key storage | `.env` file | Chainlink Vault DON |
| Key in logs | ❌ Yes | ✅ Never |
| Key in memory | ❌ Yes | ✅ Only in TEE |
| Network visibility | ❌ Visible | ✅ Encrypted |
| Audit trail | ❌ None | ✅ On-chain proofs |

## Configuration

### SIMULATION Mode (Current)

```bash
# api-server/.env
CRE_MODE=SIMULATION
ETHERSCAN_API_KEY=your_etherscan_api_key_here
XAI_API_KEY=your_xai_api_key_here
```

### CRE Mode (Production)

```bash
# 1. Store key in Vault DON
cre secrets create etherscanApiKey --value "your_key" --env production
cre secrets create xaiApiKey --value "your_key" --env production

# 2. Deploy workflow
cd cre-workflow
cre workflow deploy . --target=production-settings

# 3. Run API server in CRE mode
CRE_MODE=CRE CRE_ENDPOINT=<workflow-url> npm run api
```

## Workflow File

The CRE workflow is in `../cre-workflow/sentinel-scanner.ts`:

- Uses `HTTPCapability` for HTTP trigger
- Uses `HTTPClient` for confidential API calls
- `runtime.config.xaiApiKey` - injected from Vault DON
- Runs in WASM sandbox inside TEE

## API Response Indicator

The API now returns the current mode:

```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "creMode": "SIMULATION",
    "confidentialHttp": false,
    "teeEnabled": false
  }
}
```

## Switching Modes

```bash
# Terminal 1: Start in SIMULATION mode (default)
cd ~/Desktop/Chainlink/sentinel/api-server
npm start

# Terminal 1: Or start in CRE mode (requires deployed workflow)
CRE_MODE=CRE npm start

# Terminal 2: Start frontend
cd ~/Desktop/Chainlink/sentinel
npm run frontend
```

## Production Deployment

For production, you would:

1. Deploy the CRE workflow:
   ```bash
   cd cre-workflow
   cre workflow deploy . --target=production-settings
   ```

2. Store secrets in Vault DON:
   ```bash
   cre secrets create etherscanApiKey --value "..."
   cre secrets create xaiApiKey --value "..."
   ```

3. Run API server in CRE mode with the workflow endpoint.

## Current Status

For the hackathon demo, we're running in **SIMULATION mode** which:
- ✅ Works immediately without CRE setup
- ✅ Uses your provided API keys
- ✅ Returns real XAI analysis results
- ⚠️ API key is in environment (acceptable for demo)

The CRE workflow code (`sentinel-scanner.ts`) is production-ready and can be deployed to Chainlink CRE when ready.
