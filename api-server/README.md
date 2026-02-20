# Sentinel API Server

Professional API server for Sentinel Security Oracle with Etherscan integration and xAI analysis.

## Architecture

```
src/
├── controllers/     # Request handlers
│   ├── scan.controller.ts      # Contract scanning
│   ├── fraud.controller.ts     # Fraud detection
│   └── monitor.controller.ts   # Monitor status
├── services/        # Business logic
│   ├── etherscan.service.ts    # Etherscan API client
│   ├── xai.service.ts          # XAI analysis
│   └── websocket.service.ts    # WebSocket management
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
# Edit .env with your API keys

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

### Scan Contract
```bash
POST /api/scan
{
  "contractAddress": "0x...",
  "chainId": 11155111
}
```

### Get Scan Result
```bash
GET /api/scan/:scanId
```

### Fraud Check
```bash
POST /api/fraud-check
{
  "tx": { ... },
  "contractAddress": "0x..."
}
```

### Monitor Status
```bash
GET /api/monitor/status
GET /api/monitor/events?limit=50&level=CRITICAL
```

### WebSocket
```bash
ws://localhost:3001/ws
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `ETHERSCAN_API_KEY` | Etherscan API key | Yes |
| `XAI_API_KEY` | XAI API key | Yes |
| `XAI_MODEL` | XAI model name | No (default: grok-4-1-fast-reasoning) |
| `FRONTEND_URL` | Frontend CORS origin | No |
| `LOG_LEVEL` | Logging level | No (default: info) |
