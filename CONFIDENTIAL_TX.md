# Confidential Transaction Integration

This document describes how Sentinel uses Chainlink Confidential Compute (TEE) for secure, private transaction execution.

## Overview

When high fraud is detected through Tenderly RPC monitoring, the system can execute an **emergency pause** through a Trusted Execution Environment (TEE). This ensures:

- **Private**: The pause reason and admin identity are never visible on-chain
- **Secure**: EIP-712 signed messages verified inside the TEE
- **Compliant**: Audit trail maintained without exposing sensitive data

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Tenderly RPC  │────▶│  Fraud Detection │────▶│   xAI Analysis  │
│   Monitoring    │     │   (Heuristics)   │     │   (CRE HTTP)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Target Contract│◀────│  TEE Execution   │◀────│  EIP-712 Sign   │
│  (Paused)       │     │  (Confidential)  │     │  (Admin Wallet) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Flow

1. **Monitor**: Watch transactions via Tenderly RPC WebSocket
2. **Detect**: Analyze for fraud patterns (high value, flash loans, etc.)
3. **Verify**: Use xAI API through CRE Confidential HTTP to confirm threat
4. **Sign**: Admin wallet signs EIP-712 typed message for pause action
5. **Execute**: Send to TEE API for confidential execution
6. **Confirm**: Contract is paused without revealing reason on-chain

## Configuration

Add to `api-server/.env`:

```bash
# Admin private key for confidential transactions (generate with ethers.js)
ADMIN_PRIVATE_KEY=0x...

# TEE API endpoint
TEE_API_URL=https://convergence2026-token-api.cldev.cloud
```

Generate a new admin key:
```bash
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

## API Endpoints

### Check Status
```bash
GET /api/confidential/status
```

Response:
```json
{
  "success": true,
  "data": {
    "available": true,
    "adminAddress": "0x...",
    "teeApi": "https://convergence2026-token-api.cldev.cloud"
  }
}
```

### Execute Confidential Pause
```bash
POST /api/confidential/pause
Content-Type: application/json

{
  "contractAddress": "0x...",
  "reason": "Fraud detection: Flash loan attack"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "contractAddress": "0x...",
    "txHash": "0x...",
    "confidential": true,
    "tee": true,
    "adminAddress": "0x..."
  }
}
```

## Frontend Integration

```typescript
import { useConfidentialPause } from './hooks/useConfidentialPause'

function MyComponent() {
  const { executeConfidentialPause, isPausing } = useConfidentialPause()

  const handlePause = async () => {
    const result = await executeConfidentialPause(
      '0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C',
      'High fraud score detected'
    )
    
    if (result?.success) {
      console.log('Confidential pause executed:', result.txHash)
    }
  }
}
```

## Fraud Monitor Auto-Pause

The `useFraudMonitor` hook automatically uses confidential pause when:
- `autoPause: true` is enabled in options
- Fraud score exceeds `AUTO_PAUSE` threshold (85)
- Confidential transactions are configured

```typescript
const { threats, stats } = useFraudMonitor({
  guardianAddress: '0x...',
  registryAddress: '0x...',
  autoPause: true  // Enable automatic confidential pause
})
```

## Security Considerations

1. **Private Key**: Never commit `ADMIN_PRIVATE_KEY` to git
2. **Config File**: `cre-workflow/config.json` is gitignored and created at runtime
3. **TEE Verification**: Always verify TEE attestation in production
4. **Rate Limiting**: Implement rate limits on `/confidential/pause` endpoint

## References

- [CRE_TX.txt](./CRE_TX.txt) - Complete confidential transaction guide
- [Chainlink Compliant Private Transfer Demo](https://github.com/smartcontractkit/Compliant-Private-Transfer-Demo)
- [EIP-712 Typed Data Signing](https://eips.ethereum.org/EIPS/eip-712)
