# Frontend Integration Guide

## API Client Usage

```typescript
import { sentinelApi, sentinelWs } from '../utils/api';

// REST API Examples

// 1. Scan a contract
const scan = await sentinelApi.scanContract('0x...', 11155111);
console.log(scan.scanId); // Use this to poll for results

// 2. Get scan result
const result = await sentinelApi.getScanResult(scan.scanId);

// 3. Check transaction for fraud
const fraudResult = await sentinelApi.checkFraud(tx, contractAddress);
if (fraudResult.shouldPause) {
  // Trigger emergency pause
}

// 4. Get monitor events
const events = await sentinelApi.getEvents({ limit: 10, level: 'CRITICAL' });

// WebSocket for real-time events
sentinelWs.connect();

sentinelWs.on('SCAN_COMPLETED', (data) => {
  console.log('Scan completed:', data);
});

sentinelWs.on('ALERT', (alert) => {
  // Show notification
});
```

## Scan Response Format

```typescript
{
  scanId: "scan_1234567890_abcdef12",
  status: "completed",
  contractAddress: "0x...",
  result: {
    status: "success",
    contractName: "PausableVulnerableVault",
    riskLevel: "HIGH",
    overallScore: 35,
    summary: "Contract contains reentrancy vulnerability",
    vulnerabilities: [
      {
        id: "VULN-1",
        type: "Reentrancy",
        severity: "HIGH",
        description: "External call before state update",
        lineNumbers: [45, 46],
        confidence: 0.95,
        recommendation: "Use ReentrancyGuard or checks-effects-interactions pattern"
      }
    ],
    timestamp: 1708368000000
  }
}
```

## Environment Variables

Add to your frontend `.env`:

```bash
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```
