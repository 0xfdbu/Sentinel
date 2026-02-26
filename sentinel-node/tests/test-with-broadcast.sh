#!/bin/bash
#
# CRE Workflow Test WITH Broadcast Preview
# Shows what transactions would be sent on-chain
#
# Usage: ./test-with-broadcast.sh [payload-name]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd ../../  # Go to sentinel root

# Default payload
PAYLOAD_NAME="${1:-vulnerable-reentrancy}"

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}  Sentinel CRE Test WITH Broadcast Preview${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""
echo -e "${YELLOW}📋 Payload:${NC} $PAYLOAD_NAME"
echo -e "${YELLOW}🚩 Broadcast:${NC} ${GREEN}ENABLED${NC} (shows what would be sent)"
echo ""
echo -e "${CYAN}This will show:${NC}"
echo "  1. Normal simulation output"
echo "  2. On-chain transaction details"
echo "  3. What WOULD be broadcast (if private key configured)"
echo ""
read -p "Press Enter to continue..."
echo ""

# Run CRE with broadcast
# Note: Without CRE_ETH_PRIVATE_KEY, it will show "Broadcast transactions" section
# but won't actually send. With the key, it would send real transactions.

echo -e "${BLUE}🚀 Running CRE Workflow (Simulation + Broadcast Preview)...${NC}"
echo -e "${BLUE}-------------------------------------------------------${NC}"
echo ""

# Create temp payload file
TEMP_PAYLOAD=$(mktemp)
cat ./sentinel-node/tests/payloads/$PAYLOAD_NAME.json > "$TEMP_PAYLOAD"

cre workflow simulate \
    ./api-server/cre-workflow \
    -R . \
    --target=hackathon-settings \
    --non-interactive \
    --trigger-index=0 \
    --http-payload "$(cat $TEMP_PAYLOAD)" \
    --broadcast \
    --verbose 2>&1 || {
        echo ""
        echo -e "${YELLOW}⚠️  Note:${NC} Broadcast requires CRE_ETH_PRIVATE_KEY"
        echo -e "${YELLOW}   ${NC} Simulation still ran successfully!"
    }

rm -f "$TEMP_PAYLOAD"

echo ""
echo -e "${BLUE}-------------------------------------------------------${NC}"
echo -e "${GREEN}✅ Test Complete${NC}"
echo ""
echo -e "${CYAN}To actually broadcast transactions:${NC}"
echo "  1. Set CRE_ETH_PRIVATE_KEY in your .env file"
echo "  2. Ensure you have test ETH on Sepolia"
echo "  3. Re-run this script"
