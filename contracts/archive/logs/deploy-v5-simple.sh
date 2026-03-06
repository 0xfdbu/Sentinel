#!/bin/bash
set -e

# Load environment
export $(grep -v '^#' ../.env | xargs)
PRIVATE_KEY=${CRE_ETH_PRIVATE_KEY:-$SENTINEL_PRIVATE_KEY}
RPC_URL=${SEPOLIA_RPC:-https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH}

echo "=========================================="
echo "Deploy USDA V5 (Simple)"
echo "=========================================="
echo ""
echo "Deployer: $(cast wallet address --private-key $PRIVATE_KEY)"
echo "RPC: $RPC_URL"
echo ""

# Deploy implementation
echo "1. Deploying USDA V5 Implementation..."
IMPL_TX=$(forge create src/tokens/USDAStablecoinV5.sol:USDAStablecoinV5 \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --json 2>/dev/null)

IMPL_ADDRESS=$(echo "$IMPL_TX" | grep -o '"deployedTo":"[^"]*"' | cut -d'"' -f4)
echo "   Implementation: $IMPL_ADDRESS"

# Deploy proxy
echo ""
echo "2. Deploying ERC1967 Proxy..."

# Encode initialization data
# initialize(address initialOwner, address policyEngine, address guardian, uint256 initialMintCap, uint256 dailyMintLimit)
INITIAL_OWNER=$(cast wallet address --private-key $PRIVATE_KEY)
POLICY_ENGINE="0x0000000000000000000000000000000000000000"  # Will set later
GUARDIAN="0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"
INITIAL_MINT_CAP="1000000000000000"  # 1B with 6 decimals
DAILY_MINT_LIMIT="1000000000000"      # 1M with 6 decimals

INIT_DATA=$(cast calldata "initialize(address,address,address,uint256,uint256)" \
  "$INITIAL_OWNER" "$POLICY_ENGINE" "$GUARDIAN" "$INITIAL_MINT_CAP" "$DAILY_MINT_LIMIT")

echo "   Init data: $INIT_DATA"

PROXY_TX=$(forge create @openzeppelin/contracts/proxy/ERC1967Proxy.sol:ERC1967Proxy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "$IMPL_ADDRESS" "$INIT_DATA" \
  --json 2>/dev/null)

PROXY_ADDRESS=$(echo "$PROXY_TX" | grep -o '"deployedTo":"[^"]*"' | cut -d'"' -f4)
echo "   Proxy: $PROXY_ADDRESS"

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "USDA V5 Proxy (Use this address): $PROXY_ADDRESS"
echo "USDA V5 Implementation: $IMPL_ADDRESS"
echo ""
echo "Environment Variables:"
echo "  export USDA_V5_PROXY=$PROXY_ADDRESS"
echo "  export USDA_V5_IMPL=$IMPL_ADDRESS"
echo ""
echo "Next Steps:"
echo "1. Grant MINTER_ROLE and BURNER_ROLE to TokenPool"
echo "2. Set PolicyEngine address"
echo "3. Later: Grant PAUSER_ROLE to Sentinel Guardian via Registry"
