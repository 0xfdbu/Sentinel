# Sentinel Demo Script

## Overview
This script demonstrates the complete Sentinel flow from vulnerability detection to emergency response.

**Duration**: 3-5 minutes
**Prerequisites**: Contracts deployed on Sepolia, CRE CLI configured

---

## Demo Flow

### 1. Setup (0:00-0:30)

**Show vulnerable contract deployed:**
```bash
# Contract: VulnerableVault.sol
# Address: 0x... (from deployments/sepolia.json)
# TVL: 10 ETH at risk
```

**Check initial state:**
```bash
cast call <VAULT_ADDRESS> "getBalance()" --rpc-url $SEPOLIA_RPC
# Output: 10000000000000000000 (10 ETH)
```

### 2. Registration (0:30-1:00)

**Owner opts in to Sentinel protection:**
```bash
# Connect wallet as contract owner
cast send <REGISTRY_ADDRESS> \
  "register(address)" \
  <VAULT_ADDRESS> \
  --value 0.01ether \
  --rpc-url $SEPOLIA_RPC \
  --private-key $OWNER_KEY
```

**Verify registration:**
```bash
cast call <REGISTRY_ADDRESS> \
  "isRegistered(address)" \
  <VAULT_ADDRESS> \
  --rpc-url $SEPOLIA_RPC
# Output: true
```

### 3. Attack Simulation (1:00-2:00)

**Show attacker monitoring mempool:**
```bash
# Terminal 1: Watch mempool
npm run watch-mempool -- --network sepolia

# Explain: Attackers use MEV bots to frontrun security responses
# But Confidential Compute hides the pause transaction!
```

**Deploy attacker contract:**
```bash
cast send <ATTACKER_ADDRESS> \
  "attack()" \
  --value 1ether \
  --rpc-url $SEPOLIA_RPC \
  --private-key $ATTACKER_KEY
```

### 4. Sentinel Activation (2:00-3:30)

**Trigger Sentinel scan:**
```bash
# HTTP trigger to CRE workflow
curl -X POST https://cre.chain.link/workflows/sentinel/scan \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "<VAULT_ADDRESS>",
    "chainId": 11155111,
    "alertWebhook": "https://webhook.site/..."
  }'
```

**Show workflow execution:**
```bash
# Terminal: Watch workflow logs
# Show: API keys are hidden (******)
# Show: Source code fetched from Etherscan
# Show: Gemini analyzing code...
# Show: Reentrancy detected!
```

**Monitor confidential pause:**
```bash
# Terminal: Watch for pause transaction
# Explain: Transaction not visible in mempool!
# Then suddenly... included in block
```

### 5. Result (3:30-4:30)

**Verify contract is paused:**
```bash
cast call <VAULT_ADDRESS> "paused()" --rpc-url $SEPOLIA_RPC
# Output: true
```

**Check AuditLogger:**
```bash
cast call <AUDIT_LOGGER_ADDRESS> \
  "getLatestScan(address)" \
  <VAULT_ADDRESS> \
  --rpc-url $SEPOLIA_RPC
# Shows: vulnerabilityHash, severity=3 (CRITICAL), timestamp
```

**Check active pauses:**
```bash
cast call <GUARDIAN_ADDRESS> \
  "isPaused(address)" \
  <VAULT_ADDRESS> \
  --rpc-url $SEPOLIA_RPC
# Output: true
```

**Show funds saved:**
```bash
cast call <VAULT_ADDRESS> "getBalance()" --rpc-url $SEPOLIA_RPC
# Still: 10000000000000000000 (10 ETH safe!)
```

### 6. Technical Deep Dive (4:30-5:00)

**Show CRE workflow code:**
```typescript
// Highlight Confidential HTTP
confidentialHttp: {
  apikey: '{{secrets.etherscanApiKey}}' // Never exposed!
}

// Highlight Confidential Compute
confidentialCompute: {
  privacy: 'full', // Hidden from mempool!
  evm: {
    function: 'emergencyPause(address,bytes32)'
  }
}
```

**Key Points:**
1. API keys never appear in logs or code
2. AI detects specific vulnerability type
3. Emergency pause hidden from mempool
4. Funds protected automatically
5. Immutable audit trail on-chain

---

## Local Simulation

For development without testnet:

```bash
# 1. Start local Hardhat node
cd contracts && npm run node

# 2. Deploy contracts
npm run deploy:local

# 3. Run CRE workflow simulation
cre workflow simulate ../workflow/sentinel-workflow.ts \
  --input '{
    "contractAddress": "<VULNERABLE_VAULT_ADDRESS>",
    "chainId": 31337,
    "alertWebhook": "http://localhost:3000/webhook"
  }' \
  --secrets ../workflow/secrets.yaml

# 4. Verify results
# - Check contract is paused
# - Check AuditLogger has record
# - Verify API keys not in logs
```

---

## Key Commands Reference

### Contract Interactions

**Register a contract:**
```bash
cast send <REGISTRY> "register(address)" <CONTRACT> \
  --value 0.01ether --rpc-url $RPC
```

**Trigger emergency pause (Guardian only):**
```bash
cast send <GUARDIAN> \
  "emergencyPause(address,bytes32)" \
  <CONTRACT> \
  0x1234567890abcdef... \
  --rpc-url $RPC
```

**Lift pause (owner):**
```bash
cast send <GUARDIAN> "liftPause(address)" <CONTRACT> \
  --rpc-url $RPC
```

**Get scan history:**
```bash
cast call <AUDIT_LOGGER> \
  "getContractScans(address)" \
  <CONTRACT> \
  --rpc-url $RPC
```

---

## Troubleshooting

**Issue: "Contract not registered"**
- Solution: Ensure contract is registered with sufficient stake (0.01 ETH)

**Issue: "Only Sentinel" error**
- Solution: Only authorized addresses (CRE workflow output) can trigger pauses

**Issue: Workflow simulation fails**
- Solution: Check secrets.yaml has valid API keys

---

## Video Recording Tips

1. **Terminal**: Use large font (18pt+), clear theme
2. **Browser**: Show Etherscan verification, contract code
3. **Split screen**: Code on left, execution on right
4. **Annotations**: Highlight key code sections
5. **Pacing**: Pause between major steps for clarity
