# Sentinel API Server - PoR Only

Minimal API server for triggering Proof of Reserves with 3-source price consensus.

## Architecture

```
src/
├── controllers/     # Request handlers
│   └── por.controller.ts       # PoR trigger with price check
├── routes/          # API routes
├── types/           # TypeScript types
├── utils/           # Utilities
│   ├── config.ts               # Configuration
│   ├── logger.ts               # Winston logging
│   └── errors.ts               # Error handling
└── index.ts         # Entry point
```

## Quick Start

```bash
cd api-server
npm install

# Configure environment
cp .env.example .env

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Health
```bash
GET /api/health
```

### PoR Status
```bash
GET /api/por/status
```

### Trigger PoR + Mint
```bash
POST /api/por/trigger
{
  "user": "0x9Eb4168b419F2311DaeD5eD8E072513520178f0C",
  "ethAmount": "10000000000000000",
  "mintRequestId": "0x1234567890abcdef...",
  "depositIndex": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "usdaMinted": "13.82",
    "ethPrice": 2073.50,
    "reserves": "1800.21",
    "timestamp": 1709700000000,
    "logs": [...]
  }
}
```

## Price Consensus

The workflow fetches prices from 3 sources:
1. **CoinGecko**
2. **CryptoCompare**
3. **Binance**

Uses median price with max 1% deviation tolerance.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `SEPOLIA_RPC` | Sepolia RPC URL | No |
| `FRONTEND_URL` | Frontend CORS origin | No |
| `LOG_LEVEL` | Logging level | No (default: info) |

## CRE Workflow

This API triggers the `eth-por-unified` CRE workflow:
- Validates 3-source price consensus
- Checks bank reserves via Plaid API
- Generates DON-signed attestation
- Broadcasts mint via MintingConsumer
