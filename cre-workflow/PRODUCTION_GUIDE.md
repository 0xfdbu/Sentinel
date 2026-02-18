# Sentinel CRE Workflow - Production Implementation Guide

## 🎯 Overview

This guide documents the **production-grade implementation** of the Sentinel Security Scanner using Chainlink CRE (Chainlink Runtime Environment) with full Confidential HTTP capabilities.

## ✅ Implemented Features

### 1. Confidential HTTP with Template-Based Secrets

**Architecture Pattern:**
```typescript
// PRODUCTION: Template-based API key injection
const url = `https://api.etherscan.io/v2/api?...&apikey={{.etherscanApiKey}}`;

const response = sendRequester.sendRequest({
  request: { url, method: "GET", multiHeaders: {} },
  vaultDonSecrets: [
    { key: "etherscanApiKey", owner: config.owner },
    { key: "san_marino_aes_gcm_encryption_key", owner: config.owner },
  ],
  encryptOutput: true, // Encrypt response in TEE
}).result();
```

**Secret Management:**
- ✅ Template syntax `{{.secretName}}` (production-ready)
- ✅ Vault DON secrets configuration (`secrets.yaml`)
- ✅ AES-256-GCM response encryption support
- ⚠️  Template injection requires production TEE (simulation uses hardcoded fallback)

### 2. Enhanced Vulnerability Detection

**Expanded Detection Patterns:**
| Vulnerability | Severity | Detection Method |
|--------------|----------|------------------|
| Reentrancy (CEI violation) | CRITICAL | External call before state update |
| Unchecked low-level calls | MEDIUM | `.call{value:...}` without require |
| tx.origin authentication | HIGH | Pattern matching |
| Self-destruct | CRITICAL | Code pattern detection |
| Delegatecall injection | CRITICAL | Pattern matching |
| Inline assembly | MEDIUM | `assembly {` detection |
| Timestamp dependence | MEDIUM | `block.timestamp` usage |

**Smart Analysis Features:**
- ✅ JSON Source Code parsing (Standard JSON Input format)
- ✅ Multi-file contract support
- ✅ ReentrancyGuard import vs usage detection
- ✅ CEI (Checks-Effects-Interactions) pattern violation detection
- ✅ Confidence scoring based on code patterns

### 3. Response Encryption (Production-Ready)

```typescript
// AES-GCM encrypted response handling
interface EncryptedResponse {
  bodyBase64: string;  // nonce (12) || ciphertext || tag (16)
  encrypted: boolean;
}

// Decryption in TEE
const decryptResponse = (encryptedBase64: string, keyHex: string): string => {
  const encryptedBytes = base64ToBytes(encryptedBase64);
  const nonce = encryptedBytes.slice(0, 12);
  const ciphertextAndTag = encryptedBytes.slice(12);
  // AES-GCM decryption performed in TEE
};
```

**Configuration:**
```json
{
  "encryptOutput": true,  // Enable in production TEE
  "owner": "0x..."        // Workflow owner for secret access
}
```

### 4. Onchain Reporting (Ready for Integration)

```typescript
// Report vulnerabilities onchain via EVMClient
const reportVulnerability = async (
  runtime: Runtime,
  auditLoggerAddress: string,
  findings: ScanResult
) => {
  const evmClient = new cre.capabilities.EVMClient(chainSelector);
  const reportData = encodeVulnerabilityReport(findings);
  
  await evmClient.writeReport(runtime, {
    receiver: auditLoggerAddress,
    report: reportData,
    gasConfig: { gasLimit: '500000' }
  }).result();
};
```

### 5. Cron-Based Continuous Monitoring

```typescript
// Automated scanning every 2 minutes (configurable)
const initWorkflow = (config: SentinelConfig) => {
  return [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: config.schedule,  // "*/2 * * * *"
      }),
      onCronTrigger
    ),
  ];
};
```

**Use Cases:**
- Continuous monitoring of high-value contracts
- Automated scanning of new contract deployments
- Scheduled security audits

## 🔒 Security Architecture

### Current Implementation (Simulation Mode)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CRE Trigger   │────▶│  Confidential    │────▶│  Etherscan API  │
│                 │     │  HTTP Client     │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌─────────┴──────────┐
                    │  API Key: Hardcoded │  ⚠️ Visible in source
                    │  (Simulation only)  │
                    └─────────────────────┘
```

### Production Architecture (TEE Deployment)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CRE Trigger   │────▶│  Confidential    │────▶│  Etherscan API  │
│                 │     │  HTTP Client     │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌─────────┴──────────┐
                    │  Template Injection │  ✅ {{.etherscanApiKey}}
                    │  Vault DON Secrets  │  ✅ Never in code/logs
                    └─────────────────────┘
                               │
                    ┌─────────┴──────────┐
                    │  AES-GCM Encryption │  ✅ Response encrypted
                    │  Inside TEE         │  ✅ Only TEE can decrypt
                    └─────────────────────┘
```

## 🚀 Production Deployment Steps

### Step 1: Store Secrets in Vault DON

```bash
# Install CRE CLI
curl -fsSL https://cre.chain.link/install | bash

# Authenticate
cre login

# Create secrets in Vault DON
cre secrets create --name etherscanApiKey --value "$ETHERSCAN_API_KEY"
cre secrets create --name san_marino_aes_gcm_encryption_key --value "$AES_KEY_ALL"
cre secrets create --name sentinelPrivateKey --value "$SENTINEL_PRIVATE_KEY"
```

### Step 2: Update Workflow for Production

```typescript
// src/main.ts - Production configuration
const fetchContractSource = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: SentinelConfig,
  contractAddress: string,
  chainId: number
): EncryptedResponse => {
  // Template-based API key (injected by TEE from Vault DON)
  const url = `${config.etherscanUrl}?...&apikey={{.etherscanApiKey}}`;

  return sendRequester
    .sendRequest({
      request: { url, method: "GET", multiHeaders: {} },
      vaultDonSecrets: [
        { key: "etherscanApiKey", owner: config.owner },
        { key: "san_marino_aes_gcm_encryption_key", owner: config.owner },
      ],
      encryptOutput: true, // Enable encryption
    })
    .result();
};
```

### Step 3: Deploy to Production

```bash
# Deploy workflow to CRE infrastructure
cre workflow deploy ./cre-workflow --target=production-settings

# Verify deployment
cre workflow list
```

### Step 4: Configure Cron Schedule

```yaml
# project.yaml - Production target
production-settings:
  account:
    workflow-owner-address: "0x89feEbA43b294425C0d7B482770eefbcc1359f8d"
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://ethereum-sepolia-rpc.publicnode.com
```

## 📊 Vulnerability Detection Results

### Sample Scan: PausableVulnerableVault

```json
{
  "contractAddress": "0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C",
  "contractName": "PausableVulnerableVault",
  "overallRisk": "CRITICAL",
  "recommendedAction": "PAUSE",
  "vulnerabilities": [
    {
      "type": "REENTRANCY",
      "severity": "CRITICAL",
      "line": 499,
      "description": "ERC20 transfer before state update. CEI pattern violation. ReentrancyGuard imported but NOT used.",
      "recommendation": "Follow Checks-Effects-Interactions pattern or apply nonReentrant modifier"
    }
  ],
  "codeQuality": {
    "complexity": "MEDIUM",
    "accessControl": "GOOD",
    "reentrancyProtection": "IMPORTED_NOT_USED",
    "externalCalls": "CHECKED"
  }
}
```

## 🔍 Comparison: Before vs After

| Feature | Before (Basic) | After (Production) |
|---------|---------------|-------------------|
| **API Key** | Hardcoded only | Template + Vault DON ready |
| **Response** | Plaintext | AES-GCM encrypted |
| **Vulnerability Detection** | Basic reentrancy | 7+ pattern types |
| **Source Format** | Flattened only | JSON + Multi-file support |
| **Reentrancy Check** | Import only | Import vs Usage detection |
| **Onchain Reporting** | ❌ | ✅ Ready |
| **Cron Monitoring** | ❌ | ✅ Implemented |
| **Consensus** | Basic | Identical aggregation |

## 🛠️ Testing Commands

### Local Simulation
```bash
# Run workflow simulation
cre workflow simulate ./cre-workflow --target=hackathon-settings --non-interactive --trigger-index 0 -e .env
```

### Production Deployment
```bash
# Deploy to production TEE
cre workflow deploy ./cre-workflow --target=production-settings

# Monitor execution logs
cre workflow logs --name sentinel-security-scanner-production
```

## 📚 References

- [Chainlink CRE Documentation](https://docs.chain.link/cre/getting-started/overview)
- [Confidential HTTP Demo](https://github.com/smartcontractkit/conf-http-demo)
- [CRE SDK Examples](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples)
- [Chainlink Functions Playground](https://functions.chain.link/playground)

## ⚠️ Known Limitations

### Simulation Mode
1. **Template injection**: `{{.secretName}}` templates are NOT replaced in simulation
2. **Response encryption**: AES-GCM decryption requires production TEE
3. **Vault DON**: Secret management only works in production deployment

### Workarounds for Hackathon/Demo
1. Use hardcoded API keys with clear comments
2. Set `encryptOutput: false` in simulation
3. Document production deployment path

## 🎓 Key Takeaways

1. **Architecture is production-ready**: Template pattern, encryption, and Vault DON integration are all implemented
2. **Simulation limitations are known**: CRE `workflow simulate` doesn't inject secrets - this requires production TEE
3. **Enhanced detection**: 7+ vulnerability patterns with smart analysis (CEI, import vs usage)
4. **Onchain ready**: EVMClient integration prepared for vulnerability reporting
5. **Continuous monitoring**: Cron trigger enables automated scanning

---

**Status**: ✅ Production architecture implemented  
**Next Step**: Deploy to production TEE for full Confidential HTTP capabilities
