# Sentinel Workflows

Autonomous security and minting workflows powered by Chainlink Runtime Environment (CRE).

## Overview

These workflows run inside Chainlink's Trusted Execution Environment (TEE) and generate DON-signed reports for verified on-chain execution.

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| [eth-por-unified](eth-por-unified/) | EVM Log | Mint USDA backed by ETH + 7 Security Checks | Live |
| [blacklist-manager](blacklist-manager/) | Cron/HTTP | Sync security blacklist to PolicyEngine | Live |
| [volume-sentinel](volume-sentinel/) | Cron | AI-adjusted volume limits (Finnhub + CoinGecko + xAI) | Live |
| [pause-with-don](pause-with-don/) | HTTP | Emergency pause with xAI threat analysis | Live |
| [usda-freeze-sentinel](usda-freeze-sentinel/) | EVM Log | Real-time freeze of suspicious addresses | Live |

## Quick Start

### Prerequisites

```bash
# Install CRE CLI
curl -sSL https://raw.githubusercontent.com/smartcontractkit/cre-cli/main/install.sh | bash
```

### Common Commands

```bash
# Simulate workflow (no broadcast)
cre workflow simulate ./workflows/WORKFLOW-NAME --target local-simulation

# Simulate with broadcast (writes to blockchain)
cre workflow simulate ./workflows/WORKFLOW-NAME --target local-simulation --broadcast

# Deploy to production TEE
cre workflow deploy WORKFLOW-NAME --target production
```

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SENTINEL WORKFLOW ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Trigger (EVM Log/Cron/HTTP)                                                │
│         │                                                                    │
│         ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │              CHAINLINK RUNTIME ENVIRONMENT (CRE)                     │   │
│   │                     Trusted Execution Environment (TEE)              │   │
│   │                                                                      │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │              CONFIDENTIAL HTTP LAYER                          │   │   │
│   │  │  • API keys injected from Vault DON (never in code/logs)     │   │   │
│   │  │  • Template: {{.apiKeyName}}                               │   │   │
│   │  │  • AES-256-GCM encrypted responses                          │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│   │  │  Price APIs  │  │ Security APIs│  │      AI Analysis         │   │   │
│   │  │ • Coinbase   │  │• ScamSniffer │  │  • xAI Grok (x.ai)       │   │   │
│   │  │ • Kraken     │  │• GoPlus Labs │  │  • Risk Assessment       │   │   │
│   │  │ • Binance    │  │• OFAC/Sanc. │  │  • Final Decision        │   │   │
│   │  │ • CoinGecko  │  │• GitHub Bl. │  │                          │   │   │
│   │  │ • Finnhub    │  │             │  │                          │   │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │              DON-SIGNED REPORT (ECDSA + Keccak256)                  │   │
│   │  • Workflow consensus from multiple DON nodes                       │   │
│   │  • Cryptographically verifiable                                     │   │
│   │  • Tamper-proof execution proof                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │              ON-CHAIN EXECUTION                                      │   │
│   │  • Forwarder.validateReport()  → Verify DON signature               │   │
│   │  • Consumer.onReport()         → Execute mint/pause/freeze          │   │
│   │  • PolicyEngine.enforce()      → ACE compliance check               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sources

### Price Feeds
| Source | Endpoint | Usage |
|--------|----------|-------|
| Coinbase | `api.coinbase.com` | ETH/USD price |
| Kraken | `api.kraken.com` | ETH/USD price |
| Binance | `api.binance.com` | ETH/USD price |
| CoinGecko | `api.coingecko.com` | Market metrics, trending coins |
| Finnhub | `finnhub.io` | Crypto news headlines |

### Security Intelligence
| Source | Data | Purpose |
|--------|------|---------|
| ScamSniffer GitHub | 2,500+ scam addresses | Blacklist check |
| GoPlus API | Multi-source security data | Risk assessment |
| Sentinel Sanctions | Lazarus, Tornado Cash, etc. | Compliance check |
| OFAC (optional) | US sanctions list | Regulatory compliance |

### AI Analysis
| Service | Model | Purpose |
|---------|-------|---------|
| xAI | `grok-4-1-fast-reasoning` | Final risk assessment |

### Proof of Reserve
| Source | Endpoint | Data |
|--------|----------|------|
| First Plaidypus Bank | `api.firstplaidypusbank.plaid.com` | Bank reserves USD |

## Environment Variables

```bash
# Required
SEPOLIA_RPC=https://sepolia.gateway.tenderly.co/...
CRE_ETH_PRIVATE_KEY=0x...

# API Keys (stored in Vault DON for production)
XAI_API_KEY=xai-...           # xAI Grok for AI analysis
FINNHUB_API_KEY=...           # Crypto news
COINGECKO_API_KEY=...         # Market data
GOPLUS_API_KEY=...            # Security intelligence (optional)
```

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| USDA V8 | `0xFA93de331FCd870D83C21A0275d8b3E7aA883F45` | Main stablecoin |
| SentinelVaultETH | `0x12fe97b889158380e1D94b69718F89E521b38c11` | ETH collateral |
| MintingConsumerV8 | `0xb59f7feb8e609faec000783661d4197ee38a8b07` | ETH→USDA minting |
| PolicyEngine | `0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347` | ACE enforcement (IReceiver)
| EmergencyGuardian | `0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1` | Emergency pause |
| SentinelRegistry | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` | Contract registry |
| USDAFreezer | `0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21` | Production address freezing (upgradeable) |
| SimpleFreezer | `0x0F2672C6624540633171f4E38b316ea1ED50E3A9` | Test freezer with IReceiver interface |
| VolumePolicyDON | `0x84e1b5E100393105608Ab05d549Da936cD7E995a` | Volume limits (IReceiver)

## Individual Workflows

### eth-por-unified/ - ETH Reserve Mint
Mint USDA stablecoins backed by ETH collateral with 7-source security validation.

**Data Sources:**
- 3 Price feeds (Coinbase, Kraken, Binance) - median with deviation check
- 3 Security checks (ScamSniffer, GoPlus, Sentinel Sanctions)
- Proof of Reserve (First Plaidypus Bank API)
- xAI Grok final approval

**Flow:**
```
User deposits ETH → Vault emits event → CRE fetches 3 prices + 3 security checks + bank reserves → xAI Grok review → DON-signed mint report → Mint USDA
```

### volume-sentinel/ - Volume Guardian
AI-adjusted USDA volume limits based on real-time crypto market sentiment.

**Data Sources:**
- Finnhub: Crypto news headlines (10 articles)
- CoinGecko: Trending coins, market metrics, fear & greed
- On-chain: USDA total supply
- Bank API: Proof of Reserve
- xAI Grok: Volume limit recommendation

**Logic:**
```
Reserve Ratio < 2% = HIGH RISK → DECREASE limits
Reserve Ratio 2-5% = MEDIUM RISK → MAINTAIN
Reserve Ratio > 5% = LOW RISK → INCREASE based on market sentiment
```

### usda-freeze-sentinel/ - Scam Freeze Sentinel
Real-time monitoring and freezing of suspicious USDA transfers.

**Data Sources:**
- GoPlus Labs: Multi-source security intelligence
- ScamSniffer: Community-reported scam addresses
- xAI Grok: Freeze decision

**Recent Test:** Transfer to vitalik.eth (mock high-risk) → Freeze executed → [Tx](https://sepolia.etherscan.io/tx/0xdc95953b758591794a51d4d2800113cf6043f130183c69a536ffbcc0d7c34eeb)

### blacklist-manager/ - Blacklist Sync
Synchronizes security blacklists to the on-chain PolicyEngine via DON-signed reports.

**Data Sources:**
- GoPlus API: Aggregated security intelligence (SlowMist + ScamSniffer)
- ScamSniffer GitHub: 2,500+ community-reported scam addresses
- Sentinel Sanctions: Lazarus Group, Tornado Cash, Garantex

**Flow:**
```
Fetch 3 sources → Merge in TEE → Compute Merkle root 
→ Generate report → DON sign → Forwarder → PolicyEngine.onReport()
```

**Report Format:** `(reportHash, merkleRoot, addressCount, reason)`

**Recent Test:** 4 addresses → Merkle root updated → [Tx](https://sepolia.etherscan.io/tx/0x56c62b9ab6df1c7cb6bd0cfc0e0d7a1d7654d80c64d18712de4acbe692897341)

### pause-with-don/ - Emergency Pause
Emergency protocol pause with xAI-powered threat analysis.

## HTTP Limits

**Simulation Mode:** Max 5 HTTP calls per workflow (CRE CLI limitation)
- Production workflows skip some security checks in simulation
- Real production DON has no HTTP limits

## Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [Sentinel GitHub](https://github.com/0xfdbu/Sentinel)
- [xAI API](https://x.ai/api)
- [Finnhub API](https://finnhub.io/docs/api)
- [CoinGecko API](https://www.coingecko.com/en/api)
