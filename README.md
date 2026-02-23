# Sentinel - DeFi Security & Confidential Rescue

Production-grade DeFi security platform with AI-powered fraud detection and Chainlink TEE confidential rescues.

## Quick Start

```bash
# Start API Server
cd api-server
npm run dev

# Start Frontend (new terminal)
cd frontend
npm run dev
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Server     │────▶│  Chainlink TEE  │
│  (React/Vite)   │     │   (Express)      │     │  (Confidential) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Smart Contracts │
                        │  (Sepolia)       │
                        └──────────────────┘
```

## Components

### `/api-server` - Backend API
- **Fraud Detection** (`/api/fraud-check`) - AI + heuristics scoring
- **Rescue API** (`/api/rescue/*`) - Confidential rescue orchestration
- **WebSocket** - Real-time monitoring

**Key Scripts:**
- `src/index.ts` - Main server
- `scripts/simulate-attack.mjs` - Attack simulation for testing

### `/frontend` - React Frontend
- **Protect** - Contract registration & scanning
- **Command** - Live monitoring + Confidential Rescue tab
- **Visualizer** - Threat visualization

**Key Files:**
- `src/pages/Monitor.tsx` - Main monitoring + rescue UI
- `src/hooks/useConfidentialRescue.ts` - TEE integration
- `src/hooks/useSentinelMonitor.ts` - Auto-monitoring

### `/contracts` - Smart Contracts
- `SentinelRegistry.sol` - Contract registration
- `EmergencyGuardian.sol` - Pause functionality
- `PausableVulnerableVault.sol` - Demo vulnerable vault

### `/cre-workflow` - Chainlink CRE
- `scanner.ts` - Confidential HTTP workflow for AI scanning

### `/sentinel-node` - Blockchain Monitor
- Mempool monitoring for suspicious transactions
- Dynamic threat detection (function signatures, value thresholds)
- Auto-pause via Guardian contract
- Integration with CRE for xAI analysis

---

## Attack Test Demo

This demo shows Sentinel detecting an attack on DemoVault via SimpleDrainer, running xAI analysis via Chainlink CRE (TEE + Confidential HTTP), and automatically pausing the vulnerable contract.

### Flow
```
Attack TX → Sentinel Detection → CRE xAI Analysis → Auto-Pause → Protected Funds
```

### Quick Start (Automated)

```bash
# Terminal 1: Start API Server
cd api-server
npm run dev

# Terminal 2: Start Sentinel
cd sentinel-node
npm run dev

# Terminal 3: Run Attack Test
cd sentinel-node
npx ts-node scripts/run-attack-test.ts
```

### Manual Step-by-Step

**1. Ensure Vault is Active:**
```typescript
import { ethers } from 'ethers';
const RPC = 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH';
const PK = '0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194';
const VAULT = '0x22650892Ce8db57fCDB48AE8b3508F52420A727A';
const VAULT_ABI = ['function paused() view returns (bool)', 'function unpause() external'];

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);
const vault = new ethers.Contract(VAULT, VAULT_ABI, wallet);

if (await vault.paused()) {
  const tx = await vault.unpause();
  await tx.wait();
  console.log('Vault unpaused');
}
```

**2. Trigger Attack:**
```typescript
const DRAINER = '0x997E47e8169b1A9112F9Bc746De6b6677c0791C0';
const DRAINER_ABI = ['function attack(uint256 amount) external'];

const drainer = new ethers.Contract(DRAINER, DRAINER_ABI, wallet);
const tx = await drainer.attack(ethers.parseEther('0.001'), { gasLimit: 150000 });
console.log('TX:', tx.hash);
```

**3. Monitor Detection:**
```bash
tail -f /tmp/sentinel-nohup.log
```

Expected output:
```
🚨 SUSPICIOUS ACTIVITY DETECTED
   Threats: CRITICAL: 🚨 ATTACK FUNCTION DETECTED: attack(uint256)
   Detected attack on: 0x997e47e8169b1a9112f9bc746de6b6677c0791c0
   Analyzing victim: 0x22650892Ce8db57fCDB48AE8b3508F52420A727A
🔬 Sending to CRE xAI analysis via Confidential HTTP...
✅ xAI Analysis complete. Risk Level: MEDIUM (Score: 70)
⚠️  xAI returned MEDIUM risk (score: 70) - Using heuristic fallback...
🔒 Executing pause for 0x22650892Ce8db57fCDB48AE8b3508F52420A727A...
✅ AUTO-PAUSE SUCCESSFUL! (Heuristic fallback for MEDIUM risk)
```

**4. Verify Protection:**
```typescript
const GUARDIAN = '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1';
const GUARDIAN_ABI = ['function isPaused(address) view returns (bool)'];

const guardian = new ethers.Contract(GUARDIAN, GUARDIAN_ABI, provider);
const paused = await guardian.isPaused(VAULT);
const bal = await provider.getBalance(VAULT);
console.log('Vault paused:', paused);  // true
console.log('Protected:', ethers.formatEther(bal), 'ETH');  // 0.0206 ETH
```

### Expected Results

```
╔════════════════════════════════════════════════════════════════╗
║                      RESULTS                                   ║
╠════════════════════════════════════════════════════════════════╣
║ Vault paused: ✅ YES (PROTECTED)                               ║
║ Balance: 0.0206 ETH                                            ║
║                                                                ║
║ ✅ SUCCESS: Attack detected and blocked!                       ║
║ ✅ Vault protected by Sentinel + CRE + xAI                     ║
╚════════════════════════════════════════════════════════════════╝
```

### Timing Breakdown

| Phase | Duration |
|-------|----------|
| Detection | ~1-2 seconds |
| CRE Workflow | ~8-10 seconds |
| - Fetch source (Etherscan) | ~2s |
| - xAI analysis | ~6-8s |
| - Compile result | ~1s |
| Pause TX Mining | ~12 seconds |
| **Total** | **~20-25 seconds** |

### CRE CLI Workflow Logs (TEE + Confidential HTTP)

```
🔒 SENTINEL SECURITY SCAN - TEE PROTECTED
[STEP 1/3] 📡 Fetching contract source from Etherscan...
[STEP 1/3] 🔐 Using Confidential HTTP (API key protected)
[STEP 2/3] 🤖 AI Security Analysis via xAI Grok...
[STEP 2/3] 🔐 Using Confidential HTTP (API key never exposed)
[STEP 2/3] 🔒 Analysis performed entirely inside TEE
[STEP 3/3] 📊 Compiling security assessment...
Risk Level: MEDIUM
```

### Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| DemoVault | `0x22650892Ce8db57fCDB48AE8b3508F52420A727A` |
| SimpleDrainer | `0x997E47e8169b1A9112F9Bc746De6b6677c0791C0` |
| SentinelGuardian | `0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1` |
| SentinelRegistry | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` |

---

## Confidential Rescue Flow

1. **Attack Detected** → Fraud API scores transaction (0-100)
2. **Emergency Pause** → Vault frozen on-chain
3. **Confidential Rescue** → Funds transferred via TEE to shielded address
4. **Attacker Sees** → Paused contract, NO rescue transaction

## Environment Variables

Create `.env` in `api-server/`:
```env
PRIVATE_KEY=0x...
SEPOLIA_RPC=https://...
TENDERLY_RPC=https://...
OPENAI_API_KEY=sk-...
ETHERSCAN_API_KEY=...
XAI_API_KEY=...
```

Create `.env` in `sentinel-node/`:
```env
SEPOLIA_RPC=https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH
SENTINEL_PRIVATE_KEY=0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194
CRE_API_URL=http://127.0.0.1:3001/api
WS_PORT=9000
API_PORT=9001
```

## Testing

```bash
# Simulate attack (triggers full rescue flow)
cd api-server
node scripts/simulate-attack.mjs

# Run automated attack test
cd sentinel-node
npx ts-node scripts/run-attack-test.ts
```

## Deployed Contracts (Sepolia)

- **Vulnerable Vault:** `0x4803E41148cD42629AEeCB174f9FeDFddcccd3c3`
- **Demo Token:** `0x6CEcD1FC8691840C76A173bf807b3d28dF75204e`
- **Chainlink Vault:** `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`

## License

MIT
