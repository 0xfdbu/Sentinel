# Sentinel: AI Security Oracle - Agent Guide

## Project Overview

Sentinel is an autonomous security monitoring system that uses Chainlink CRE (Chainlink Runtime Environment) to continuously scan smart contracts for vulnerabilities using AI (xAI Grok), and executes emergency pauses via Confidential Compute to hide vulnerability details from attackers while protecting funds.

**Hackathon**: Chainlink Convergence Hackathon 2026 - Risk & Compliance Track

### Architecture Overview

```
User Request (HTTP Trigger)
    │
    ▼
┌─────────────────────────────────────────┐
│      Chainlink CRE Workflow             │
│  (sentinel-workflow.ts)                 │
└─────────────────────────────────────────┘
    │
    ├──▶ Confidential HTTP (Etherscan) ──▶ xAI Grok AI Analysis
    │                                            │
    └────────────────────────────────────────────┘
                   │
                   ▼
    ┌───────────────────────────────────────────────┐
    │           Smart Contract Layer                │
    │  ┌─────────────────────────────────────────┐  │
    │  │   SentinelRegistry                      │  │
    │  │   (Opt-in registration)                 │  │
    │  └─────────────────────────────────────────┘  │
    │  ┌─────────────────────────────────────────┐  │
    │  │   EmergencyGuardian                     │  │
    │  │   (Pause execution)                     │  │
    │  └─────────────────────────────────────────┘  │
    │  ┌─────────────────────────────────────────┐  │
    │  │   AuditLogger                           │  │
    │  │   (Immutable records)                   │  │
    │  └─────────────────────────────────────────┘  │
    │  ┌─────────────────────────────────────────┐  │
    │  │   ReserveHealthMonitor                  │  │
    │  │   (TVL tracking, depeg detection)       │  │
    │  └─────────────────────────────────────────┘  │
    │  ┌─────────────────────────────────────────┐  │
    │  │   RiskProfileRegistry                   │  │
    │  │   (Compliance, multi-sig guardians)     │  │
    │  └─────────────────────────────────────────┘  │
    └───────────────────────────────────────────────┘
```

## Technology Stack

### Core Technologies
- **Smart Contracts**: Solidity ^0.8.19, ^0.8.20, ^0.8.26
- **Contract Framework**: Hardhat 2.19+
- **Contract Libraries**: OpenZeppelin Contracts v5.0.0, Chainlink Contracts v1.1.0
- **Frontend**: React 18+, TypeScript, Vite, TailwindCSS
- **Web3**: ethers.js v6, wagmi, viem, RainbowKit
- **CRE Runtime**: Chainlink CRE SDK (@chainlink/cre-sdk)

### Networks Supported
- **Hardhat Local**: Chain ID 31337 (development)
- **Sepolia Testnet**: Chain ID 11155111 (testing)
- **Ethereum Mainnet**: Chain ID 1 (production)

## Project Structure

```
sentinel/
├── contracts/                    # Smart contracts
│   ├── deploy-contracts/        # Contract source files
│   │   ├── SentinelRegistry.sol       # Opt-in registration contract
│   │   ├── EmergencyGuardian.sol      # Pause execution contract
│   │   ├── AuditLogger.sol            # Immutable audit trail
│   │   ├── ReserveHealthMonitor.sol   # TVL & health monitoring
│   │   ├── RiskProfileRegistry.sol    # Risk & compliance
│   │   ├── CrossChainGuardian.sol     # Multi-chain pauses via CCIP
│   │   ├── PausableVulnerableVault.sol # Demo vulnerable vault
│   │   └── MockERC20.sol              # Test token
│   ├── mocks/                   # Mock and test contracts
│   ├── scripts/                 # Deployment scripts
│   ├── deployments/             # Deployment artifacts
│   ├── hardhat.config.js        # Hardhat configuration
│   └── package.json             # Contract dependencies
├── frontend/                     # React web application
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Utility functions
│   │   ├── App.tsx              # Main application
│   │   └── main.tsx             # Entry point
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.ts           # Vite configuration
│   └── tailwind.config.js       # Tailwind configuration
├── cre.config.ts                # CRE SDK configuration
├── project.yaml                 # CRE project settings
├── secrets.yaml                 # Vault DON secrets mapping
├── package.json                 # Root package.json with scripts
└── .env.example                 # Environment template
```

## Build and Test Commands

### Root Level Commands

```bash
# Setup all dependencies
npm run setup

# Start local Hardhat blockchain
npm run chain

# Deploy contracts locally
npm run deploy

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Run contract tests
npm run test

# Run test coverage
npm run test:coverage

# Start frontend dev server
npm run frontend

# Build frontend for production
npm run frontend:build

# Lint Solidity contracts
npm run lint

# Full demo (deploy + simulate)
npm run full-demo

# Hackathon demo flow
npm run demo:hackathon
```

### CRE Commands

```bash
# Install CRE CLI
npm run cre:install

# Setup CRE workflow
npm run cre:setup

# Simulate workflow locally
npm run cre:simulate

# Simulate with hackathon settings
npm run cre:simulate:hackathon

# Deploy workflow to production TEE
npm run cre:deploy

# Build workflow
npm run cre:build
```

### Contract Commands

```bash
cd contracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local node
npx hardhat node

# Deploy locally
npx hardhat run scripts/deploy.js --network hardhat

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Frontend Commands

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint TypeScript
npm run lint
```

## Key Smart Contracts

### 1. SentinelRegistry
- **Purpose**: Opt-in registry for contracts wanting Sentinel protection
- **Key Features**:
  - Minimum stake: 0.01 ETH
  - Contract registration/deregistration
  - Authorized Sentinel management
  - Owner management

### 2. EmergencyGuardian
- **Purpose**: Executes emergency pauses on vulnerable contracts
- **Key Features**:
  - Only callable by authorized Sentinels
  - Default pause duration: 24 hours (max: 7 days)
  - Pause lifting with authorization checks
  - Batch operations for gas optimization

### 3. AuditLogger
- **Purpose**: Immutable log of all Sentinel scan results
- **Key Features**:
  - Severity levels: LOW, MEDIUM, HIGH, CRITICAL
  - SHA256 hashed vulnerability details for privacy
  - Paginated query support
  - Statistics tracking

### 4. ReserveHealthMonitor
- **Purpose**: Real-time reserve health monitoring for DeFi protocols
- **Key Features**:
  - TVL tracking with drop detection
  - Collateral ratio monitoring
  - Stablecoin depeg detection via Chainlink Price Feeds
  - Auto-pause on critical health metrics
  - Health score calculation (0-100)

### 5. RiskProfileRegistry
- **Purpose**: Per-contract risk configuration and compliance controls
- **Key Features**:
  - Risk profiles: CONSERVATIVE, MODERATE, AGGRESSIVE, CUSTOM
  - Transaction limits (daily, single tx, hourly rate)
  - KYC/AML compliance hooks
  - Whitelist/blacklist management
  - Multi-sig guardian configuration
  - Circuit breaker for unusual activity

### 6. CrossChainGuardian
- **Purpose**: Multi-chain emergency guardian with CCIP integration
- **Key Features**:
  - Cross-chain pause propagation
  - CCIP message handling
  - Replay attack prevention
  - Fee estimation

## Configuration Files

### .env (Environment Variables)
```bash
# RPC Endpoints
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
MAINNET_RPC=https://ethereum-mainnet-rpc.publicnode.com
HARDHAT_RPC=http://127.0.0.1:8545

# API Keys
ETHERSCAN_API_KEY=your_etherscan_key
GROK_API_KEY=xai-your_grok_key
ALCHEMY_KEY=your_alchemy_key

# WalletConnect
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id

# Contract Addresses (update after deployment)
REGISTRY_ADDRESS=0x...
GUARDIAN_ADDRESS=0x...
AUDIT_LOGGER_ADDRESS=0x...

# Private Keys (development only)
PRIVATE_KEY=your_private_key
SENTINEL_PRIVATE_KEY=your_sentinel_key
```

### secrets.yaml (Vault DON Secrets)
Maps secret names to environment variables for CRE Vault DON injection.

```yaml
secretsNames:
  etherscanApiKey:
    - ETHERSCAN_API_KEY
  san_marino_aes_gcm_encryption_key:
    - AES_KEY_ALL
  grokApiKey:
    - GROK_API_KEY
  sentinelPrivateKey:
    - SENTINEL_PRIVATE_KEY
```

### project.yaml (CRE Project Settings)
```yaml
staging-settings:
  account:
    workflow-owner-address: "0x89feEbA43b294425C0d7B482770eefbcc1359f8d"
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://ethereum-sepolia-rpc.publicnode.com

production-settings:
  account:
    workflow-owner-address: "0x89feEbA43b294425C0d7B482770eefbcc1359f8d"
  rpcs:
    - chain-name: ethereum-mainnet
      url: https://ethereum-mainnet-rpc.publicnode.com
```

## Testing Strategy

### Contract Testing
- Unit tests for each contract
- Integration tests for full workflow
- Mock contracts for vulnerability demonstration
- Hardhat network for local testing

### Demo Contracts
- **PausableVulnerableVault**: OpenZeppelin-based vault with intentional reentrancy vulnerability
- **ReentrancyAttacker**: Contract to demonstrate reentrancy attacks
- **SafeVault**: Non-vulnerable vault for comparison
- **MockERC20**: Test token for vault interactions

### Test Scenarios
1. **Reentrancy Attack Prevention**: Detect and block reentrancy
2. **Access Control Detection**: Identify missing modifiers
3. **Safe Contract Verification**: Confirm secure patterns
4. **Confidential Compute Privacy**: Verify mempool privacy
5. **Reserve Health Monitoring**: TVL drop detection
6. **Risk Profile Management**: KYC/AML compliance
7. **Multi-Sig Guardian**: Tiered authority testing

## Code Style Guidelines

### Solidity
- SPDX-License-Identifier on all files
- NatSpec comments for all functions
- Custom errors instead of require strings (gas optimization)
- Explicit visibility modifiers
- Events for all state-changing operations
- ReentrancyGuard for external calls

### TypeScript/React
- TypeScript strict mode enabled
- Functional components with hooks
- TailwindCSS for styling
- Lucide React for icons
- React Query for data fetching

## Deployment Process

### Local Development
1. Start Hardhat node: `npm run chain`
2. Deploy contracts: `npm run deploy`
3. Start frontend: `npm run frontend`

### Testnet Deployment
1. Configure `.env` with Sepolia RPC and private key
2. Deploy: `npm run deploy:sepolia`
3. Verify: `npx hardhat verify --network sepolia <ADDRESS>`
4. Update contract addresses in frontend

### Production Deployment
1. Configure secrets in Vault DON
2. Deploy workflow: `npm run cre:deploy`
3. Verify TEE execution: `cre workflow logs`

## Security Considerations

### API Key Management
- API keys NEVER hardcoded in source
- Template injection: `{{.secretName}}`
- AES-256-GCM encryption for responses
- Secrets stored in Vault DON (production)

### Access Control
- Owner pattern for admin functions
- Sentinel authorization for automated actions
- Multi-sig for critical operations
- Timelock for sensitive changes

### Smart Contract Security
- OpenZeppelin battle-tested contracts
- ReentrancyGuard for external calls
- Checks-Effects-Interactions pattern
- Pausable for emergency stops

## Frontend Pages

- `/` - Landing page
- `/protect` - Contract registration and management
- `/monitor` - Runtime monitoring dashboard
- `/reserve-health` - Reserve health monitoring
- `/cross-chain` - Cross-chain status
- `/docs` - Documentation
- `/visualizer` - Sentinel visualizer (minimal layout)

## Troubleshooting

### Common Issues

**Issue**: "Secret not found" in CRE
- Verify secrets are set: `cre secrets list --env production`
- Check `secrets.yaml` mapping

**Issue**: Contract verification fails
- Ensure constructor arguments match
- Check Etherscan API key

**Issue**: Frontend can't connect to contracts
- Verify contract addresses in `src/utils/contracts.ts`
- Check network configuration

## Resources

- **CRE Documentation**: https://docs.chain.link/cre
- **Chainlink CCIP**: https://docs.chain.link/ccip
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts
- **Hardhat Documentation**: https://hardhat.org/docs
