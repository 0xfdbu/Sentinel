# Sentinel Node - Production Monitoring Service

Real-time blockchain monitoring service for the Sentinel Security Oracle. Detects threats using heuristics and triggers automatic emergency pauses via Chainlink CRE.

## Features

- 🔴 **Real-time Monitoring**: WebSocket streaming of blockchain events
- 🛡️ **Heuristic Detection**: Flash loans, reentrancy, large transfers, gas anomalies
- ⚡ **Sub-second Response**: Automatic threat detection within 2 blocks
- 🔗 **CRE Integration**: Chainlink Confidential Request for secure pause execution
- 📊 **WebSocket API**: Real-time updates to frontend clients
- 💾 **Database Logging**: Optional Supabase integration for threat storage

## Architecture

```
┌─────────────┐     WebSocket     ┌──────────────┐
│   Frontend  │◄─────────────────►│ Sentinel Node│
│   Clients   │                   │   Service    │
└─────────────┘                   └──────┬───────┘
                                         │
    ┌─────────────┐              ┌───────▼────────┐
    │   CRE       │              │   Blockchain   │
    │   Webhook   │◄─────────────│   Provider     │
    └─────────────┘              └────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Development mode (auto-reload)
npm run dev

# Production build
npm run build
npm start
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | WebSocket RPC endpoint | Sepolia public node |
| `REGISTRY_ADDRESS` | SentinelRegistry contract | Sepolia deployed |
| `GUARDIAN_ADDRESS` | EmergencyGuardian contract | Sepolia deployed |
| `CRE_WEBHOOK_URL` | Chainlink Functions webhook | - |
| `CRE_API_KEY` | CRE authentication key | - |
| `SUPABASE_URL` | Database URL (optional) | - |
| `WS_PORT` | WebSocket server port | 8080 |

## Threat Detection

The Sentinel Node monitors for these attack patterns:

| Pattern | Description | Response |
|---------|-------------|----------|
| **Flash Loan** | Detected flash loan signatures | CRITICAL → Pause |
| **Large Transfer** | >100 ETH in single tx | HIGH → Alert |
| **Reentrancy** | Multiple internal calls | CRITICAL → Pause |
| **Drain Pattern** | >5 transfers in one tx | HIGH → Alert |
| **High Gas** | >5M gas usage | MEDIUM → Log |

## WebSocket API

Connect to `ws://localhost:8080` for real-time updates:

### Client → Server
No client messages required. Server broadcasts updates automatically.

### Server → Client

```typescript
// Initial state on connection
{
  type: 'INIT',
  contracts: MonitoredContract[],
  lastBlock: number
}

// New threat detected
{
  type: 'THREAT_DETECTED',
  threat: {
    id: string,
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM',
    contractAddress: string,
    txHash: string,
    details: string,
    confidence: number,
    action: 'PAUSED' | 'ALERTED'
  }
}

// Contract registration
{
  type: 'REGISTRATION',
  contractAddress: string,
  owner: string
}

// Emergency pause triggered
{
  type: 'PAUSE_TRIGGERED',
  contractAddress: string,
  sentinel: string
}
```

## CRE Integration

For production deployment, configure Chainlink Functions:

1. Create a Chainlink Functions subscription
2. Deploy the CRE workflow contract
3. Set `CRE_WEBHOOK_URL` to your Functions endpoint
4. Set `CRE_API_KEY` for authentication

When a CRITICAL threat is detected, the Sentinel Node automatically calls the CRE webhook with:

```json
{
  "contractAddress": "0x...",
  "threatLevel": "CRITICAL",
  "confidence": 0.95,
  "txHash": "0x...",
  "details": "Flash loan pattern detected; Multiple transfers",
  "chainId": 11155111
}
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
```

### Railway / Render

1. Fork this repository
2. Connect to Railway/Render
3. Set environment variables
4. Deploy

### Monitoring

Health check endpoint (add to index.ts):

```typescript
// GET /health
getStatus() {
  return {
    isRunning: true,
    contractsCount: 42,
    lastProcessedBlock: 5678901,
    clientsCount: 5
  }
}
```

## License

MIT
