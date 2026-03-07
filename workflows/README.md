# Sentinel Workflows

Autonomous security and minting workflows powered by Chainlink Runtime Environment (CRE).

## Overview

These workflows run inside Chainlink's Trusted Execution Environment (TEE) and generate DON-signed reports for verified on-chain execution.

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| [eth-por-unified](eth-por-unified/) | EVM Log | Mint USDA backed by ETH + Proof of Reserve | Live |
| [blacklist-manager](blacklist-manager/) | Cron/HTTP | Sync security blacklist to PolicyEngine | Live |
| [volume-sentinel](volume-sentinel/) | Cron | AI-adjusted volume limits based on market | Live |
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
```

## Workflow Architecture

```
Trigger (EVM/HTTP) -> CRE TEE -> Confidential HTTP APIs -> DON Report -> On-Chain Execution
```

## Environment Variables

```bash
SEPOLIA_RPC=https://sepolia.gateway.tenderly.co/...
CRE_ETH_PRIVATE_KEY=0x...
XAI_API_KEY=xai-...        # Optional
GOPLUS_API_KEY=...          # Optional
```

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| SentinelVault | 0x12fe97b889158380e1D94b69718F89E521b38c11 |
| USDA V8 | 0xFA93de331FCd870D83C21A0275d8b3E7aA883F45 |
| MintingConsumer | 0xb59f7feb8e609faec000783661d4197ee38a8b07 |
| PolicyEngine | 0x62CC29A58404631B7db65CE14E366F63D3B96B16 |
| EmergencyGuardian | 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1 |


## Individual Workflows

### eth-por-unified/ - ETH Reserve Mint
Mint USDA with ETH collateral. 5-source validation.

### blacklist-manager/ - Blacklist Sync
Security blacklist synchronization. 4 data sources.

### volume-sentinel/ - Volume Guardian
AI-adjusted volume limits based on market conditions.

### pause-with-don/ - Sentinel Guard
Emergency pause with xAI threat analysis.

### usda-freeze-sentinel/ - Scam Freeze
Real-time freeze of suspicious USDA transfers.

## Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [Sentinel GitHub](https://github.com/0xfdbu/Sentinel)
