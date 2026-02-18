# Sentinel Contract Deployment Guide

This guide provides contract addresses and deployment instructions for both local (Hardhat) and testnet (Sepolia) environments.

---

## 📍 Sepolia Testnet Deployment

### Existing Core Contracts (Already Deployed)

| Contract | Address | Status |
|----------|---------|--------|
| **SentinelRegistry** | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` | ✅ Active |
| **EmergencyGuardian** | `0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1` | ✅ Active |
| **AuditLogger** | `0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD` | ✅ Active |

### Existing Demo Contracts

| Contract | Address | Status |
|----------|---------|--------|
| **VulnerableVault (Legacy)** | `0x75a7168502442f3204689424E480c50d7D6e7be0` | ✅ Verified |

### New Contracts to Deploy (Not Yet on Sepolia)

These contracts need to be deployed for full functionality:

| Contract | Status | Purpose |
|----------|--------|---------|
| **PausableVulnerableVault** | ❌ Not deployed | OpenZeppelin-based demo vault |
| **MockERC20** | ❌ Not deployed | Test token for vault |
| **ReentrancyAttacker** | ❌ Not deployed | Attack demonstration |
| **ReserveHealthMonitor** | ❌ Not deployed | TVL monitoring (Risk & Compliance) |
| **RiskProfileRegistry** | ❌ Not deployed | Risk profiles (Risk & Compliance) |

---

## 🚀 Deployment Instructions

### Prerequisites

```bash
# 1. Ensure you have Sepolia ETH
# Get from: https://sepoliafaucet.com/ or https://faucet.chain.link/

# 2. Set up environment variables
cd sentinel/contracts
cp .env.example .env

# Edit .env with your:
# - PRIVATE_KEY (with 0x prefix)
# - ALCHEMY_KEY or INFURA_KEY
# - ETHERSCAN_API_KEY (for verification)
```

### Deploy All Contracts to Sepolia

```bash
cd sentinel/contracts

# Deploy everything
npx hardhat run scripts/deploy.js --network sepolia

# This will:
# 1. Deploy new contracts
# 2. Save addresses to deployments/sepolia.json
# 3. Output verification commands
```

### Expected Output

```
Deploying contracts with account: 0xYourAddress...

Deploying SentinelRegistry...
SentinelRegistry deployed to: 0x... (existing: 0x774B96F8d892A1e4482B52b3d255Fa269136A0E9)

Deploying PausableVulnerableVault...
PausableVulnerableVault deployed to: 0xNEW_ADDRESS

Deploying MockERC20...
MockERC20 deployed to: 0xNEW_ADDRESS

=== DEPLOYMENT SUMMARY ===
PausableVulnerableVault: 0x...
MockERC20: 0x...
ReentrancyAttacker: 0x...
ReserveHealthMonitor: 0x...
RiskProfileRegistry: 0x...
==========================
```

---

## 🔍 Verification Commands

After deployment, verify contracts on Etherscan:

### Core Contracts (Already Verified)

These are already verified on Sepolia Etherscan:
- Registry: https://sepolia.etherscan.io/address/0x774B96F8d892A1e4482B52b3d255Fa269136A0E9
- Guardian: https://sepolia.etherscan.io/address/0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1
- AuditLogger: https://sepolia.etherscan.io/address/0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD

### New Contract Verification

After deploying new contracts, run:

```bash
# PausableVulnerableVault
npx hardhat verify --network sepolia \
  <PAUSABLE_VAULT_ADDRESS> \
  <MOCK_TOKEN_ADDRESS>

# MockERC20
npx hardhat verify --network sepolia \
  <MOCK_TOKEN_ADDRESS> \
  "Mock DAI" "mDAI" 18

# ReentrancyAttacker
npx hardhat verify --network sepolia \
  <ATTACKER_ADDRESS> \
  <PAUSABLE_VAULT_ADDRESS> \
  <MOCK_TOKEN_ADDRESS>

# ReserveHealthMonitor
npx hardhat verify --network sepolia \
  <RESERVE_HEALTH_ADDRESS> \
  <REGISTRY_ADDRESS> \
  <GUARDIAN_ADDRESS>

# RiskProfileRegistry
npx hardhat verify --network sepolia \
  <RISK_PROFILE_ADDRESS> \
  <REGISTRY_ADDRESS>
```

---

## 💻 Local Hardhat Deployment

For local testing and development:

```bash
# Terminal 1: Start Hardhat node
cd sentinel/contracts
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network hardhat

# This creates:
# - deployments/hardhat.json
# - deployments/hardhat-latest.json (for frontend)
```

### Local Addresses (Deterministic on Hardhat)

When running on Hardhat with default settings, contracts are deployed to:

| Contract | Hardhat Address |
|----------|-----------------|
| SentinelRegistry | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| EmergencyGuardian | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| AuditLogger | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| PausableVulnerableVault | Auto-generated |
| MockERC20 | Auto-generated |
| ReentrancyAttacker | Auto-generated |

---

## 📋 Quick Reference: Sepolia Contract Addresses

### For Hackathon Submission

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contracts": {
    "SentinelRegistry": "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9",
    "EmergencyGuardian": "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
    "AuditLogger": "0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD",
    "VulnerableVault": "0x75a7168502442f3204689424E480c50d7D6e7be0"
  },
  "explorer": "https://sepolia.etherscan.io"
}
```

### Etherscan Links

- **Registry**: https://sepolia.etherscan.io/address/0x774B96F8d892A1e4482B52b3d255Fa269136A0E9
- **Guardian**: https://sepolia.etherscan.io/address/0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1
- **AuditLogger**: https://sepolia.etherscan.io/address/0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD
- **VulnerableVault**: https://sepolia.etherscan.io/address/0x75a7168502442f3204689424E480c50d7D6e7be0

---

## 🔧 Updating Frontend with New Addresses

After deploying to Sepolia, update `sentinel/frontend/src/utils/wagmi.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  hardhat: {
    // ... hardhat addresses
  },
  sepolia: {
    registry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9',
    guardian: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1',
    auditLogger: '0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD',
    reserveHealthMonitor: '<NEW_ADDRESS>',
    riskProfileRegistry: '<NEW_ADDRESS>',
    pausableVault: '<NEW_ADDRESS>',
    mockToken: '<NEW_ADDRESS>',
  },
}
```

Also update `sentinel/workflow/secrets.yaml`:

```yaml
# Sepolia Contract Addresses
guardianContractAddress: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"
auditLoggerAddress: "0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD"
registryContractAddress: "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9"
```

---

## ⚠️ Important Notes

1. **Sepolia ETH**: You need Sepolia ETH to deploy. Get it from:
   - https://sepoliafaucet.com/
   - https://faucet.chain.link/
   - https://www.alchemy.com/faucets/ethereum-sepolia

2. **Gas Prices**: Check current Sepolia gas prices before deploying

3. **Verification**: Always verify contracts after deployment for hackathon judging

4. **Private Keys**: Never commit private keys to git! Use `.env` file (already in `.gitignore`)

---

## 🆘 Troubleshooting

### "Insufficient funds"
```bash
# Get more Sepolia ETH
# You need ~0.01 ETH per contract deployment
```

### "Nonce too high"
```bash
# Reset nonce in MetaMask or wallet
# Or wait for pending transactions to clear
```

### "Contract verification failed"
```bash
# Wait a few minutes for contract to be indexed
# Then retry verification command
```

---

## 📞 Need Help?

For hackathon support:
1. Check Hardhat console for detailed error messages
2. Verify your PRIVATE_KEY has the `0x` prefix
3. Ensure you have enough Sepolia ETH
4. Check network status: https://sepolia.etherscan.io
