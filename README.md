# Chainlink Sentinel - DeFi Security Platform

AI-powered security monitoring with Chainlink ACE (Automated Compliance Engine) and CCIP cross-chain support.

## Project Structure

```
sentinel/
├── contracts/          # Smart contracts (Foundry)
│   ├── src/tokens/USDAStablecoinV7.sol
│   ├── src/core/       # Sentinel core contracts
│   ├── src/policies/   # ACE policies
│   └── script/         # Deployment scripts
├── api-server/         # REST API server
├── sentinel-node/      # Blockchain monitoring node
├── frontend/           # React web application
├── workflows/          # CRE workflow definitions
└── archive/            # Old versions
```

## Quick Start

### Deploy USDA V7

```bash
cd contracts
forge script script/DeployV7Only.s.sol:DeployV7Only \
  --rpc-url $SEPOLIA_RPC \
  --broadcast
```

## Key Components

### 1. USDA V7 Token
- Chainlink ACE compliance (`PolicyProtected`)
- CCIP cross-chain compatible
- Sentinel Guardian pause support

### 2. Sentinel Core
- `SentinelRegistry` - Contract registration
- `SentinelPauseController` - Emergency pause
- `EmergencyGuardian` - Automated response

### 3. ACE Policies
- `AddressBlacklistPolicy` - Blocklist compliance
- `FunctionSignaturePolicy` - Function restrictions
- `VolumePolicy` - Transaction limits

## Contract Addresses (Sepolia)

| Component | Address |
|-----------|---------|
| USDA V7 | `0x500D640f4fE39dAF609C6E14C83b89A68373EaFe` |
| V7 TokenPool | `0x4721ca7B098db2AE6300c48d325d25eA692D68CA` |
| PolicyEngine | `0x62CC29A58404631B7db65CE14E366F63D3B96B16` |
| Sentinel Guardian | `0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1` |

## Environment Setup

```bash
# Copy example env
cp .env.example .env

# Fill in your keys:
# - SEPOLIA_RPC
# - PRIVATE_KEY
# - ETHERSCAN_API_KEY
```

## Commands

```bash
# Install dependencies
npm run install:all

# Start API server
npm run api

# Deploy contracts
cd contracts && forge script script/DeployV7Only.s.sol --rpc-url $SEPOLIA_RPC --broadcast

# Run tests
cd contracts && forge test
```

## Documentation

- [Chainlink ACE](https://github.com/smartcontractkit/chainlink-ace)
- [CCIP Documentation](https://docs.chain.link/ccip)
- [Foundry Book](https://book.getfoundry.sh/)

## License

MIT
