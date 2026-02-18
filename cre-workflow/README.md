# Sentinel CRE Workflow

This directory contains the **real Chainlink CRE workflow** for the Sentinel Security Oracle.

## Overview

This workflow uses the official `@chainlink/cre-sdk` to:
1. **Confidential HTTP**: Fetch contract source from Etherscan (API key hidden)
2. **Confidential HTTP**: Analyze with xAI Grok (API key hidden)
3. **Risk Evaluation**: Determine action (PAUSE/ALERT/WARN/LOG)
4. **Encrypted Output**: Results encrypted in the TEE before output

## Quick Start

### Prerequisites

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install CRE CLI
curl -fsSL https://cre.chain.link/install | bash
```

### Install

```bash
cd cre-workflow
bun install
```

### Configure

```bash
# From project root
cp .env.example .env
# Edit .env with your API keys
```

### Run

```bash
# Staging simulation (local)
cre workflow simulate ./ --target=staging-settings

# Hackathon demo (Sepolia)
cre workflow simulate ./ --target=hackathon-settings

# Production deployment (requires access)
cre workflow deploy ./ --target=production-settings
```

## Project Structure

```
cre-workflow/
├── src/
│   └── main.ts              # Workflow entry point
├── package.json             # Dependencies (@chainlink/cre-sdk)
├── tsconfig.json            # TypeScript configuration
├── workflow.yaml            # Workflow targets (staging/production)
├── config.staging.json      # Staging configuration
├── config.production.json   # Production configuration
└── config.hackathon.json    # Hackathon demo configuration
```

## Workflow Architecture

```
Cron Trigger (every 2-5 minutes)
    ↓
ConfidentialHTTPClient
    ├─→ Fetch contract source (Etherscan API key hidden)
    ├─→ AI security analysis (xAI Grok API key hidden)
    ↓
Risk Evaluation
    ↓
Consensus Aggregation
    ↓
Encrypted Result Output
```

## Configuration

### Staging (Local Simulation)

Uses:
- Hardhat local network (chainId: 31337)
- `.env` file for secrets
- No TEE required

### Hackathon (Sepolia Testnet)

Uses:
- Sepolia testnet (chainId: 11155111)
- Real deployed contracts
- 2-minute cron schedule

### Production (Mainnet)

Uses:
- Ethereum mainnet
- Real TEE execution
- Vault DON for secrets

## Secrets

Secrets are defined in `../secrets.yaml` and resolved from the Vault DON.

For local simulation, secrets are loaded from `.env`:

| Secret | Environment Variable | Description |
|--------|---------------------|-------------|
| `etherscanApiKey` | `ETHERSCAN_API_KEY` | Etherscan API access |
| `grokApiKey` | `GROK_API_KEY` | xAI Grok API access |
| `sentinelEncryptionKey` | `AES_KEY_ALL` | Output encryption |
| `sentinelPrivateKey` | `SENTINEL_PRIVATE_KEY` | Transaction signing |

## Output Decryption

When `encryptOutput: true`, the response is encrypted with AES-256-GCM:

```
Format: nonce (12 bytes) || ciphertext || tag (16 bytes)
```

To decrypt:
1. Extract nonce (first 12 bytes)
2. Extract ciphertext+tag (remaining bytes)
3. Decrypt with `AES_KEY_ALL` using AES-256-GCM

## Development

### Build

```bash
bun run build
```

### Watch Mode

```bash
bun run dev
```

### Test

```bash
# Staging
npm run cre:simulate

# Hackathon
npm run cre:simulate:hackathon
```

## Deployment

### Requirements

- Access to Chainlink CRE infrastructure
- Workflow owner address configured
- Secrets uploaded to Vault DON

### Commands

```bash
# Deploy to production
cre workflow deploy ./ --target=production-settings

# Deploy hackathon demo
cre workflow deploy ./ --target=hackathon-settings
```

## Resources

- [Chainlink CRE Docs](https://docs.chain.link/cre)
- [CRE SDK Reference](https://docs.chain.link/cre/reference/sdk/overview-ts)
- [Confidential HTTP Demo](https://github.com/smartcontractkit/conf-http-demo)
