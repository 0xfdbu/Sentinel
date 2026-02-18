# Sentinel CRE - Production Deployment Guide

## Overview

This guide covers deploying the Sentinel Security Oracle to Chainlink CRE's production TEE (Trusted Execution Environment) infrastructure.

## Prerequisites

### 1. CRE CLI Installation

```bash
# Install CRE CLI globally
npm install -g @chainlink/cre-cli

# Verify installation
cre version
cre whoami
```

### 2. Account Setup

1. Create account at [cre.chain.link](https://cre.chain.link)
2. Complete identity verification
3. Fund account with LINK tokens for DON operations

### 3. Environment Configuration

Create `.env` file:

```bash
# RPC Endpoints
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
MAINNET_RPC=https://ethereum-mainnet-rpc.publicnode.com
HARDHAT_RPC=http://127.0.0.1:8545

# API Keys (for local simulation only)
ETHERSCAN_API_KEY=your_etherscan_key
AES_KEY_ALL=$(openssl rand -hex 32)  # Generate fresh key

# Workflow Owner
WORKFLOW_OWNER_ADDRESS=0x89feEbA43b294425C0d7B482770eefbcc1359f8d
```

## Deployment Stages

### Stage 1: Staging (Local Simulation)

```bash
# Run staging deployment script
./scripts/deploy-cre-staging.sh

# Or manually:
cd cre-workflow
cre workflow simulate . --target=staging-settings
cre workflow deploy . --target=staging-settings
```

**Verification:**
- Workflow executes without errors
- Logs show "simulation mode"
- API responds with scan results

### Stage 2: Production TEE

```bash
# Run production deployment script
./scripts/deploy-cre-production.sh

# Or manually:
cd cre-workflow
cre workflow validate . --target=production-settings
cre workflow deploy . --target=production-settings
```

**Verification:**
- `cre workflow logs` shows "Running in TEE mode: true"
- No simulation messages in logs
- Secrets injected from Vault DON

## Vault DON Secrets Setup

### For Staging (Local)

Secrets are loaded from `.env` file automatically.

### For Production (TEE)

Upload secrets to Vault DON:

```bash
# Set Etherscan API key
cre secrets create etherscanApiKey \
  --value "$ETHERSCAN_API_KEY" \
  --env production

# Set AES encryption key
cre secrets create san_marino_aes_gcm_encryption_key \
  --value "$AES_KEY_ALL" \
  --env production

# Verify secrets
cre secrets list --env production
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SENTINEL SECURITY ORACLE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Frontend  │───▶│  CRE API    │───▶│  CRE SDK Client     │  │
│  │  (Browser)  │    │  (Node.js)  │    │  (TypeScript)       │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                               │                  │
│                                               ▼                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              CHAINLINK CRE INFRASTRUCTURE                 │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  TEE (Trusted Execution Environment)                │   │   │
│  │  │  ┌──────────────────────────────────────────────┐  │   │   │
│  │  │  │  Workflow Execution (WASM)                    │  │   │   │
│  │  │  │  ┌────────────────────────────────────────┐   │  │   │   │
│  │  │  │  │  Confidential HTTP                     │   │  │   │   │
│  │  │  │  │  ┌──────────────────────────────────┐  │   │  │   │   │
│  │  │  │  │  │  Template Injection              │  │   │  │   │   │
│  │  │  │  │  │  {{.etherscanApiKey}}            │  │   │  │   │   │
│  │  │  │  │  │  {{.san_marino_aes_gcm_key}}     │  │   │  │   │   │
│  │  │  │  │  └──────────────────────────────────┘  │   │  │   │   │
│  │  │  │  │  ┌──────────────────────────────────┐  │   │  │   │   │
│  │  │  │  │  │  AES-GCM Encryption              │  │   │  │   │   │
│  │  │  │  │  │  Response: nonce||ciphertext||tag│  │   │  │   │   │
│  │  │  │  │  └──────────────────────────────────┘  │   │  │   │   │
│  │  │  │  └────────────────────────────────────────┘   │  │   │   │
│  │  │  └──────────────────────────────────────────────┘  │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                           │                               │   │
│  │                           ▼                               │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  Vault DON (Secret Storage)                        │   │   │
│  │  │  • etherscanApiKey                                 │   │   │
│  │  │  • san_marino_aes_gcm_encryption_key               │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Security Checklist

- [ ] No hardcoded API keys in source code
- [ ] All secrets stored in Vault DON for production
- [ ] `encryptionEnabled: true` in production config
- [ ] Template-based injection using `{{.secretName}}`
- [ ] AES-256-GCM encryption enabled for responses
- [ ] Workflow owner address properly configured
- [ ] Rate limiting enabled on API
- [ ] Helmet security headers configured
- [ ] CORS properly restricted

## Monitoring

### Logs

```bash
# View workflow logs
cre workflow logs --workflow-id=<WORKFLOW_ID> --tail

# View with follow
cre workflow logs --workflow-id=<WORKFLOW_ID> --follow
```

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# SDK status
curl http://localhost:3001/api/sdk-status
```

### Metrics

Monitor these key metrics:
- Scan execution time (target: < 30s)
- TEE execution success rate (target: > 99%)
- API response time (target: < 100ms)
- Encryption/decryption failures (target: 0)

## Troubleshooting

### Issue: "Secret not found"

**Solution:**
```bash
# Verify secret exists
cre secrets list --env production

# Re-create if missing
cre secrets create <secret-name> --value <value> --env production
```

### Issue: "Config validation failed"

**Solution:**
```bash
# Test with simulation
cd cre-workflow
cre workflow simulate . --target=staging-settings --non-interactive

# Check config schema matches
```

### Issue: "TEE execution timeout"

**Solution:**
- Increase timeout in workflow configuration
- Check Etherscan API rate limits
- Verify network connectivity from TEE

## Rollback Procedure

```bash
# List deployments
cre workflow list

# Disable current workflow
cre workflow disable --workflow-id=<WORKFLOW_ID>

# Deploy previous version
cre workflow deploy . --target=production-settings
```

## Support

- CRE Documentation: https://docs.chain.link/cre
- Chainlink Discord: #cre-support channel
- Sentinel Issues: https://github.com/your-org/sentinel/issues
