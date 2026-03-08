# Chainlink Sentinel - DeFi Security Platform

AI-powered security monitoring with Chainlink CRE (Chainlink Runtime Environment), DON-signed execution, and automated threat response.

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

| Component | Address | Purpose |
|-----------|---------|---------|
| USDA V8 | `0xFA93de331FCd870D83C21A0275d8b3E7aA883F45` | Main stablecoin (6 decimals) |
| ETH Vault | `0x12fe97b889158380e1D94b69718F89E521b38c11` | ETH collateral vault |
| Minting Consumer V8 | `0xb59f7feb8e609faec000783661d4197ee38a8b07` | DON minting receiver |
| USDAFreezer | `0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21` | Production address freezing (upgradeable) |
| SimpleFreezer | `0x2F1A84699F19f3c05cee44e3C3A77646c53C2023` | Test freezer with onReport interface |
| EmergencyGuardianDON | `0x777403644f2eE19f887FBB129674a93dCEEda7d4` | Emergency pause via DON reports |
| Forwarder | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` | KeymockstoneForwarder for DON reports |
| Policy Engine | `0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347` | ACE compliance |
| VolumePolicyDON | `0x84e1b5E100393105608Ab05d549Da936cD7E995a` | Volume limits via DON |
| Sentinel Registry | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` | Contract registration |

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
**Purpose:** Emergency pause with GoPlus + AI threat analysis

**Flow:**
1. Sentinel Node detects threat (fraudScore ≥ 70)
2. HTTP trigger to CRE workflow
3. **GoPlus security check** - Analyze from/to addresses for honeypot, blacklist, mintable (+30% to fraud score)
4. Check bank reserves (auto-pause if <$1M)
5. xAI Grok analyzes threat metadata
6. Decision: PAUSE (score ≥ 80) or MONITOR
7. Generate DON-signed report
8. Execute emergency pause via EmergencyGuardianDON (0x7774...a7d4)

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
