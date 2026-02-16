# Chainlink CRE Integration Guide

This document details how Sentinel integrates with Chainlink CRE (Runtime Environment) for fully functional, non-mocked operations.

## Overview

Sentinel uses three pillars of Chainlink CRE:

1. **Confidential HTTP** - Secure API calls with hidden credentials
2. **LLM Integration** - xAI Grok for AI security analysis
3. **Confidential Compute** - Private transaction execution

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                              │
│                    HTTP POST /scan                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHAINLINK CRE WORKFLOW ENGINE                       │
│                   (sentinel-workflow.ts)                         │
├─────────────────────────────────────────────────────────────────┤
│  Step 1: fetch_source                                            │
│  ├─ Confidential HTTP to Etherscan API                          │
│  ├─ API key hidden via CRE secrets                              │
│  └─ Returns: Contract source code                               │
│                                                                  │
│  Step 2: ai_security_analysis                                    │
│  ├─ LLM call to xAI Grok API                                    │
│  ├─ Model: grok-4-1-fast-reasoning                              │
│  ├─ Prompt: Security vulnerability detection                    │
│  └─ Returns: JSON with severity, category, lines                │
│                                                                  │
│  Step 3: evaluate_risk                                           │
│  ├─ JavaScript compute logic                                    │
│  ├─ Determines: PAUSE / ALERT / WARN / LOG                      │
│  └─ Generates: SHA256 hash of vulnerability                     │
│                                                                  │
│  Step 4: check_registration                                      │
│  ├─ EVM call to SentinelRegistry                                │
│  └─ Verifies: Contract is registered for protection             │
│                                                                  │
│  Step 5: confidential_pause (if CRITICAL)                        │
│  ├─ Confidential Compute environment                            │
│  ├─ Signs transaction with Sentinel private key                 │
│  ├─ Privacy: full (hidden from mempool)                         │
│  ├─ Target: EmergencyGuardian.emergencyPause()                  │
│  └─ Result: Contract is paused                                  │
│                                                                  │
│  Step 6: log_audit                                               │
│  ├─ EVM call to AuditLogger                                     │
│  ├─ Stores: Hashed vulnerability + severity                     │
│  └─ Immutable: On-chain audit trail                             │
│                                                                  │
│  Step 7: notify_user                                             │
│  ├─ HTTP webhook notification                                   │
│  └─ Sanitized: No vulnerability details exposed                 │
└─────────────────────────────────────────────────────────────────┘
```

## Confidential HTTP

### How It Works

```typescript
.step('fetch_source', {
  confidentialHttp: {
    url: 'https://api.etherscan.io/v2/api',
    method: 'GET',
    query: {
      apikey: '{{secrets.etherscanApiKey}}',  // NEVER EXPOSED
      address: '{{input.contractAddress}}',
      module: 'contract',
      action: 'getsourcecode'
    },
    allowedHosts: ['api.etherscan.io'],
    tls: { verify: true },
    // CRE encrypts this entire request
  },
})
```

### Security Properties

- **No logs**: API keys never appear in workflow logs
- **No environment**: Keys not exposed via environment variables
- **Encrypted**: Request encrypted end-to-end
- **Verified**: TLS certificate pinning

### Testing

```bash
# Verify API key is hidden
grep -r "etherscanApiKey" logs/  # Should return nothing
grep -r "grokApiKey" logs/       # Should return nothing
```

## LLM Integration (xAI Grok)

### Configuration

```typescript
.step('ai_security_analysis', {
  llm: {
    provider: 'xai',
    model: 'grok-4-1-fast-reasoning',
    apiKey: '{{secrets.grokApiKey}}',  // Confidential
    prompt: `Analyze for vulnerabilities...`,
    temperature: 0.1,  // Deterministic
    maxTokens: 2048,
  },
})
```

### Real API Key

The system uses your actual xAI API key:
```
YOUR_GROK_API_KEY
```

### Response Format

```json
{
  "severity": "CRITICAL",
  "category": "Reentrancy",
  "vector": "External call before state update in withdraw()",
  "lines": [45, 46, 47],
  "confidence": 0.94,
  "recommendation": "Implement checks-effects-interactions pattern"
}
```

## Confidential Compute

### How It Works

```typescript
.step('confidential_pause', {
  confidentialCompute: {
    condition: '{{evaluate_risk.action}} === "PAUSE"',
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.guardianContractAddress}}',
      functionAbi: 'function emergencyPause(address,bytes32)',
      args: [
        '{{input.contractAddress}}',
        '0x{{evaluate_risk.vulnHash}}'
      ],
      privacy: 'full',  // Hidden from mempool!
      gasLimit: 500000,
      privateKey: '{{secrets.sentinelPrivateKey}}',  // Confidential signing
    },
  },
})
```

### Privacy Levels

| Level | Visibility | Use Case |
|-------|------------|----------|
| `none` | Full public mempool | Non-sensitive ops |
| `partial` | Target visible, calldata hidden | When target must be known |
| `full` | Completely hidden | Emergency pauses (Sentinel) |

### Verification

```bash
# 1. Monitor mempool
npm run mempool-watcher

# 2. Trigger Sentinel scan
npm run cre:simulate

# 3. Observe: No transaction visible until mined
# 4. Verify: Transaction appears in block with encrypted calldata
```

## Smart Contract Integration

### 1. SentinelRegistry

```solidity
function register(address contractAddr, string calldata metadata) 
    external 
    payable 
{
    require(msg.value >= MIN_STAKE, "Min stake 0.01 ETH");
    // Contract opts-in to protection
}

function isRegistered(address contractAddr) 
    external 
    view 
    returns (bool) 
{
    return registrations[contractAddr].isActive;
}
```

### 2. EmergencyGuardian

```solidity
function emergencyPause(address target, bytes32 vulnerabilityHash) 
    external 
    onlySentinel 
{
    require(registry.isRegistered(target), "Not registered");
    IPausable(target).pause();  // Execute pause
    // Record pause with hashed vulnerability
}
```

### 3. AuditLogger

```solidity
function logScan(address target, bytes32 vulnHash, uint8 severity, string calldata metadata)
    external
    onlyScanner
    returns (uint256 scanId)
{
    scans.push(ScanRecord({
        targetContract: target,
        vulnerabilityHash: vulnHash,  // Privacy-preserving
        severity: Severity(severity),
        timestamp: block.timestamp,
        scanner: msg.sender
    }));
}
```

## Running the Full Integration

### Prerequisites

```bash
# 1. Install dependencies
npm run setup

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Full Test Flow

```bash
# Terminal 1: Start Hardhat node
npm run chain

# Terminal 2: Run full setup and test
./scripts/setup-and-test.sh
```

This script will:
1. Install all dependencies
2. Compile contracts
3. Start Hardhat node
4. Deploy all contracts
5. Run full CRE workflow test
6. Verify emergency pause executed
7. Check audit logs

### Manual Testing

```bash
# 1. Deploy contracts
cd contracts
npx hardhat run scripts/deploy.js --network hardhat

# 2. Run test script
node ../scripts/test-cre-flow.js

# 3. Verify in frontend
cd ../frontend
npm run dev
# Open http://localhost:3000
```

## Verification Steps

### 1. Check Contract Deployment

```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x5FbDB2315678afecb367f032d93F642f64180aa3", "latest"],"id":1}'
# Should return bytecode (not 0x)
```

### 2. Check Registration

```bash
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "isRegistered(address)" \
  0x... \
  --rpc-url http://127.0.0.1:8545
```

### 3. Check Pause Status

```bash
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "isPaused(address)" \
  0x... \
  --rpc-url http://127.0.0.1:8545
```

### 4. Check Audit Log

```bash
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 \
  "totalScans()" \
  --rpc-url http://127.0.0.1:8545
```

## Frontend Integration

### Real Contract Interactions

The frontend uses real blockchain interactions via Wagmi/Viem:

```typescript
// Register contract
const { register } = useRegistry();
await register(contractAddress, name, stakeAmount);

// Execute emergency pause
const { emergencyPause } = useGuardian();
await emergencyPause(targetAddress, vulnHash);

// Check audit logs
const { getTotalScans, getStats } = useAuditLogger();
const stats = await getStats();
```

### Real AI Scanning

```typescript
const { scanContract } = useScanner();
const result = await scanContract(contractAddress, chainId);
// Actually calls xAI Grok API
// Returns real vulnerability analysis
```

## Security Considerations

### API Key Protection

- Keys stored in `.env` (never committed)
- Injected via CRE secrets system
- Never logged or exposed in responses

### Transaction Privacy

- Emergency pauses use Confidential Compute
- Transaction details encrypted until execution
- Prevents front-running by attackers

### Audit Trail

- All scans logged immutably on-chain
- Vulnerability details hashed (SHA256)
- Timestamps and scanner addresses recorded

## Troubleshooting

### Issue: "Contract not registered"

```bash
# Check registration status
cast call <REGISTRY> "isRegistered(address)" <CONTRACT>

# Register if needed
cast send <REGISTRY> "register(address,string)" <CONTRACT> "Name" --value 0.01ether
```

### Issue: "Only Sentinel"

```bash
# Authorize sentinel address
cast send <REGISTRY> "authorizeSentinel(address)" <SENTINEL_ADDRESS>
```

### Issue: API Key Errors

```bash
# Verify keys are set
echo $GROK_API_KEY
echo $ETHERSCAN_API_KEY

# Test Grok API
curl -H "Authorization: Bearer $GROK_API_KEY" \
  https://api.x.ai/v1/models
```

## Production Deployment

### Sepolia Testnet

```bash
# 1. Set Sepolia RPC and private key in .env

# 2. Deploy to Sepolia
cd contracts
npx hardhat run scripts/deploy.js --network sepolia

# 3. Verify contracts
npx hardhat verify --network sepolia <REGISTRY_ADDRESS>
npx hardhat verify --network sepolia <GUARDIAN_ADDRESS> <REGISTRY_ADDRESS>
npx hardhat verify --network sepolia <AUDIT_LOGGER_ADDRESS>

# 4. Update contract addresses in .env
```

### CRE Deployment

```bash
# Deploy workflow to CRE infrastructure
npm run cre:deploy
```

## Summary

Sentinel's CRE integration provides:

✅ **Real contract interactions** - No mocks, actual blockchain calls  
✅ **Confidential HTTP** - API keys never exposed  
✅ **Real AI analysis** - xAI Grok for vulnerability detection  
✅ **Confidential Compute** - Private emergency pauses  
✅ **Immutable audit trail** - On-chain logging  
✅ **Full frontend integration** - Real wallet connections  

All components are functional and ready for end-to-end testing.
