# ETH-Backed USDA Minting - Complete Setup Guide

## ✅ Deployment Complete

All components have been deployed and configured for ETH-collateralized USDA minting via CRE workflow.

---

## Deployed Contracts (Sepolia Testnet)

| Component | Address | Purpose |
|-----------|---------|---------|
| **SentinelVaultETHSimple** | `0x12fe97b889158380e1D94b69718F89E521b38c11` | Accepts ETH deposits, emits events |
| **MintingConsumerWithACE** | `0x373b0eEE4edd6ca7d8dBC310b8430bac7A5172E9` | Receives DON reports, transfers USDA |
| **USDA Token (V3)** | `0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6` | Stablecoin contract |
| **Chainlink ETH/USD** | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | Price feed reference |

---

## How Minting Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETH-BACKED USDA MINTING FLOW                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER deposits ETH → SentinelVaultETHSimple                  │
│     cast send 0x12fe97b889158380e1D94b69718F89E521b38c11        │
│          "depositETH()" --value 0.01ether                       │
│                                                                  │
│  2. Vault emits ETHDeposited event                              │
│     Event: (user, ethAmount, ethPrice, mintRequestId, index)    │
│                                                                  │
│  3. CRE WORKFLOW auto-triggers on EVM Log                       │
│     - Fetches prices from 3 exchanges (Coinbase/Kraken/Binance) │
│     - Calculates median consensus price                         │
│     - Checks ScamSniffer blacklist                              │
│     - Checks bank reserves via PoR API                          │
│     - LLM final review (xAI Grok)                               │
│     - Creates DON-signed report                                 │
│                                                                  │
│  4. WORKFLOW broadcasts to MintingConsumer                      │
│     - Calls writeReport() with mint instruction                 │
│     - Report: (INSTRUCTION_MINT, beneficiary, amount, bankRef)  │
│                                                                  │
│  5. MintingConsumer transfers USDA to user                      │
│     - ACE policy check enforced (blacklist/volume)              │
│     - USDA transferred from consumer balance                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Configuration

File: `workflows/eth-por-unified/config.json`

```json
{
  "name": "eth-por-unified",
  "version": "1.1.0",
  "sepolia": {
    "vaultAddress": "0x12fe97b889158380e1D94b69718F89E521b38c11",
    "mintingConsumerAddress": "0x373b0eEE4edd6ca7d8dBC310b8430bac7A5172E9",
    "usdaToken": "0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6"
  },
  "decimals": 18
}
```

---

## Next Steps

### 1. Deploy Workflow to Production (Requires Early Access)

```bash
cd /path/to/sentinel

# Request access if not already granted
# https://cre.chain.link/request-access

# Deploy workflow
cre workflow deploy ./workflows/eth-por-unified --target production
```

### 2. Fund the MintingConsumer

The MintingConsumer needs USDA balance to transfer to users:

```bash
# Check current balance
cast call 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6 \
  "balanceOf(address)(uint256)" \
  0x373b0eEE4edd6ca7d8dBC310b8430bac7A5172E9 \
  --rpc-url $SEPOLIA_RPC

# If needed, mint USDA to the MintingConsumer (as admin)
# or transfer from your wallet
```

### 3. Test Deposit + Mint Flow

```bash
# Set environment
export SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
export PRIVATE_KEY=0x...  # Your test wallet key

# Make a deposit (minimum 0.001 ETH)
cast send 0x12fe97b889158380e1D94b69718F89E521b38c11 \
  "depositETH()" \
  --value 0.01ether \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY

# Check your deposit
cast call 0x12fe97b889158380e1D94b69718F89E521b38c11 \
  "getUserDepositCount(address)(uint256)" \
  YOUR_WALLET_ADDRESS \
  --rpc-url $SEPOLIA_RPC
```

### 4. Monitor Workflow Execution

Once deployed, monitor workflow runs:

```bash
# View workflow logs
cre workflow logs

# Check specific execution
```

---

## Contract Interactions

### SentinelVaultETHSimple

```solidity
// Deposit ETH
function depositETH() external payable returns (bytes32 mintRequestId, uint256 depositIndex)

// View functions
function getUserDepositCount(address user) external view returns (uint256)
function getDeposit(address user, uint256 index) external view returns (Deposit memory)
function getLatestDeposit(address user) external view returns (Deposit memory)
function totalETHDeposited() external view returns (uint256)

// Admin
function setMinimumDeposit(uint256 _min) external onlyRole(DEFAULT_ADMIN_ROLE)
function pause() / unpause()
```

### MintingConsumerWithACE

```solidity
// Called by CRE workflow (via Forwarder)
function onReport(bytes calldata metadata, bytes calldata report) external onlyForwarder

// Emergency mint (bank operator only)
function emergencyMint(address to, uint256 amount, bytes32 bankRef) external onlyBankOperator

// View
function forwarder() external view returns (address)
function bankOperator() external view returns (address)
function isPaused() external view returns (bool)
```

---

## Event Signatures

| Event | Signature |
|-------|-----------|
| ETHDeposited | `ETHDeposited(address,uint256,uint256,bytes32,uint256)` |
| MintCompleted | `MintCompleted(address,uint256,uint256,bytes32)` |
| MintRequested | `MintRequested(bytes32,address,uint256,bytes32)` |

---

## Troubleshooting

### Issue: Workflow not triggering
- Verify vault address in config.json
- Check that CRE has EVM Log trigger capability enabled
- Ensure workflow is deployed to correct DON

### Issue: Mint fails with "Insufficient balance"
- MintingConsumer needs USDA tokens to transfer
- Fund the consumer contract with USDA

### Issue: "ACE REJECTED" error
- Beneficiary address may be blacklisted
- Check BlacklistPolicyDON contract
- Or volume limit may be exceeded

### Issue: "OnlyForwarder" error
- Report must come through CRE Forwarder
- Direct calls to onReport() will fail

---

## GitHub Repository

All changes committed to: https://github.com/0xfdbu/Sentinel

**Latest commits:**
- `cb6c65d` - feat: Deploy SentinelVaultETHSimple for CRE minting workflow
- `0c85178` - fix: Update ETH-PoR workflow event signature

---

## Resources

- **CRE Documentation**: https://docs.chain.link/cre
- **Sepolia Explorer**: https://sepolia.etherscan.io
- **Workflow Config**: `sentinel/workflows/eth-por-unified/config.json`
- **Vault Contract**: `sentinel/contracts/src/por/SentinelVaultETHSimple.sol`
