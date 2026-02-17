#!/bin/bash
# Start Sentinel Node using node directly

echo "🚀 Starting Sentinel Node..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating default .env..."
    cat > .env << 'EOF'
RPC_URL=wss://ethereum-sepolia.publicnode.com
CHAIN_ID=11155111
REGISTRY_ADDRESS=0x774B96F8d892A1e4482B52b3d255Fa269136A0E9
GUARDIAN_ADDRESS=0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1
CRE_CONSUMER_ADDRESS=0x8862AAEd0f66Fb33d93701E706d2cFB94286C337
CHAINLINK_SUBSCRIPTION_ID=6270
PRIVATE_KEY=0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194
SENTINEL_API_KEY=dev-key-123
WS_PORT=9000
API_PORT=9001
EOF
fi

# Try different methods to run
if command -v npx &> /dev/null; then
    # Try tsx first (handles ESM + .js imports better)
    if npx tsx --version &> /dev/null 2>&1; then
        echo "Using tsx..."
        npx tsx src/index.ts
    # Fallback to ts-node
    elif npx ts-node --version &> /dev/null 2>&1; then
        echo "Using ts-node..."
        npx ts-node --esm src/index.ts
    else
        echo "⚠️  TypeScript runner not found. Please install dependencies: npm install"
        exit 1
    fi
else
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi
