# Chainlink CRE Setup Guide

Complete guide for setting up Chainlink Confidential Request Execution (CRE) for Sentinel.

## Overview

```
┌─────────────┐     Threat      ┌─────────────────┐
│   Sentinel  │────────────────►│  CREConsumer    │
│    Node     │   Detected      │   (Functions)   │
└─────────────┘                 └────────┬────────┘
                                         │
                    ┌────────────────────┘
                    │ Chainlink DON
                    ▼
┌─────────────┐   Request    ┌─────────────────┐
│   Sentinel  │◄─────────────│  DON executes   │
│   API       │              │  confidential   │
│ (this code) │   Response   │  JS code        │
└──────┬──────┘              └─────────────────┘
       │
       │ Transaction
       ▼
┌─────────────────┐
│  Guardian       │
│  (pause exec)   │
└─────────────────┘
```

## Step 1: Create Subscription ✅ (You did this!)

Go to https://functions.chain.link/sepolia and create a subscription.

**Save your Subscription ID** (e.g., `1234`)

## Step 2: Add Consumer

Now you need to add the CREConsumer contract as a consumer.

### Option A: Deploy Your Own Consumer (Recommended)

```bash
# 1. Set your subscription ID
export CHAINLINK_SUBSCRIPTION_ID=1234  # Replace with yours

# 2. Deploy the consumer contract
cd sentinel/contracts
npx hardhat run deploy-cre-consumer.js --network sepolia
```

This will output something like:
```
✅ CREConsumer deployed to: 0xABC123...
```

### Option B: Add Consumer via UI

1. Go to https://functions.chain.link/sepolia
2. Find your subscription
3. Click "Add Consumer"
4. Enter the CREConsumer address from above

## Step 3: Fund Subscription

Your subscription needs LINK to pay for Functions executions.

1. Get Sepolia LINK from https://faucets.chain.link/
2. Go to your subscription page
3. Click "Fund Subscription"
4. Add at least 2-5 LINK

## Step 4: Setup Sentinel API

The Chainlink DON will call your Sentinel API to execute the pause.

```bash
# 1. Configure environment
cd sentinel/services/sentinel-node
cp .env.example .env

# 2. Edit .env with your values:
cat > .env << 'EOF'
# Network
RPC_URL=https://ethereum-sepolia.publicnode.com
CHAIN_ID=11155111

# Contracts
REGISTRY_ADDRESS=0x774B96F8d892A1e4482B52b3d255Fa269136A0E9
GUARDIAN_ADDRESS=0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1

# CRE Configuration
CRE_CONSUMER_ADDRESS=0xYOUR_DEPLOYED_CONSUMER  # From Step 2
SENTINEL_API_KEY=your-secure-random-key-here    # Generate a strong key

# Private key for executing pauses
# ⚠️ This wallet needs to be authorized in the Guardian contract
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Server
WS_PORT=8080
API_PORT=3000
EOF

# 3. Start the Sentinel Node
npm install
npm run dev
```

## Step 5: Test the Flow

```bash
# Test the pause API
curl -X POST http://localhost:3000/api/v1/emergency-pause \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-random-key-here" \
  -d '{
    "target": "0x75a7168502442f3204689424E480c50d7D6E7be0",
    "vulnHash": "0x1234567890abcdef"
  }'
```

## Step 6: Configure Frontend

Update your frontend to trigger CRE for critical threats:

```typescript
// In Monitor.tsx or useSentinelMonitor.ts
const triggerCRE = async (event: SentinelEvent) => {
  const consumer = new ethers.Contract(
    CRE_CONSUMER_ADDRESS,
    CRE_CONSUMER_ABI,
    signer
  );
  
  const source = `
    const response = await Functions.makeHttpRequest({
      url: secrets.BACKEND_URL,
      headers: { "X-API-Key": secrets.SENTINEL_API_KEY },
      data: { target: args[0], vulnHash: args[1] }
    });
    return Functions.encodeUint256(response.data.success ? 1 : 0);
  `;
  
  const tx = await consumer.requestConfidentialPause(
    event.contractAddress,
    event.txHash, // using txHash as vulnHash
    "0x", // encrypted secrets reference
    source
  );
  
  return tx.wait();
};
```

## Configuration Summary

| Component | Address/Value | Where to Find |
|-----------|---------------|---------------|
| Subscription ID | `1234` | functions.chain.link |
| CREConsumer | `0x...` | Deploy output |
| Guardian | `0xD196...` | Already deployed |
| Registry | `0x774B...` | Already deployed |
| Sentinel API | `http://localhost:3000` | Your server |

## Troubleshooting

### "Insufficient funds"
- Fund your subscription with more LINK

### "Not authorized"
- Make sure you added the CREConsumer to your subscription

### "Request failed"
- Check your Sentinel API is running
- Verify `SENTINEL_API_KEY` matches

### "Invalid consumer"
- The consumer contract address must be added to the subscription

## Monitoring

Watch your Functions requests at:
https://functions.chain.link/sepolia/YOUR_SUBSCRIPTION_ID

## Production Deployment

For production:
1. Use a dedicated server/VPS for Sentinel Node
2. Enable HTTPS with valid SSL certificate
3. Use environment variables for secrets (never commit them)
4. Set up monitoring and alerts
5. Consider using Chainlink Automation for redundant triggering
