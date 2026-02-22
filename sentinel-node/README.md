# Sentinel Node

Autonomous blockchain security monitor that detects suspicious transactions, triggers AI analysis via Chainlink CRE, and executes emergency pauses.

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   Frontend UI   │◄──────────────────►│  Sentinel Node   │
│   (/monitor)    │                    │   (this service) │
└─────────────────┘                    └────────┬─────────┘
                                                │
                         ┌──────────────────────┼──────────────────────┐
                         │                      │                      │
                         ▼                      ▼                      ▼
                ┌─────────────┐      ┌─────────────────┐    ┌─────────────────┐
                │  Blockchain │      │   CRE Workflow  │    │   Guardian      │
                │  (Sepolia)  │      │ (xAI + TEE)     │    │   Contract      │
                └─────────────┘      └─────────────────┘    └─────────────────┘
```

## How It Works

1. **Block Monitoring**: Watches every new block on Sepolia testnet
2. **Heuristic Detection**: Analyzes transactions to monitored contracts for:
   - Large value transfers (>1 ETH default)
   - Gas price spikes (possible front-running)
   - Sensitive function calls (ownership, upgrades)
3. **AI Analysis**: Triggers Chainlink CRE workflow for deep contract analysis
4. **Auto-Pause**: If HIGH/CRITICAL risk detected, automatically executes pause via Guardian
5. **Real-time Updates**: Broadcasts events to frontend via WebSocket

## Quick Start

```bash
# Install dependencies
npm install

# Copy env file and configure
cp .env.example .env
# Edit .env with your values

# Run in development mode
npm run dev

# Or build and run
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_PORT` | WebSocket server port (for frontend) | 9000 |
| `API_PORT` | HTTP API port | 9001 |
| `SEPOLIA_RPC` | Sepolia HTTPS RPC endpoint | https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH |
| `SEPOLIA_WSS` | Sepolia WebSocket endpoint (optional, for faster blocks) | wss://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH |
| `GUARDIAN_ADDRESS` | Guardian contract address | - |
| `REGISTRY_ADDRESS` | Registry contract address | - |
| `SENTINEL_PRIVATE_KEY` | Private key of authorized sentinel | - |
| `CRE_API_URL` | CRE API endpoint | http://localhost:3001 |
| `SUSPICIOUS_VALUE_ETH` | ETH threshold for suspicious transfers | 1.0 |
| `GAS_PRICE_SPIKE_MULTIPLIER` | Gas spike detection multiplier | 3.0 |

## API Endpoints

### WebSocket (ws://localhost:9000)

**Client -> Server:**
```json
{"type": "PING"}
{"type": "SUBSCRIBE", "contractAddress": "0x..."}
```

**Server -> Client:**
```json
{"type": "INIT", "contracts": [...], "lastBlock": 12345}
{"type": "THREAT_DETECTED", "threat": {...}}
{"type": "PAUSE_TRIGGERED", "contractAddress": "0x...", "txHash": "0x..."}
{"type": "ANALYSIS_COMPLETE", "contractAddress": "0x...", "analysis": {...}}
```

### HTTP API (http://localhost:9001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and status |
| `/contracts` | GET | List monitored contracts |
| `/emergency-pause` | POST | Trigger emergency pause |
| `/scan` | POST | Trigger manual scan |

**Emergency Pause Example:**
```bash
curl -X POST http://localhost:9001/emergency-pause \
  -H "Content-Type: application/json" \
  -d '{
    "target": "0x...",
    "vulnHash": "0x9999...",
    "source": "frontend"
  }'
```

## Setting Up as Authorized Sentinel

1. Deploy contracts (see main project)
2. Get your sentinel wallet address
3. Call `addSentinel(yourAddress)` on Guardian contract as owner
4. Configure `.env` with your private key

## Production Considerations

- Use a dedicated wallet with limited funds for the sentinel
- Run multiple sentinel nodes for redundancy
- Monitor gas costs (pause transactions cost gas)
- Set up alerts for when sentinel goes offline
