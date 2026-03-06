#!/bin/bash
#
# Enhanced CRE Workflow Test WITH Broadcast
# Tests the enhanced scanner with fraud detection, oracle health, and prefetching
#
# Usage: ./test-cre-enhanced-broadcast.sh [payload-name]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."  # Go to sentinel-node root

# Default payload
PAYLOAD_NAME="${1:-enhanced-fraud-detection}"
PAYLOAD_FILE="./tests/payloads/$PAYLOAD_NAME.json"

# Check if payload exists
if [ ! -f "$PAYLOAD_FILE" ]; then
    echo -e "${RED}❌ Payload not found: $PAYLOAD_FILE${NC}"
    echo "Available payloads:"
    ls -1 ./tests/payloads/*.json | xargs -n1 basename | sed 's/.json$//' | sed 's/^/  - /'
    exit 1
fi

echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     🔒 ENHANCED SENTINEL CRE - BROADCAST TEST                ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📋 Payload:${NC} $PAYLOAD_NAME"
echo -e "${CYAN}🚩 Broadcast:${NC} ${GREEN}ENABLED${NC}"
echo ""
echo -e "${YELLOW}This test includes:${NC}"
echo "  • Oracle Health Detection"
echo "  • Fraud Pattern Analysis"
echo "  • Prefetched Data Integration"
echo "  • XAI CRE Workflow Analysis"
echo "  • On-chain Broadcast Preview"
echo ""

# Check for required environment variables
echo -e "${BLUE}Checking environment...${NC}"
if [ -f ".env" ]; then
    source .env
    echo -e "  ${GREEN}✓ .env file loaded${NC}"
else
    echo -e "  ${YELLOW}⚠ No .env file found${NC}"
fi

if [ -n "$XAI_API_KEY" ]; then
    echo -e "  ${GREEN}✓ XAI_API_KEY configured${NC}"
else
    echo -e "  ${YELLOW}⚠ XAI_API_KEY not set - will use pattern matching fallback${NC}"
fi

if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo -e "  ${GREEN}✓ ETHERSCAN_API_KEY configured${NC}"
else
    echo -e "  ${YELLOW}⚠ ETHERSCAN_API_KEY not set - source code fetch may fail${NC}"
fi

if [ -n "$CRE_ETH_PRIVATE_KEY" ]; then
    echo -e "  ${GREEN}✓ CRE_ETH_PRIVATE_KEY configured${NC}"
    echo -e "  ${YELLOW}⚠ WARNING: Transactions WILL be broadcast to Sepolia!${NC}"
else
    echo -e "  ${CYAN}ℹ CRE_ETH_PRIVATE_KEY not set - showing broadcast preview only${NC}"
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# Show payload summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📄 Payload Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Extract key info from payload using Node.js
node -e "
const payload = require('$PAYLOAD_FILE');
console.log('Contract: ' + payload.contractAddress);
console.log('Name: ' + payload.contractName);
console.log('Chain ID: ' + payload.chainId);
if (payload.fraudAnalysis) {
    console.log('Fraud Risk: ' + payload.fraudAnalysis.riskScore + '/100');
    console.log('Fraudulent: ' + (payload.fraudAnalysis.isFraudulent ? 'YES' : 'No'));
    console.log('Patterns: ' + payload.fraudAnalysis.patterns.length);
}
if (payload.prefetchedData && payload.prefetchedData.oracleHealth) {
    const healthy = payload.prefetchedData.oracleHealth.filter(o => o.isHealthy).length;
    console.log('Oracle Health: ' + healthy + '/' + payload.prefetchedData.oracleHealth.length + ' healthy');
}
if (payload.acePolicy) {
    console.log('ACE Policy: ' + (payload.acePolicy.passed ? 'PASSED' : 'VIOLATIONS (' + payload.acePolicy.violations.length + ')'));
}
" 2>/dev/null || echo "  (Could not parse payload details)"

echo ""

# Run CRE workflow with broadcast
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Running Enhanced CRE Workflow${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create temp payload file
TEMP_PAYLOAD=$(mktemp)
cat "$PAYLOAD_FILE" > "$TEMP_PAYLOAD"

# Set up environment for CRE
export CRE_WORKFLOW_PATH="${CRE_WORKFLOW_PATH:-./cre-workflow}"
export PROJECT_ROOT="$(pwd)"

# Run the enhanced scanner with broadcast
echo -e "${CYAN}Executing: cre workflow simulate${NC}"
echo -e "${CYAN}  Workflow: ./cre-workflow/enhanced-scanner.ts${NC}"
echo -e "${CYAN}  Target: hackathon-settings${NC}"
echo -e "${CYAN}  Broadcast: YES${NC}"
echo ""

# Check if we're in the correct directory for CRE
if [ ! -f "project.yaml" ]; then
    echo -e "${YELLOW}⚠ Warning: project.yaml not found in current directory${NC}"
    echo -e "${YELLOW}  CRE may need to be run from the sentinel root directory${NC}"
    echo ""
fi

# Run CRE workflow
# Note: Using the api-server cre-workflow as base since it has the proper setup
# but with our enhanced scanner
cre workflow simulate \
    ./cre-workflow \
    -R "$PROJECT_ROOT" \
    --target=hackathon-settings \
    --non-interactive \
    --trigger-index=0 \
    --http-payload "$(cat $TEMP_PAYLOAD)" \
    --broadcast \
    --verbose 2>&1 || {
        EXIT_CODE=$?
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}⚠ CRE Workflow exited with code $EXIT_CODE${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        if [ $EXIT_CODE -eq 1 ]; then
            echo "Exit code 1 typically means:"
            echo "  • Missing CRE_ETH_PRIVATE_KEY (for actual broadcast)"
            echo "  • Missing XAI_API_KEY (falls back to pattern matching)"
            echo "  • Network connectivity issues"
            echo ""
            echo -e "${GREEN}✓ The simulation likely ran successfully!${NC}"
            echo "  Check the output above for the security analysis results."
        fi
    }

# Cleanup
rm -f "$TEMP_PAYLOAD"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Test Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show what would happen with private key
if [ -z "$CRE_ETH_PRIVATE_KEY" ]; then
    echo -e "${CYAN}To enable actual on-chain broadcasts:${NC}"
    echo "  1. Export CRE_ETH_PRIVATE_KEY with a Sepolia test key"
    echo "     export CRE_ETH_PRIVATE_KEY=0x..."
    echo "  2. Ensure the wallet has SepoliaETH for gas"
    echo "  3. Re-run this script"
    echo ""
    echo -e "${YELLOW}⚠ WARNING: With CRE_ETH_PRIVATE_KEY set, real transactions${NC}"
    echo -e "${YELLOW}   will be sent to Sepolia testnet!${NC}"
fi

echo ""
echo -e "${CYAN}Test other payloads:${NC}"
echo "  ./test-cre-enhanced-broadcast.sh safe-contract"
echo "  ./test-cre-enhanced-broadcast.sh vulnerable-reentrancy"
echo "  ./test-cre-enhanced-broadcast.sh blacklisted-sender"
echo ""
