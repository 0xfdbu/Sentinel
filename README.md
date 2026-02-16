# 🔒 Sentinel: Autonomous AI Security Oracle

[![Chainlink CRE](https://img.shields.io/badge/Powered%20by-Chainlink%20CRE-375bd2)](https://chain.link/cre)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Sentinel** is an autonomous security monitoring system that uses Chainlink CRE (Chainlink Runtime Environment) to continuously scan smart contracts for vulnerabilities using AI (Gemini), and executes emergency pauses via Confidential Compute to hide vulnerability details from attackers while protecting funds.

> 🏆 **Chainlink Convergence Hackathon 2026** - Risk & Compliance Track

![Sentinel Architecture](https://via.placeholder.com/800x400/0f172a/38bdf8?text=Sentinel+Architecture)

---

## ✨ Key Features

- 🤖 **AI-Powered Analysis**: Gemini 1.5 Pro detects reentrancy, overflow, access control issues
- 🔐 **Confidential HTTP**: API keys never exposed in logs or code
- 🛡️ **Private Response**: Emergency pauses hidden from mempool until execution
- 📊 **Immutable Audit**: On-chain logging of all scan results
- ⚡ **Sub-Second Response**: Automated protection without human intervention

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────────┐
│   User Request  │────▶│      Chainlink CRE Workflow             │
│   HTTP Trigger  │     │  (sentinel-workflow.ts)                 │
└─────────────────┘     └─────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
   │ Confidential    │    │  Gemini LLM     │    │ Confidential     │
   │ HTTP (Etherscan)│───▶│  AI Analysis    │───▶│ Compute          │
   │                 │    │                 │    │ (Emergency Pause)│
   └─────────────────┘    └─────────────────┘    └──────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │    Smart Contract Layer       │
                    │  ┌─────────────────────────┐  │
                    │  │   SentinelRegistry      │  │
                    │  │   (Opt-in registration) │  │
                    │  └─────────────────────────┘  │
                    │  ┌─────────────────────────┐  │
                    │  │   EmergencyGuardian     │  │
                    │  │   (Pause execution)     │  │
                    │  └─────────────────────────┘  │
                    │  ┌─────────────────────────┐  │
                    │  │   AuditLogger           │  │
                    │  │   (Immutable records)   │  │
                    │  └─────────────────────────┘  │
                    └───────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Hardhat
- Chainlink CRE CLI
- API keys: Etherscan, Gemini, Alchemy

### Installation

```bash
# Clone repository
git clone https://github.com/sentinel-team/sentinel.git
cd sentinel

# Install dependencies
cd contracts && npm install
cd ../frontend && npm install

# Configure environment
cp ../.env.example ../.env
# Edit .env with your API keys
```

### Local Development

```bash
# 1. Start local Hardhat node
cd contracts
npx hardhat node

# 2. Deploy contracts (new terminal)
npx hardhat run scripts/deploy.js --network hardhat

# 3. Save contract addresses to workflow secrets
# Update workflow/secrets.yaml with deployed addresses

# 4. Run CRE workflow simulation
cre workflow simulate workflow/sentinel-workflow.ts \
  --input '{"contractAddress": "<VULNERABLE_VAULT_ADDRESS>", "chainId": 31337}' \
  --secrets workflow/secrets.yaml

# 5. Start frontend (new terminal)
cd frontend
npm run dev
```

### Testnet Deployment

```bash
# Deploy to Sepolia
cd contracts
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <REGISTRY_ADDRESS>
npx hardhat verify --network sepolia <AUDIT_LOGGER_ADDRESS>
npx hardhat verify --network sepolia <GUARDIAN_ADDRESS> <REGISTRY_ADDRESS>
```

---

## 📋 Contract Addresses

### Sepolia Testnet

| Contract | Address | Status |
|----------|---------|--------|
| SentinelRegistry | `0x...` | 🟢 Active |
| EmergencyGuardian | `0x...` | 🟢 Active |
| AuditLogger | `0x...` | 🟢 Active |

*Update these after deployment*

---

## 🔧 Configuration

### Workflow Secrets (`workflow/secrets.yaml`)

```yaml
# Etherscan API Key
etherscanApiKey: "your_etherscan_api_key"

# Google Gemini API Key  
geminiApiKey: "your_gemini_api_key"

# Contract Addresses (after deployment)
guardianContractAddress: "0x..."
auditLoggerAddress: "0x..."

# Gas settings
maxFeePerGas: "50000000000"
maxPriorityFeePerGas: "2000000000"
```

### Environment Variables (`.env`)

```bash
# Deployment
PRIVATE_KEY=your_private_key
ALCHEMY_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key

# Frontend
VITE_ALCHEMY_KEY=your_alchemy_key
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
```

---

## 🧪 Testing

### Unit Tests

```bash
cd contracts
npx hardhat test
```

### Integration Tests

```bash
# Test full flow
npx hardhat test test/Sentinel.test.js --network hardhat
```

### Demo Scenarios

See [simulation/demo-script.md](simulation/demo-script.md) for step-by-step demo scenarios:

1. **Reentrancy Attack Prevention**: Detect and block reentrancy
2. **Access Control Detection**: Identify missing modifiers
3. **Safe Contract Verification**: Confirm secure patterns
4. **Confidential Compute Privacy**: Verify mempool privacy

---

## 📖 How It Works

### 1. Contract Registration

Protocols opt-in by registering and staking ETH:

```solidity
// Stake 0.01+ ETH to activate protection
registry.register{value: 0.01 ether}(contractAddress);
```

### 2. AI Security Scanning

The CRE workflow fetches source code and analyzes it:

```typescript
.step('ai_security_analysis', {
  llm: {
    provider: 'google',
    model: 'gemini-1.5-pro',
    prompt: 'Analyze for reentrancy, overflow, access control...',
    temperature: 0.1 // Deterministic output
  }
})
```

### 3. Risk Evaluation

Workflow logic determines response based on severity:

| Severity | Confidence | Action | Response Time |
|----------|-----------|--------|---------------|
| CRITICAL | > 0.85 | PAUSE | < 5 seconds |
| HIGH | > 0.70 | ALERT | < 30 seconds |
| MEDIUM | > 0.60 | WARN | < 5 minutes |
| LOW | - | LOG | Batch |

### 4. Confidential Emergency Response

Critical vulnerabilities trigger private pauses:

```typescript
.step('confidential_pause', {
  confidentialCompute: {
    condition: 'severity === "CRITICAL"',
    evm: {
      privacy: 'full', // Hidden from mempool!
      function: 'emergencyPause(address,bytes32)'
    }
  }
})
```

### 5. Audit Logging

All scans recorded immutably on-chain:

```solidity
function logScan(address target, bytes32 vulnHash, uint8 severity)
```

---

## 🔒 Security Features

### Confidential HTTP
- API keys never in logs, containers, or git
- Encrypted end-to-end
- Certificate pinning

### Confidential Compute
- Transaction hidden from mempool
- Calldata encrypted until execution
- Front-running protection

### Immutable Audit Trail
- All scans logged on-chain
- SHA256 hashed vulnerability details
- Non-repudiable timestamps

---

## 🎨 Frontend

The React dashboard provides:

- 🔍 **Contract Scanner**: Submit addresses for AI analysis
- 📊 **Live Activity Feed**: Real-time scan results
- 🛡️ **Protection Leaderboard**: TVL protected, active pauses
- 📈 **Risk Analytics**: Historical vulnerability trends
- 📝 **Registration Portal**: Opt-in interface for protocols

```bash
cd frontend
npm run dev  # http://localhost:3000
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- **Chainlink Labs** for CRE (Confidential Runtime Environment)
- **Google** for Gemini AI
- **OpenZeppelin** for security contracts
- **Chainlink Convergence Hackathon 2026** judges

---

## 📞 Contact

- Twitter: [@SentinelOracle](https://twitter.com/SentinelOracle)
- Discord: [Sentinel Community](https://discord.gg/sentinel)
- Email: team@sentinel.io

---

## ⚠️ Disclaimer

Sentinel is experimental software for the Chainlink Convergence Hackathon. It has not been audited and should not be used to secure production assets without proper review.

**Use at your own risk.**

---

<p align="center">
  <sub>Built with ❤️ for the Chainlink Convergence Hackathon 2026</sub>
</p>
