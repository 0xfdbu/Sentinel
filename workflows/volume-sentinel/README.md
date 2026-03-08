# Volume Guardian

AI-powered volume limit adjustments based on crypto market sentiment and Proof of Reserve ratios.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VOLUME GUARDIAN WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Cron Schedule (Every 15 min)                                                │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MARKET DATA AGGREGATION                           │    │
│  │                                                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │   Finnhub    │  │  CoinGecko   │  │   xAI Grok   │              │    │
│  │  │  Crypto News │  │   Market     │  │   Analysis   │              │    │
│  │  │              │  │   Metrics    │  │              │              │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │    │
│  │         └─────────────────┼─────────────────┘                        │    │
│  │                           ▼                                          │    │
│  │              Market Sentiment Score (-100 to +100)                   │    │
│  │                                                                     │    │
│  └───────────────────────────┬─────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│              ┌───────────────────────────────┐                               │
│              │   Reserve Ratio Check         │                               │
│              │   (Bank Reserves / Supply)    │                               │
│              └───────────────┬───────────────┘                               │
│                              │                                               │
│                              ▼                                               │
│              ┌───────────────────────────────┐                               │
│              │   AI Decision Logic           │                               │
│              │                               │                               │
│              │  Reserve < 2% → DECREASE      │                               │
│              │  Reserve 2-5% → MAINTAIN      │                               │
│              │  Reserve > 5% → ADJUST        │                               │
│              └───────────────┬───────────────┘                               │
│                              │                                               │
│                              ▼                                               │
│              DON-Signed Report ──▶ VolumePolicyDON.onReport()                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sources

| Source | Endpoint | Data | Sim Status |
|--------|----------|------|------------|
| **Finnhub** | `finnhub.io/api/v1/news?category=crypto` | 10 latest crypto headlines | ✅ HTTP #1 |
| **CoinGecko** | `/global` | Market cap, volume, fear & greed | ✅ HTTP #2 |
| **Bank API** | First Plaidypus Bank | USD reserves | ✅ HTTP #3 |
| **xAI Grok** | `api.x.ai/v1/chat/completions` | Volume limit decision | ✅ HTTP #4 |
| **CoinGecko** | `/search/trending` | Top 7 trending coins | ⏭️ Skipped (sim) |
| **On-chain** | `USDA.totalSupply()` | Total USDA supply | 🔒 Free |

> **HTTP Budget:** 4/5 calls used in simulation. Trending coins skipped to fit within 5-call limit.
> Production DON has unlimited HTTP.

## AI Decision Logic

The xAI Grok receives comprehensive market data and makes decisions based on:

### Reserve Ratio Priority (Primary Factor)
```
Reserve Ratio = Bank Reserves / USDA Supply

• < 2%  = HIGH RISK   → DECREASE limits (-20%)
• 2-5%  = MEDIUM RISK → MAINTAIN current
• > 5%  = LOW RISK    → INCREASE based on sentiment
```

### Market Sentiment (Secondary Factor)
```
• Fear & Greed > 60 (Extreme Greed) → Increase limit
• Fear & Greed 20-60 (Greed)        → Slight increase
• Fear & Greed -20 to 20 (Neutral)  → Maintain
• Fear & Greed -60 to -20 (Fear)    → Decrease
• Fear & Greed < -60 (Extreme Fear) → Significant decrease
```

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **VolumePolicyDON** | `0x84e1b5E100393105608Ab05d549Da936cD7E995a` | Stores & enforces volume limits (IReceiver) |
| **USDA Token** | `0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6` | Total supply reference |
| **Chainlink Forwarder** | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` | Delivers DON-signed reports |

## IReceiver Interface

VolumePolicyDON implements `IReceiver` for Chainlink Forwarder integration:

```solidity
interface IReceiver {
    function onReport(bytes metadata, bytes report) external;
}
```

When the Volume Sentinel workflow runs:
1. CRE workflow generates DON-signed report via `runtime.report()`
2. `evm.writeReport()` submits to Chainlink Forwarder
3. Forwarder validates signatures
4. Forwarder calls `VolumePolicyDON.onReport(metadata, report)`
5. Contract updates limits atomically

## Run Workflow

### Simulation Only
```bash
cd ../..
cre workflow simulate ./workflows/volume-sentinel --target local-simulation
```

### With On-Chain Broadcast
```bash
cre workflow simulate ./workflows/volume-sentinel --target local-simulation --broadcast
```

## Example Output

```
=== Volume Sentinel (Cron Trigger) - USDA Volume Adjustment ===
[1] Fetching crypto market news...
    📰 Found 10 crypto-related headlines
    1. 🟢 Latin America's crypto user growth outpaced U.S. by 3x...
    2. ⚪ Bitcoin purist Jack Dorsey says firm reluctantly...
    3. ⚪ Top Wall Street minds see AI rotation ahead...
[2] Fetching CoinGecko trending & search data...
    🔥 7 trending coins (momentum indicator)
    1. Bitcoin (BTC) - Rank #1
    2. Akash Network (AKT) - Rank #242
[3] Fetching enhanced market metrics...
    💰 Market Cap: $2.38T (-1.05%)
    📊 24h Volume: $58.51B
    😰 Fear & Greed: 45/100
[4] Fetching Proof of Reserve (bank reserves)...
    💰 Bank Reserves: $1,800.21 USD
[5] Reading USDA total supply from chain...
    🪙 USDA Total Supply: 100,177.729
[6] Analyzing with xAI Grok...
    AI Recommendation: DECREASE
    Market Condition: neutral
    Risk Level: HIGH
    Proposed Limit: 800 USDA
[7] Generating DON-signed report...
[8] Broadcasting to VolumePolicyDON...
    ✅ SUCCESS: 0x9516d54a34858dd838424c11fc339593d9fc7e3ba6a0d6f41508e7c1b86141eb
```

## Test Results

### Latest Execution

| Date | Old Limit | New Limit | Change | Reason | Tx Hash |
|------|-----------|-----------|--------|--------|---------|
| 2026-03-07 | 1000 USDA | 800 USDA | -20% | Reserve ratio 1.80% < 2% | `0xebc2bd748e8ab810c9d298072e6245c7887d28430dbf77e3938724e1db34c3ef` |

**Transaction Hash:** `0xebc2bd748e8ab810c9d298072e6245c7887d28430dbf77e3938724e1db34c3ef`

- **Volume limits adjusted** based on real-time market sentiment
- **DON-signed report** broadcast to VolumePolicyDON
- **AI-powered decision** from xAI Grok
- **Zero mock data** - all API calls are real

### API Endpoints Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| **CoinGecko** | `api.coingecko.com/api/v3/search/trending` | Trending coins momentum |
| **CoinGecko** | `api.coingecko.com/api/v3/global` | Market cap, volume, fear & greed |
| **Finnhub** | `finnhub.io/api/v1/news?category=crypto` | Crypto news sentiment |
| **xAI Grok** | `api.x.ai/v1/chat/completions` | AI analysis & limit decision |
| **Bank API** | First Plaidypus Bank API | USD reserves for PoR ratio |

### Test Commands

```bash
# Simulation only (no broadcast)
cre workflow simulate ./workflows/volume-sentinel --target local-simulation

# With on-chain broadcast (real transaction)
cre workflow simulate ./workflows/volume-sentinel --target local-simulation --broadcast
```

## Recent Executions

| Date | Old Limit | New Limit | Change | Reason | Tx |
|------|-----------|-----------|--------|--------|-----|
| 2026-03-07 | 1000 USDA | 800 USDA | -20% | Reserve ratio 1.80% < 2% | [0xebc2...](https://sepolia.etherscan.io/tx/0xebc2bd748e8ab810c9d298072e6245c7887d28430dbf77e3938724e1db34c3ef) |

## Report Format

DON-signed reports sent to `onReport()`:

```solidity
struct VolumeReport {
    bytes32 reportHash;      // Unique identifier (keccak256)
    uint8 instruction;       // 1=setLimits, 2=setDailyLimit, 3=setExemption
    uint256 param1;          // newLimit for daily limit
    uint256 param2;          // unused for daily limit
    string reason;           // AI reasoning + market condition
}
```

## Security

- **Replay Protection:** Each report hash can only be used once (`usedReports` mapping)
- **DON Authentication:** Only Chainlink Forwarder with `DON_SIGNER_ROLE` can call `onReport()`
- **Cryptographic Signatures:** Reports signed by DON consensus (ECDSA + Keccak256)
