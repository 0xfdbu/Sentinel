# Sentinel Contract Addresses

## ⚠️ IMPORTANT: Deployment Required

**I cannot deploy contracts for you** because I don't have access to:
- A funded wallet with Sepolia ETH
- Private keys
- Network connectivity to broadcast transactions

**You need to deploy these contracts yourself** using the guide below.

---

## ✅ Already Deployed on Sepolia

These core contracts are already live on Sepolia testnet:

### Core Sentinel System

| Contract | Address | Etherscan | Status |
|----------|---------|-----------|--------|
| **SentinelRegistry** | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` | [View](https://sepolia.etherscan.io/address/0x774B96F8d892A1e4482B52b3d255Fa269136A0E9) | ✅ Verified |
| **EmergencyGuardian** | `0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1` | [View](https://sepolia.etherscan.io/address/0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1) | ✅ Verified |
| **AuditLogger** | `0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD` | [View](https://sepolia.etherscan.io/address/0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD) | ✅ Verified |

### Legacy Demo Contracts

| Contract | Address | Etherscan | Status |
|----------|---------|-----------|--------|
| **VulnerableVault** | `0x75a7168502442f3204689424E480c50d7D6e7be0` | [View](https://sepolia.etherscan.io/address/0x75a7168502442f3204689424E480c50d7D6e7be0) | ✅ Verified |

---

## ❌ NOT YET DEPLOYED (You Need to Deploy These)

### New for Risk & Compliance Track

| Contract | Status | Purpose |
|----------|--------|---------|
| **PausableVulnerableVault** | ❌ Not deployed | OpenZeppelin-based vault with reentrancy |
| **MockERC20** | ❌ Not deployed | Test token (mDAI) |
| **ReentrancyAttacker** | ❌ Not deployed | Attack demonstration |
| **ReserveHealthMonitor** | ❌ Not deployed | TVL monitoring |
| **RiskProfileRegistry** | ❌ Not deployed | Risk profiles & compliance |

---

## 🚀 How to Deploy

### Step 1: Get Sepolia ETH

You need Sepolia ETH to deploy. Get it from:
- https://sepoliafaucet.com/
- https://faucet.chain.link/
- https://www.alchemy.com/faucets/ethereum-sepolia

Minimum needed: ~0.05 ETH (for 5 contract deployments)

### Step 2: Configure Environment

```bash
cd sentinel/contracts

# Create .env file
cat > .env << 'EOF'
# Your wallet private key (with 0x prefix)
PRIVATE_KEY=0xyour_private_key_here

# Alchemy or Infura API key
ALCHEMY_KEY=your_alchemy_key

# Etherscan API key (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
EOF
```

### Step 3: Deploy New Contracts

```bash
# Install dependencies (if not done)
npm install

# Deploy all new contracts
cd sentinel/contracts
npx hardhat run scripts/deploy-new-contracts.js --network sepolia
```

### Expected Output

```
╔═══════════════════════════════════════════════════════════╗
║              DEPLOYMENT COMPLETE                          ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  MockERC20                0xABC123...                     ║
║  PausableVulnerableVault  0xDEF456...                     ║
║  ReentrancyAttacker       0xGHI789...                     ║
║  ReserveHealthMonitor     0xJKL012...                     ║
║  RiskProfileRegistry      0xMNO345...                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 4: Verify Contracts

After deployment, verify on Etherscan:

```bash
# Replace <ADDRESS> with actual deployed addresses

# MockERC20
npx hardhat verify --network sepolia <MOCK_TOKEN_ADDRESS> "Mock DAI" "mDAI" 18

# PausableVulnerableVault
npx hardhat verify --network sepolia <VAULT_ADDRESS> <MOCK_TOKEN_ADDRESS>

# ReentrancyAttacker
npx hardhat verify --network sepolia <ATTACKER_ADDRESS> <VAULT_ADDRESS> <MOCK_TOKEN_ADDRESS>

# ReserveHealthMonitor
npx hardhat verify --network sepolia <RESERVE_HEALTH_ADDRESS> \
  0x774B96F8d892A1e4482B52b3d255Fa269136A0E9 \
  0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1

# RiskProfileRegistry
npx hardhat verify --network sepolia <RISK_PROFILE_ADDRESS> \
  0x774B96F8d892A1e4482B52b3d255Fa269136A0E9
```

---

## 📝 Template for Your Records

After deploying, fill in your actual addresses:

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "deployer": "YOUR_ADDRESS",
  "timestamp": "2026-02-17T00:00:00Z",
  "contracts": {
    "SentinelRegistry": "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9",
    "EmergencyGuardian": "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
    "AuditLogger": "0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD",
    "MockERC20": "YOUR_DEPLOYED_ADDRESS",
    "PausableVulnerableVault": "YOUR_DEPLOYED_ADDRESS",
    "ReentrancyAttacker": "YOUR_DEPLOYED_ADDRESS",
    "ReserveHealthMonitor": "YOUR_DEPLOYED_ADDRESS",
    "RiskProfileRegistry": "YOUR_DEPLOYED_ADDRESS"
  }
}
```

---

## 🎯 For Hackathon Submission

Include these addresses in your submission:

### Core System (Already Live)
```
Registry: 0x774B96F8d892A1e4482B52b3d255Fa269136A0E9
Guardian: 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1
AuditLogger: 0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD
```

### Demo Contracts (Deploy These)
```
PausableVulnerableVault: [YOUR_ADDRESS]
MockERC20: [YOUR_ADDRESS]
ReentrancyAttacker: [YOUR_ADDRESS]
```

### Risk & Compliance Features (Deploy These)
```
ReserveHealthMonitor: [YOUR_ADDRESS]
RiskProfileRegistry: [YOUR_ADDRESS]
```

---

## 💻 Local Development (Hardhat)

For local testing, contracts deploy to deterministic addresses:

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy-new-contracts.js --network hardhat
```

Local addresses are saved to:
- `contracts/deployments/hardhat.json`
- `contracts/deployments/hardhat-latest.json`

---

## 🔗 Resources

- **Sepolia Etherscan**: https://sepolia.etherscan.io
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Chainlink Faucet**: https://faucet.chain.link/
- **Hardhat Docs**: https://hardhat.org/docs

---

## ⚠️ Security Warning

**Never share your private key or commit it to git!**

The `.env` file is already in `.gitignore`, but always double-check before committing.

---

## 🆘 Troubleshooting

### "Insufficient funds"
- Get more Sepolia ETH from faucets
- You need ~0.05 ETH for all deployments

### "Nonce too high"
- Reset your wallet in MetaMask
- Or wait for pending transactions

### "Verification failed"
- Wait 5 minutes for contract to be indexed
- Ensure compiler version matches
- Check constructor arguments

---

**Need help?** Check the full deployment guide: `sentinel/DEPLOYMENT.md`
