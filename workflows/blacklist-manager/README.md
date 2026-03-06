# Blacklist Manager CRE Workflow

Chainlink CRE (Confidential Runtime Environment) workflow for managing address blacklist via DON-signed reports.

## Overview

This workflow allows Sentinel guardian nodes to add/remove addresses from the blacklist using tamper-proof DON-signed reports. All actions are recorded on-chain with cryptographic proof of consensus.

## How It Works

1. **HTTP Trigger**: API receives blacklist/unblacklist request
2. **Validation**: Validate address and action type
3. **Report Generation**: Generate unique report hash with instruction
4. **DON Signing**: Report is signed by DON nodes (TEE-protected)
5. **On-Chain Execution**: `BlacklistPolicyDON.writeReport()` is called
6. **Action Applied**: Address is added/removed from blacklist

## Report Format

```solidity
struct BlacklistReport {
    bytes32 reportHash;      // Unique identifier
    uint8 instruction;       // 1=blacklist, 2=unblacklist
    address target;          // Address to act on
    string reason;           // Reason for action
}
```

## API Usage

### HTTP Endpoint

```bash
POST /blacklist
Content-Type: application/json
```

### Request Body

**Blacklist an address:**
```json
{
  "action": "blacklist",
  "address": "0x1234567890123456789012345678901234567890",
  "reason": "Suspicious activity detected"
}
```

**Unblacklist an address:**
```json
{
  "action": "unblacklist",
  "address": "0x1234567890123456789012345678901234567890",
  "reason": "Verified legitimate"
}
```

### Response

**Success:**
```json
{
  "success": true,
  "action": "blacklist",
  "targetAddress": "0x1234...",
  "reportHash": "0xabc...",
  "txHash": "0xdef...",
  "blockNumber": 12345678,
  "reason": "Suspicious activity detected"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Address already blacklisted",
  "action": "blacklist",
  "targetAddress": "0x1234..."
}
```

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| BlacklistPolicyDON | `0x1b4228DF8cB455020AF741A9C8Adb6Af44Dcc2F1` |

## Testing

Run the local test script:

```bash
cd sentinel/workflows/blacklist-manager

# Set your private key
export PRIVATE_KEY=0xe587e35e24afdae4e37706c9e457c81bc0932a053b13a48752f9a88d93e98115

# Run tests
npx ts-node test-workflow.ts
```

## Deployment

To deploy this workflow to Chainlink CRE:

```bash
# Build workflow
cre workflow build blacklist-manager

# Deploy to staging
cre workflow deploy blacklist-manager --target staging

# Test with simulation
cre workflow simulate blacklist-manager --target local-simulation --payload '{"action":"blacklist","address":"0x1234...","reason":"Test"}'
```

## Security

- Only addresses with `DON_SIGNER_ROLE` can submit reports
- Reports cannot be replayed (tracked via `usedReports` mapping)
- All actions require DON consensus (multi-node signatures)
- Report hash includes timestamp to prevent replay

## Integration with Sentinel Node

The API server can trigger this workflow:

```typescript
// When suspicious activity is detected
const response = await fetch('http://cre-workflow/blacklist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'blacklist',
    address: suspiciousAddress,
    reason: 'Flash loan attack detected'
  })
});
```
