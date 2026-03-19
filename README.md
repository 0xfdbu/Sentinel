# Sentinel — AI-Powered AML & Compliance Oracle for DeFi

AI-powered security monitoring with Chainlink CRE (Chainlink Runtime Environment), DON-signed execution, and automated threat response.

📺 **Watch the Demo Video:** [Sentinel in Action — Chainlink CRE + xAI + DON](https://www.youtube.com/watch?v=5lQOgGIujrw)

---

## ⚠️ IMPORTANT CLARIFICATIONS

### 1. NO CONFIDENTIAL HTTP IS CURRENTLY USED IN THIS DEMO

Previous documentation incorrectly mentioned "Confidential HTTP" - this was a **TYPO/ERROR**.

**What We Actually Use:**
- ✅ **Regular HTTPClient** with secrets stored in `secrets.yaml` files
- ✅ Secrets are hardcoded in config files (acceptable for testnet/demo only)
- ❌ **NO Vault DON integration**
- ❌ **NO ConfidentialHTTPClient** (instantiated but never actually used)

**Production Note:**
For production deployment to Chainlink DON, you would need to:
1. Store secrets in Chainlink Vault DON
2. Use `ConfidentialHTTPClient` with template syntax: `{{.secretName}}`
3. Remove hardcoded keys from repository

### 2. ACE POLICIES — PROOF OF CONCEPT

**Synced / Stored on-chain but NOT enforced at the smart contract level.**

The `runPolicy` modifier in `PolicyProtected.sol` is a placeholder (does nothing):

```solidity
modifier runPolicy() {
    // Policy check placeholder - actual implementation would call policyEngine
    _;
}
```

| Policy | Storage | Enforced | Notes |
|--------|---------|----------|-------|
| **Blacklist** | ✅ PolicyEngine | ❌ No | Workflow-level only (GoPlus/ScamSniffer pre-check) |
| **Volume Limits** | ✅ VolumePolicyDON | ❌ No | Limits stored but never queried |
| **Freeze** | ✅ USDAFreezer | ❌ No* | Wrong contract in config |

\* Freeze workflow lands in `SimpleFreezer`, but USDA V8 checks `USDAFreezer`

**To enable on-chain enforcement:** Implement actual policy check in `runPolicy` modifier or call `policyEngine.evaluate()` directly in mint/transfer functions.

---

## 🚀 Production To-Do (Post-Hackathon)

| Priority | Item | Status | Notes |
|----------|------|--------|-------|
| 🔴 P0 | Implement ACE policy enforcement | ❌ | Replace `runPolicy` placeholder with actual `policyEngine.evaluate()` call |
| 🔴 P0 | Fix freeze workflow config | ❌ | Update freezer address + report encoding format |
| 🟡 P1 | Replace hardcoded API keys | ❌ | Move to Chainlink Vault DON + Confidential HTTP |
| 🟡 P1 | CCIP cross-chain deployment | ❌ | Deploy BurnMintTokenPool on Arbitrum Sepolia |
| 🟡 P1 | Upgrade timelock governance | ❌ | Add 24h timelock for admin functions |
| 🟢 P2 | Mainnet deployment plan | ❌ | Security audit + node operator setup |
| 🟢 P2 | Monitoring dashboard | ❌ | Grafana + on-chain metrics exporter |
| 🟢 P2 | Circuit breaker tests | ❌ | Chaos engineering for oracle failures |

---

## Overview

Sentinel is an autonomous security platform that protects DeFi protocols through:
- **Real-time threat detection** - Monitors blockchain for suspicious transactions
- **AI-powered analysis** - Uses xAI Grok for security decisions
- **DON-signed execution** - Chainlink DON attestation for on-chain actions
- **Proof of Reserves** - Validates stablecoin backing in real-time

## Project Structure

```
sentinel/
├── contracts/          # Smart contracts (Hardhat + Foundry)
│   ├── src/tokens/     # USDA Stablecoin V8
│   ├── src/core/       # Sentinel core contracts
│   ├── src/policies/   # ACE PolicyEngine
│   └── src/por/        # Proof of Reserve contracts
├── api-server/         # REST API server
├── sentinel-node/      # Blockchain monitoring node
├── frontend/           # React web application
└── workflows/          # CRE workflow definitions
    ├── eth-por-unified/       # ETH Reserve Mint
    ├── blacklist-manager/     # Blacklist Sync
    ├── volume-sentinel/       # Volume Guardian
    ├── pause-with-don/        # Sentinel Guard
    └── usda-freeze-sentinel/  # Scam Freeze Sentinel
```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Copy environment
cp .env.example .env
# Edit .env with your keys

# Start development
npm run api          # API server
npm run dev          # Frontend
```

## Contract Addresses (Sepolia Testnet)

> **Verified & Working** — Last updated: March 8, 2026

### Core Tokens & Vaults

| Contract | Address | Purpose |
|----------|---------|---------|
| **USDA V8** | [`0xFA93de331FCd870D83C21A0275d8b3E7aA883F45`](https://sepolia.etherscan.io/address/0xFA93de331FCd870D83C21A0275d8b3E7aA883F45) | Main stablecoin (6 decimals, UUPS upgradeable) |
| **SentinelVaultETH** | [`0x12fe97b889158380e1D94b69718F89E521b38c11`](https://sepolia.etherscan.io/address/0x12fe97b889158380e1D94b69718F89E521b38c11) | ETH collateral vault (emits ETHDeposited events) |

### Minting & Consumers

| Contract | Address | Purpose |
|----------|---------|---------|
| **MintingConsumerV8** | [`0xb59f7feb8e609faec000783661d4197ee38a8b07`](https://sepolia.etherscan.io/address/0xb59f7feb8e609faec000783661d4197ee38a8b07) | DON-signed USDA minting (IReceiver interface) |

### Freezing & Protection

| Contract | Address | Purpose |
|----------|---------|---------|
| **USDAFreezer** | [`0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21`](https://sepolia.etherscan.io/address/0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21) | Production address freezer (upgradeable, IReceiver) |
| **SimpleFreezer** | [`0x0F2672C6624540633171f4E38b316ea1ED50E3A9`](https://sepolia.etherscan.io/address/0x0F2672C6624540633171f4E38b316ea1ED50E3A9) | Test freezer with IReceiver.onReport interface |

### Emergency & Governance

| Contract | Address | Purpose |
|----------|---------|---------|
| **EmergencyGuardianDON** | [`0x777403644f2eE19f887FBB129674a93dCEEda7d4`](https://sepolia.etherscan.io/address/0x777403644f2eE19f887FBB129674a93dCEEda7d4) | Emergency pause via DON-signed reports |
| **SentinelRegistry** | [`0x774B96F8d892A1e4482B52b3d255Fa269136A0E9`](https://sepolia.etherscan.io/address/0x774B96F8d892A1e4482B52b3d255Fa269136A0E9) | Contract registration & guardian management |
| **Chainlink Forwarder** | [`0x15fC6ae953E024d975e77382eEeC56A9101f9F88`](https://sepolia.etherscan.io/address/0x15fC6ae953E024d975e77382eEeC56A9101f9F88) | Validates & delivers DON-signed reports |

### Policy & Compliance (ACE)

| Contract | Address | Purpose |
|----------|---------|---------|
| **PolicyEngine** | [`0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347`](https://sepolia.etherscan.io/address/0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347) | ACE policy enforcement (blacklist, IReceiver) |
| **VolumePolicyDON** | [`0x84e1b5E100393105608Ab05d549Da936cD7E995a`](https://sepolia.etherscan.io/address/0x84e1b5E100393105608Ab05d549Da936cD7E995a) | AI-adjusted volume limits (IReceiver) |

## Workflows

### 1. ETH Reserve Mint (`eth-por-unified/`)
**Trigger:** EVM Log (ETHDeposited event)
**Purpose:** Mint USDA backed by ETH collateral

**Flow (Exactly 5 HTTP calls in simulation):**
1. User deposits ETH → Vault emits ETHDeposited event
2. CRE workflow fetches 2-source price (Coinbase, Binance) - Kraken skipped in sim
3. GoPlus security check (ScamSniffer + Sanctions skipped in sim)
4. Validates bank reserves via First Plaidypus Bank API
5. xAI Grok final review (HTTP #5)
6. DON-signed report → Mint USDA

> **HTTP Budget:** Simulation = 5 calls max. Production = unlimited.
> - **Active:** Coinbase, Binance, GoPlus, Bank API, xAI
> - **Skipped in sim:** Kraken, ScamSniffer, OFAC Sanctions

**Test Command:**
```bash
cre workflow simulate ./workflows/eth-por-unified --target local-simulation
```

**Test Result Example:**
```
=== ETH + PoR Unified (EVM Log Trigger → 5 HTTP + LLM → MintingConsumer) ===
User: 0x..., ETH: 0.001
Chainlink reference price: $1,968.00
[1] Coinbase...   CB: $1,972 ✓ (HTTP #1)
[2] Binance...    BN: $1,972 ✓ (HTTP #2)
   [SKIP] Kraken (HTTP limit - prod only)
Median=$1,972, Dev=1bps, USDA=1.97
[3] GoPlus...     Low Risk ✓ (HTTP #3)
   [SKIP] ScamSniffer (HTTP limit - prod only)
   [SKIP] Sanctions (HTTP limit - prod only)
[4] Bank reserves... $1,800 ✓ (HTTP #4)
[5] xAI Grok...   APPROVED (Risk: low, 94%) ✓ (HTTP #5)
✓ DON-signed report generated
✓ Mint complete: 1.97 USDA
```

---

### 2. Blacklist Manager (`blacklist-manager/`)
**Trigger:** HTTP / Cron (Daily)
**Purpose:** Sync security blacklist to PolicyEngine

**Flow:**
1. Fetch from GoPlus API (SlowMist + ScamSniffer aggregation)
2. Fetch ScamSniffer GitHub database (2,500+ addresses)
3. Fetch Sentinel sanctions data
4. Merge & deduplicate inside CRE TEE
5. Compute Merkle root
6. Update PolicyEngine on-chain

> **Note:** GoPlus API is currently skipped in this demo (HTTP budget optimization). ScamSniffer GitHub (2,500+ addresses) and Sentinel Sanctions (27 addresses) are fully active.

**Test Command:**
```bash
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --http-payload '{"action":"blacklist","address":"0x3333333333333333333333333333333333333333","reason":"Test"}'
```

**Test Result Example:**
```
=== Blacklist Manager ===
[1] Fetching sanctions data...
  ✓ 27 addresses from Sentinel sanctions
[2] Fetching ScamSniffer database...
  ✓ 2,530 addresses from GitHub Data Fetch
[3] Merging and deduplicating...
  2,559 unique addresses
[4] Demo mode: 2,559 → 10 addresses
[5] Computing Merkle root...
  Root: 0xabc123...
[6] Broadcasting to PolicyEngine...
  ✓ Transaction: 0xdef456...
✓ Blacklist updated successfully
```

---

### 3. Volume Guardian (`volume-sentinel/`)
**Trigger:** Cron (Every 15 minutes)
**Purpose:** Auto-adjust volume limits based on market conditions

**Flow:**
1. Fetch crypto news from Finnhub
2. Fetch market data from CoinGecko
3. Read on-chain USDA total supply
4. Fetch bank reserves
5. Calculate reserve ratio
6. xAI Grok analysis → Decision
7. Update VolumePolicyDON if threshold crossed

**Test Command:**
```bash
cre workflow simulate ./workflows/volume-sentinel --target local-simulation
```

**Test Result Example:**
```
=== Volume Sentinel ===
[1] Fetching market data...
  CoinGecko: BTC +5.2%, ETH +3.1%
[2] Fetching news sentiment...
  Finnhub: 12 bullish, 3 bearish articles
[3] Checking reserves...
  Bank: $1,800,000 | Supply: 1,000,000 USDA
  Reserve ratio: 1.8x (healthy)
[4] AI analysis...
  Market: Bullish
  Sentiment score: +65
  Decision: INCREASE
[5] Updating volume limit...
  Current: 100,000 USDA/day
  New: 120,000 USDA/day (+20%)
✓ Volume limit updated
```

---

### 4. Sentinel Guard (`pause-with-don/`)
**Trigger:** HTTP (from Sentinel Node)  
**Purpose:** Emergency pause with GoPlus + AI investigation

**Flow:**
1. Sentinel Node detects threat (fraudScore ≥ 70) → HTTP trigger
2. **GoPlus investigation** - Check from/to addresses for honeypot, blacklist, mintable
3. Proof of Reserve check (auto-pause if <$1M reserves)
4. **xAI Grok analyzes ALL evidence** and decides PAUSE or MONITOR
5. Generate DON-signed report
6. Broadcast to EmergencyGuardianDON

**Key:** Workflow does NOT score - it INVESTIGATES. xAI decides based on evidence.

**Test Command:**
```bash
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --http-payload '{"action":"pause","target":"0xFA93de331FCd870D83C21A0275d8b3E7aA883F45","reason":"Emergency","metadata":{"fraudScore":85,"riskFactors":["Large transfer","Suspicious pattern"],"suspiciousTx":"0xabc","from":"0x123","to":"0x456","value":"10000"}}'
```

**Test Result Example:**
```
=== Pause with DON (Sentinel Node Alert) ===
[1] Alert received from Sentinel Node
    Fraud Score: 85
    Risk Factors: Large transfer, Suspicious pattern
[1.5] Checking Proof of Reserve...
   ✓ Bank reserves: $1,800,000 USD
   ✓ Reserve ratio: 1.80x
[1.6] Checking GoPlus security for 0x123...
   ✓ GoPlus risk score: 45/100
   Risk factors: Honeypot detected, Proxy contract
[1.6] Checking GoPlus security for 0x456...
   ✓ GoPlus risk score: 20/100
   Risk factors: Mintable token
📊 Fraud score adjusted: 85 → 104 (GoPlus: +19)
[2] Analyzing threat with xAI Grok...
   ✓ AI Decision: PAUSE
   ✓ Confidence: 96%
   Reasoning: High-value suspicious transfer with honeypot risk
🚨 AI confirms PAUSE is warranted
[3] Generating DON-signed pause report...
   ✓ Report hash: 0xabc123...
[4] Creating DON attestation...
   ✓ Report signed: 1 signatures
[5] Broadcasting to EmergencyGuardianDON...
   ✓ PAUSE EXECUTED!
   Tx Hash: 0xdef789...
✅ WORKFLOW COMPLETE
```

---

### 5. Scam Freeze Sentinel (`usda-freeze-sentinel/`)
**Trigger:** EVM Log (USDA Transfer event)
**Purpose:** Real-time freeze of suspicious addresses

**Flow:**
1. USDA Transfer event emitted
2. CRE workflow triggered
3. Multi-source security check:
   - GoPlus API (SlowMist, ScamSniffer, sanctions)
   - ScamSniffer GitHub database
4. xAI Grok risk assessment
5. Decision: FREEZE or MONITOR
6. DON-signed report to Freezer contract

**Test Command:**
```bash
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation
```

**Test Result Example:**
```
=== Scam Freeze Sentinel ===
Transfer: 0xUserA → 0xSuspiciousAddress
Amount: 5,000 USDA
[1] GoPlus security check...
   ⚠️ HIGH_RISK
   - Known phishing address
   - Reported 47 times
[2] ScamSniffer check...
   ⚠️ FOUND in blacklist
[3] AI risk assessment...
   Risk Score: 95/100
   Decision: FREEZE
🧊 Address FROZEN: 0xSuspiciousAddress
✓ DON report broadcast to Freezer
```

## All Test Commands

```bash
# 1. ETH Reserve Mint
cre workflow simulate ./workflows/eth-por-unified --target local-simulation

# 2. Blacklist Manager
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --http-payload '{"action":"blacklist","address":"0x3333333333333333333333333333333333333333","reason":"Test"}'

# 3. Volume Guardian
cre workflow simulate ./workflows/volume-sentinel --target local-simulation

# 4. Sentinel Guard
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --http-payload '{"action":"pause","target":"0xFA93de331FCd870D83C21A0275d8b3E7aA883F45","reason":"Test","metadata":{"fraudScore":85,"riskFactors":["Suspicious"],"suspiciousTx":"0xabc","from":"0x123","to":"0x456","value":"10000"}}'

# 5. Scam Freeze Sentinel
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation
```

## Environment Setup

```bash
# Copy example env
cp .env.example .env

# Required variables:
# - SEPOLIA_RPC (Tenderly gateway)
# - SENTINEL_PRIVATE_KEY (for deployments)
# - CRE_ETH_PRIVATE_KEY (for workflow broadcasts)
# - ETHERSCAN_API_KEY
```

## License

MIT
