#!/bin/bash
# Test script for Volume Sentinel workflow with broadcast

set -e

echo "=========================================="
echo "Volume Sentinel - Workflow Test & Broadcast"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WORKFLOW_NAME="volume-sentinel"
TARGET="local-simulation"

echo -e "${YELLOW}[1/5]${NC} Compiling workflow..."
if cre workflow compile $WORKFLOW_NAME --target $TARGET; then
    echo -e "${GREEN}✓ Compilation successful${NC}"
else
    echo -e "${RED}✗ Compilation failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}[2/5]${NC} Running local simulation..."
if cre workflow simulate $WORKFLOW_NAME --target $TARGET; then
    echo -e "${GREEN}✓ Simulation successful${NC}"
else
    echo -e "${RED}✗ Simulation failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}[3/5]${NC} Testing with broadcast (--broadcast flag)..."
echo "This will attempt to broadcast to the VolumePolicyDON contract"
echo ""

# Create test payload
PAYLOAD='{
  "tokenSymbol": "USDA",
  "tokenAddress": "0x500D640f4fE39dAF609C6E14C83b89A68373EaFe",
  "currentLimit": "1000000000000000000000",
  "forceAdjust": true
}'

echo "Test Payload:"
echo "$PAYLOAD" | jq .
echo ""

# Run with broadcast
if cre workflow simulate $WORKFLOW_NAME --target $TARGET --broadcast; then
    echo -e "${GREEN}✓ Broadcast test successful${NC}"
else
    echo -e "${RED}✗ Broadcast test failed${NC}"
    echo "Check logs for details"
    exit 1
fi
echo ""

echo -e "${YELLOW}[4/5]${NC} Verifying VolumePolicyDON state..."
echo "Contract: 0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33"
echo ""

# Check if cast is available for reading contract state
if command -v cast &> /dev/null; then
    echo "Reading current daily volume limit..."
    cast call 0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33 \
        "dailyVolumeLimit()(uint256)" \
        --rpc-url https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH 2>/dev/null || echo "Could not read contract state"
else
    echo "cast not available, skipping contract state check"
fi
echo ""

echo -e "${YELLOW}[5/5]${NC} Test Summary:"
echo "=========================================="
echo -e "${GREEN}✓${NC} Workflow compiled successfully"
echo -e "${GREEN}✓${NC} Local simulation passed"
echo -e "${GREEN}✓${NC} Broadcast test completed"
echo ""
echo "Next steps:"
echo "1. Deploy to production: cre workflow deploy $WORKFLOW_NAME --target production"
echo "2. Set secrets in production: cre secrets set --env production ..."
echo "3. Configure sentinel node to trigger every 15 minutes"
echo ""
echo -e "${GREEN}All tests passed!${NC}"
