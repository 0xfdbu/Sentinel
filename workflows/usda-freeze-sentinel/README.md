# Scam Freeze Sentinel

Real-time freeze protection for USDA transfers using AI-powered risk assessment.

## How It Works

1. **USDA Transfer event** emitted
2. **CRE workflow triggers** on EVM Log
3. **Multi-source security check (REAL APIs):**
   - GoPlus API (SlowMist, BlockSec, ScamSniffer aggregation)
   - ScamSniffer GitHub blacklist (2,500+ addresses)
   - Sentinel Sanctions database
4. **xAI Grok risk assessment**
5. **Decision:** FREEZE or MONITOR
6. **DON-signed report** to Freezer contract

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| SimpleFreezer | `0x0F2672C6624540633171f4E38b316ea1ED50E3A9` | Test freezer with IReceiver interface |
| USDA Token | `0xFA93de331FCd870D83C21A0275d8b3E7aA883F45` | USDA Stablecoin V8 |

## Trigger

EVM Log: USDA Transfer event (`Transfer(address indexed from, address indexed to, uint256 value)`)

## Test Commands

### Simulate without broadcast
```bash
cd ../..
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation \
  --evm-tx-hash 0xTX_HASH --evm-event-index 0 --non-interactive --trigger-index 0
```

### Simulate with broadcast (actual freeze)
```bash
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation \
  --broadcast --evm-tx-hash 0xTX_HASH --evm-event-index 0 --non-interactive --trigger-index 0
```

## Test Results

### ✅ Lazarus Group Detection - March 7, 2026

**REAL API Test - Production Mode**

```
=== USDA Freeze Sentinel (Transfer → Scam Check → AI Decision) ===
Transfer detected:
  From: 0x9Eb4168b419F2311DaeD5eD8E072513520178f0C
  To: 0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1
  Value: 1000000 USDA
[1] Checking GoPlusLabs security API...
  ✅ GoPlus: Risk score 115/100 (CRITICAL)
  Data sources: SlowMist, BlockSec
[2] Checking ScamSniffer blacklist...
  ✅ Clean (2530 addresses checked)
[3] Checking Sentinel Sanctions database...
  ✅ Not in sanctions database
📊 Total Risk Score: 115/100
  - Blacklist doubt
  - Sanctioned address
  - Stealing attack history
[4] High risk detected - Sending to xAI for review...
  → Calling xAI Grok for risk assessment...
🤖 AI Decision:
  Action: FREEZE
  Confidence: 80.0%
  Reasoning: High risk score (115/100) from security APIs
[5] Executing freeze via CRE DON...
  ✅ FREEZE EXECUTED: 0xbed9c0c54d620f37b0713aab63a5abec7ac9a2dea533d822e7e6074e1c9d3b2a
```

**Test Details:**
- **Transfer Tx:** `0x5d6e86fd850be247511b9f73bfb6bef869b5b285a2e514258e3537e1686f449b`
- **Target Address:** `0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1` (Lazarus Group)
- **Risk Score:** 115/100 (CRITICAL - real GoPlus data)
- **Risk Factors:** Blacklist doubt, Sanctioned address, Stealing attack history
- **Data Sources:** SlowMist, BlockSec
- **Freeze Tx:** `0xbed9c0c54d620f37b0713aab63a5abec7ac9a2dea533d822e7e6074e1c9d3b2a`

**Verification:**
```bash
# Check if Lazarus Group address is frozen
cast call 0x0F2672C6624540633171f4E38b316ea1ED50E3A9 \
  "isFrozen(address)(bool)" 0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# Returns: true
```

### Previous Test - vitalik.eth

**Test Details:**
- **Transfer Tx:** `0xfb612cdad247d0a99272c57553b629f39c0ac41c7d74f9033346c74039009ca4`
- **Target Address:** `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth)
- **Freeze Tx:** `0xdc95953b758591794a51d4d2800113cf6043f130183c69a536ffbcc0d7c34eeb`

## Report Format

The workflow generates a DON-signed report with the following ABI-encoded data:

```solidity
(bytes32 reportHash, address target, string reason)
```

This is decoded by the SimpleFreezer's `onReport()` function:
```solidity
function onReport(bytes calldata metadata, bytes calldata report) external
```

## Security Sources

- **GoPlus Labs API:** Multi-source security intelligence (SlowMist, BlockSec, ScamSniffer aggregation)
- **ScamSniffer GitHub:** Community-reported scam addresses (2,500+)
- **Sentinel Sanctions:** Lazarus Group, Tornado Cash, etc.
- **xAI Grok:** AI risk assessment for final freeze decisions

## Architecture

```
USDA Transfer Event
       │
       ▼
CRE Workflow (TEE)
       │
       ├──▶ GoPlus API (Real security data)
       ├──▶ ScamSniffer GitHub (Real blacklist)
       ├──▶ Sentinel Sanctions (Real sanctions DB)
       │
       ▼
xAI Grok Analysis
       │
       ▼
DON-Signed Report
       │
       ▼
Chainlink Forwarder
       │
       ▼
SimpleFreezer.onReport()
       │
       ▼
   Address FROZEN 🧊
```

## API Call Flow

All API calls are **REAL** (no mock data):

1. **GoPlus Security API:** `https://api.gopluslabs.io/api/v1/address_security/{address}`
2. **ScamSniffer GitHub:** `https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json`
3. **Sentinel Sanctions:** `https://raw.githubusercontent.com/0xfdbu/sanctions-data/main/data.json`
4. **xAI Grok:** `https://api.x.ai/v1/chat/completions`

Risk score is calculated from real API responses. Freeze decision uses real xAI analysis or risk-score fallback (if xAI unavailable).
