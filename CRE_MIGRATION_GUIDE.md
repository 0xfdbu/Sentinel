# Sentinel CRE Migration Guide

## Overview

This guide documents the migration from a **simulated/placeholder CRE implementation** to using the **real Chainlink CRE SDK**.

## What Changed

### Before (Simulation)
- ❌ Fake `@chainlink/cre-sdk@^0.1.0` package (didn't exist)
- ❌ Fake `@chainlink/cre-cli` package (didn't exist)
- ❌ Custom workflow API (`new Workflow()`, `.step()`)
- ❌ Local simulation in Node.js/Express
- ❌ No actual TEE execution

### After (Real CRE)
- ✅ Real `@chainlink/cre-sdk@^1.0.9` package
- ✅ Real `cre` CLI tool
- ✅ Handler-based workflow API (`Runner`, `handler`, `CronCapability`)
- ✅ WASM compilation for TEE
- ✅ Confidential HTTP with vault secrets
- ✅ Response encryption in enclave

## Project Structure Changes

```
sentinel/
├── project.yaml                    # NEW: CRE project configuration
├── secrets.yaml                    # UPDATED: Vault secrets format
│
├── cre-workflow/                   # NEW: Real CRE workflow
│   ├── src/
│   │   └── main.ts                 # NEW: Handler-based workflow
│   ├── package.json                # NEW: Bun + real SDK
│   ├── tsconfig.json               # NEW: TypeScript config
│   ├── workflow.yaml               # NEW: Workflow targets
│   ├── config.staging.json         # NEW: Staging config
│   ├── config.production.json      # NEW: Production config
│   └── config.hackathon.json       # NEW: Hackathon config
│
├── workflow/                       # OLD: Deprecated
│   ├── sentinel-workflow.ts        # OLD: Custom API (deprecated)
│   └── ...
│
├── cre.config.ts                   # OLD: Deprecated
└── package.json                    # UPDATED: New scripts
```

## Quick Start

### 1. Install Prerequisites

```bash
# Install Bun (required for CRE)
curl -fsSL https://bun.sh/install | bash

# Install CRE CLI
curl -fsSL https://cre.chain.link/install | bash

# Verify installation
cre --version
bun --version
```

### 2. Install Dependencies

```bash
cd sentinel/cre-workflow
bun install
```

### 3. Configure Environment

```bash
# Copy and edit environment variables
cp .env.example .env

# Required variables:
# - ETHERSCAN_API_KEY
# - GROK_API_KEY
# - SENTINEL_PRIVATE_KEY
# - AES_KEY_ALL (generate with: openssl rand -hex 32)
```

### 4. Run Simulation

```bash
# Staging (local simulation)
npm run cre:simulate

# Hackathon demo (Sepolia testnet)
npm run cre:simulate:hackathon
```

### 5. Deploy to Production

```bash
# Requires CRE infrastructure access
npm run cre:deploy
```

## Key Differences

### 1. Workflow Definition

**Before (Custom API):**
```typescript
import { Workflow } from '@chainlink/cre-sdk';  // ❌ Fake

const workflow = new Workflow({...})
workflow.step('fetch_source', {
  confidentialHttp: {...}
})
```

**After (Real SDK):**
```typescript
import { 
  CronCapability, 
  ConfidentialHTTPClient,
  handler,
  Runner 
} from '@chainlink/cre-sdk';  // ✅ Real

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const client = new ConfidentialHTTPClient()
  const response = client.sendRequest(...).result()
  return result
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
```

### 2. Configuration

**Before (TypeScript config):**
```typescript
// cre.config.ts
export default defineConfig({
  networks: {...},
  secrets: {...}
})
```

**After (YAML project file):**
```yaml
# project.yaml
staging-settings:
  account:
    workflow-owner-address: "0x..."
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://...
```

### 3. Secrets Management

**Before (Environment variables):**
```bash
ETHERSCAN_API_KEY=xxx
grokApiKey=xxx
```

**After (Vault DON secrets):**
```yaml
# secrets.yaml
etherscanApiKey:
  type: string
  description: "Etherscan API key"
```

In local simulation, secrets are loaded from `.env`:
```bash
ETHERSCAN_API_KEY=xxx
GROK_API_KEY=xxx
sentinelEncryptionKey=xxx
sentinelPrivateKey=xxx
```

## Workflow Capabilities

### Confidential HTTP

Makes HTTP requests with:
- Hidden API keys (from vault)
- Encrypted responses (optional)
- TLS certificate verification

```typescript
const response = sendRequester.sendRequest({
  request: {
    url: "https://api.example.com",
    method: "GET",
    multiHeaders: {
      "X-Api-Key": { values: ["{{.myApiKey}}"] }
    }
  },
  vaultDonSecrets: [
    { key: "myApiKey", owner: config.owner }
  ],
  encryptOutput: true
}).result()
```

### Consensus Aggregation

Ensures multiple DON nodes agree on the result:

```typescript
consensusIdenticalAggregation<EncryptedResponse>()
```

### Cron Trigger

Scheduled execution:

```typescript
new CronCapability().trigger({
  schedule: "*/5 * * * *"  // Every 5 minutes
})
```

## Deployment Targets

### Staging (Local Simulation)
- No TEE required
- Uses local `.env` for secrets
- Fast iteration
- Command: `cre workflow simulate ./ --target=staging-settings`

### Production (Real TEE)
- Requires CRE infrastructure access
- Secrets from Vault DON
- WASM compilation
- Command: `cre workflow deploy ./ --target=production-settings`

### Hackathon (Sepolia)
- Pre-configured for Sepolia testnet
- Uses deployed contracts
- Command: `cre workflow simulate ./ --target=hackathon-settings`

## Troubleshooting

### "bun: command not found"
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal
```

### "cre: command not found"
```bash
# Install CRE CLI
curl -fsSL https://cre.chain.link/install | bash
# Or use npm
npm install -g @chainlink/cre-cli
```

### "Module not found"
```bash
# Install dependencies
cd cre-workflow
bun install
```

### "HTTP request failed"
- Check API keys in `.env`
- Verify `secrets.yaml` format
- Ensure running from project root

## Migration Checklist

- [ ] Install Bun runtime
- [ ] Install CRE CLI
- [ ] Run `bun install` in `cre-workflow/`
- [ ] Configure `.env` with real API keys
- [ ] Test with `npm run cre:simulate`
- [ ] Test with `npm run cre:simulate:hackathon`
- [ ] (Optional) Deploy to production with `npm run cre:deploy`

## Resources

- [Chainlink CRE Docs](https://docs.chain.link/cre)
- [CRE SDK Reference](https://docs.chain.link/cre/reference/sdk/overview-ts)
- [Demo Repository](https://github.com/smartcontractkit/conf-http-demo)
- [Video Tutorial](https://www.youtube.com/watch?v=lbojKfsM-94)

## Support

For issues with:
- **CRE SDK/CLI**: Contact Chainlink team or check [docs](https://docs.chain.link/cre)
- **Sentinel workflow**: Open an issue in this repository
