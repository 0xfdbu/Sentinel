#!/bin/bash
set -e

echo "=========================================="
echo "Deploy USDA V5 with Chainlink ACE"
echo "=========================================="
echo ""

# Load environment variables from .env
if [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# Get private key from .env
PRIVATE_KEY=${CRE_ETH_PRIVATE_KEY:-$SENTINEL_PRIVATE_KEY}

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ No private key found in .env file"
    echo "Please set CRE_ETH_PRIVATE_KEY or SENTINEL_PRIVATE_KEY"
    exit 1
fi

echo "Using private key from .env"
echo ""

# Configuration
RPC_URL=${SEPOLIA_RPC:-https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH}
SENTINEL_GUARDIAN="0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"

echo "Configuration:"
echo "  RPC: $RPC_URL"
echo "  Guardian (reference): $SENTINEL_GUARDIAN"
echo "  Note: PAUSER_ROLE will NOT be granted to guardian during deployment"
echo "        Use Sentinel Registry flow to grant pause permission later"
echo ""

# Check if Chainlink ACE is installed
if [ ! -d "lib/chainlink-ace" ]; then
    echo "⚠️  Chainlink ACE not found. Installing..."
    forge install smartcontractkit/chainlink-ace --no-commit
fi

# Check if upgradeable contracts are installed
if [ ! -d "../node_modules/@openzeppelin/contracts-upgradeable" ]; then
    echo "⚠️  OpenZeppelin upgradeable contracts not found. Installing..."
    cd .. && npm install @openzeppelin/contracts-upgradeable && cd contracts
fi

echo ""
echo "Building contracts..."
forge build

echo ""
echo "Deploying..."
echo ""

# Run deployment
forge script deploy/02_DeployUSDAV5_ACE.sol:DeployUSDAStablecoinV5 \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  -vvvv

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Note the USDA V5 Proxy address from output above"
echo "2. Grant MINTER_ROLE and BURNER_ROLE to TokenPool"
echo "3. Later: Grant PAUSER_ROLE to Sentinel Guardian via Sentinel Registry"
