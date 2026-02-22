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
```

## Testing

```bash
# Simulate attack (triggers full rescue flow)
cd api-server
node scripts/simulate-attack.mjs
```

## Deployed Contracts (Sepolia)

- **Vulnerable Vault:** `0x4803E41148cD42629AEeCB174f9FeDFddcccd3c3`
- **Demo Token:** `0x6CEcD1FC8691840C76A173bf807b3d28dF75204e`
- **Chainlink Vault:** `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`

## License

MIT
