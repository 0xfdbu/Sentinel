#!/bin/bash
#
# Manual CRE Workflow Test Script
# Usage: ./manual-cre-test.sh [payload-name] [--broadcast]
# Example: ./manual-cre-test.sh vulnerable-reentrancy
# Example: ./manual-cre-test.sh vulnerable-reentrancy --broadcast

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config
PAYLOADS_DIR="./payloads"

# Parse args
PAYLOAD_NAME="${1:-safe-contract}"
BROADCAST_FLAG=""
if [ "$2" = "--broadcast" ] || [ "$1" = "--broadcast" ]; then
    BROADCAST_FLAG="--broadcast"
fi

PAYLOAD_FILE="$PAYLOADS_DIR/$PAYLOAD_NAME.json"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Sentinel CRE Manual Test${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Check if payload exists
if [ ! -f "$PAYLOAD_FILE" ]; then
    echo -e "${RED}❌ Payload not found: $PAYLOAD_FILE${NC}"
    echo ""
    echo "Available payloads:"
    ls -1 $PAYLOADS_DIR/*.json | xargs -n1 basename | sed 's/.json$//' | sed 's/^/  • /'
    exit 1
fi

# Show payload info
echo -e "${YELLOW}📋 Test Payload:${NC} $PAYLOAD_NAME"
echo -e "${YELLOW}📁 File:${NC} $PAYLOAD_FILE"
if [ -n "$BROADCAST_FLAG" ]; then
    echo -e "${YELLOW}🚩 Broadcast:${NC} ${GREEN}ENABLED${NC} (shows on-chain calls)"
fi
echo ""

# Extract description
DESCRIPTION=$(cat "$PAYLOAD_FILE" | grep "_description" | cut -d'"' -f4)
echo -e "${YELLOW}📝 Description:${NC} $DESCRIPTION"
echo ""

# Run CRE workflow
echo -e "${BLUE}🚀 Running CRE Workflow Simulation...${NC}"
echo -e "${BLUE}-----------------------------------------------${NC}"
echo ""

cd ../../  # Go to sentinel root

# Run CRE
# Note: Using inline JSON to avoid path issues
TEMP_PAYLOAD=$(mktemp)
cat "$PAYLOAD_FILE" > "$TEMP_PAYLOAD"

cre workflow simulate \
    ./api-server/cre-workflow \
    -R . \
    --target=hackathon-settings \
    --non-interactive \
    --trigger-index=0 \
    --http-payload "$(cat $TEMP_PAYLOAD)" \
    $BROADCAST_FLAG 2>&1 || {
        if [ -n "$BROADCAST_FLAG" ]; then
            echo ""
            echo -e "${YELLOW}⚠️  Note:${NC} Broadcast preview shown above"
            echo -e "${YELLOW}   ${NC} Set CRE_ETH_PRIVATE_KEY to actually send transactions"
        fi
    }

rm -f "$TEMP_PAYLOAD"

echo ""
echo -e "${BLUE}-----------------------------------------------${NC}"
echo -e "${GREEN}✅ Test Complete${NC}"
echo ""
echo -e "${YELLOW}💡 Usage:${NC}"
echo "  ./manual-cre-test.sh <payload>           # Simulation only"
echo "  ./manual-cre-test.sh <payload> --broadcast # Show on-chain calls"
echo ""
echo -e "${YELLOW}💡 Examples:${NC}"
echo "  ./manual-cre-test.sh safe-contract"
echo "  ./manual-cre-test.sh vulnerable-reentrancy --broadcast"
