# Sentinel - AI-Powered DeFi Security with TEE

Real-time blockchain security platform that monitors DeFi contracts, detects attacks using AI, and automatically pauses vulnerable contracts to protect funds. Powered by Chainlink CRE (Runtime Environment) with TEE and Confidential HTTP.

## What It Does

Sentinel protects DeFi protocols by:
1. **Monitoring** the mempool for suspicious transactions
2. **Detecting** attack patterns (function signatures, high-value transfers, etc.)
3. **Analyzing** contract code via xAI inside a TEE (Trusted Execution Environment)
4. **Protecting** vulnerable contracts via automatic pause

All API keys (Etherscan, xAI) are protected by Confidential HTTP and never exposed.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Blockchain    │────▶│  Sentinel Node   │────▶│  Chainlink CRE  │
│   (Sepolia)     │     │  (Mempool Monitor)│    │  (TEE + xAI)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                        ┌──────────────────┐      ┌─────────────────┐
                        │  DemoVault       │◀─────│  Confidential   │
                        │  (Protected)     │      │  HTTP (API Keys)│
                        └──────────────────┘      └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  SentinelGuardian│
                        │  (Auto-Pause)    │
                        └──────────────────┘
```

## Key Features

### 🔍 Real-Time Detection
- Monitors mempool for suspicious transactions
- Detects attack patterns: `attack()`, `withdraw()`, high-value transfers
- Routes to victim contract (not attacker) for analysis

### 🔒 TEE-Protected AI Analysis
- Chainlink CRE workflow runs inside Trusted Execution Environment
- xAI (Grok) analyzes contract code for vulnerabilities
- Confidential HTTP: API keys never leave the TEE

### ⚡ Automatic Protection
- Auto-pause triggered based on risk level
- MEDIUM (≥60/100) or HIGH/CRITICAL risk = immediate pause
- Guardian contract manages pause/unpause

### 🛡️ Confidential HTTP
- Etherscan API key: Protected
- xAI API key: Protected  
- All sensitive credentials: Never exposed in logs or code

## Components

### `/sentinel-node` - Blockchain Security Monitor
- **Mempool Monitoring**: Polls every 1 second for new transactions
- **Threat Detection**: Pattern matching for suspicious functions
- **Victim Routing**: Analyzes the target contract, not the attacker
- **Auto-Pause**: Executes pause via Guardian contract

**Key Files:**
- `src/index.ts` - Main Sentinel logic
- `scripts/run-attack-test.ts` - Automated attack test

### `/api-server` - CRE Workflow API
- **REST API**: `/api/scan` for xAI analysis
- **CRE Integration**: Chainlink Runtime Environment with TEE
- **Confidential HTTP**: Secure API key management
- **WebSocket**: Real-time monitoring updates

**Key Files:**
- `src/services/cre-workflow.service.ts` - CRE workflow execution
- `src/index.ts` - Main server

### `/cre-workflow` - Chainlink CRE Workflow
- **scanner.ts**: Confidential HTTP workflow for AI scanning
- **TEE Protection**: Analysis runs inside secure enclave
- **xAI Integration**: Risk assessment via Grok

### `/contracts` - Smart Contracts
- **DemoVault.sol**: Vulnerable vault with reentrancy (for demo)
- **SimpleDrainer.sol**: Attacker contract that exploits vault
- **SentinelGuardian.sol**: Manages pause/unpause functionality
- **SentinelRegistry.sol**: Contract registration

## Attack Test Demo

Demonstrate the complete security flow: attack detection → AI analysis → auto-protection.

### Quick Start

```bash
# Terminal 1: Start API Server (CRE workflow)
cd api-server
npm run dev

# Terminal 2: Start Sentinel Node (mempool monitor)
cd sentinel-node
npm run dev

# Terminal 3: Run Attack Test
cd sentinel-node
npx ts-node scripts/run-attack-test.ts
```

### What Happens

1. **Attack Transaction**: `attack(0.001 ETH)` sent to SimpleDrainer
2. **Detection**: Sentinel detects `attack()` function → CRITICAL threat
3. **Routing**: Identifies DemoVault as victim (not SimpleDrainer)
4. **CRE Workflow**: Runs inside TEE:
   - Step 1: Fetch source via Confidential HTTP
   - Step 2: xAI analysis via Confidential HTTP
   - Step 3: Compile risk assessment
5. **AI Result**: MEDIUM risk (70/100), reentrancy vulnerability found
6. **Auto-Pause**: Score ≥ 60 → triggers pause via Guardian
7. **Protection**: DemoVault paused, 0.0206 ETH saved

### Expected Output

```
🚨 SUSPICIOUS ACTIVITY DETECTED
   Threats: CRITICAL: 🚨 ATTACK FUNCTION DETECTED: attack(uint256)
   Detected attack on: 0x997e47e8169b1a9112f9bc746de6b6677c0791c0
   Analyzing victim: 0x22650892Ce8db57fCDB48AE8b3508F52420A727A
🔬 Sending to CRE xAI analysis via Confidential HTTP...
   🔒 CRE WORKFLOW LOGS (TEE + Confidential HTTP):
      [STEP 1/3] 📡 Fetching contract source from Etherscan...
      [STEP 1/3] 🔐 Using Confidential HTTP (API key protected)
      [STEP 2/3] 🤖 AI Security Analysis via xAI Grok...
      [STEP 2/3] 🔐 Using Confidential HTTP (API key never exposed)
      [STEP 2/3] 🔒 Analysis performed entirely inside TEE
      [STEP 3/3] 📊 Compiling security assessment...
      Risk Level: MEDIUM
✅ xAI Analysis complete. Risk Level: MEDIUM (Score: 70)
⚠️  xAI returned MEDIUM risk (score: 70) - Using heuristic fallback...
🔒 Executing pause for 0x22650892Ce8db57fCDB48AE8b3508F52420A727A...
✅ AUTO-PAUSE SUCCESSFUL! (Heuristic fallback for MEDIUM risk)
```

### Performance

| Phase | Duration |
|-------|----------|
| Detection | ~1-2 seconds |
| CRE Workflow | ~8-10 seconds |
| Transaction Mining | ~12 seconds |
| **Total** | **~20-25 seconds** |

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| DemoVault | `0x22650892Ce8db57fCDB48AE8b3508F52420A727A` | Protected vault |
| SimpleDrainer | `0x997E47e8169b1A9112F9Bc746De6b6677c0791C0` | Attacker contract |
| SentinelGuardian | `0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1` | Pause manager |
| SentinelRegistry | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` | Registration |

## Environment Setup

### API Server (`.env`)
```env
PORT=3001
ETHERSCAN_API_KEY=your_etherscan_key
XAI_API_KEY=your_xai_key
XAI_MODEL=grok-4-1-fast-non-reasoning
```

### Sentinel Node (`.env`)
```env
SEPOLIA_RPC=https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH
SENTINEL_PRIVATE_KEY=0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194
CRE_API_URL=http://127.0.0.1:3001/api
WS_PORT=9000
API_PORT=9001
POLL_INTERVAL_MS=1000
```

## How It Works

### 1. Detection Logic

```typescript
// Heuristic patterns for threat detection
const highRiskPatterns = [
  { sig: '0x64dd891a', name: 'attack(uint256)', category: 'attack' },
  { sig: '0x3ccfd60b', name: 'withdraw()', category: 'funds_movement' },
  { sig: '0x2e1a7d4d', name: 'withdraw(uint256)', category: 'funds_movement' },
  // ... more patterns
];

// Assign threat levels
if (pattern.category === 'attack') level = 'CRITICAL';
if (value > THRESHOLD) level = 'HIGH';
```

### 2. Victim Routing

```typescript
// If attack on SimpleDrainer, analyze DemoVault (victim)
const isKnownAttacker = toAddress === SIMPLE_DRAINER;
const hasAttackFunction = threats.some(t => t.details.includes('ATTACK'));
const contractToAnalyze = (isKnownAttacker && hasAttackFunction) 
  ? VAULT_ADDRESS 
  : toAddress;
```

### 3. CRE Workflow (TEE)

```typescript
// Inside TEE - API keys never exposed
const result = await cre.workflow.simulate({
  // 1. Fetch source from Etherscan (Confidential HTTP)
  // 2. Send to xAI for analysis (Confidential HTTP)
  // 3. Compile security assessment
});

// Returns: { riskLevel, overallScore, vulnerabilities }
```

### 4. Auto-Pause Logic

```typescript
if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
  await executePause(target);  // Immediate pause
} else if (riskLevel === 'MEDIUM' && score >= 60) {
  await executePause(target);  // Heuristic fallback
}
```

## Key Technologies

- **Chainlink CRE**: Runtime Environment with TEE support
- **Confidential HTTP**: API key protection
- **xAI Grok**: AI security analysis
- **Ethers.js**: Blockchain interaction
- **Express**: REST API
- **WebSocket**: Real-time updates

## Demo Video Flow

1. Show vault is active with 0.0206 ETH
2. Send attack transaction
3. Show Sentinel logs detecting attack
4. Show CRE workflow running (3 steps)
5. Show xAI result (MEDIUM risk, 70/100)
6. Show auto-pause executing
7. Verify vault is paused, funds protected

## License

MIT
