#!/bin/bash
#
# Quick Sentinel Demo - 30 seconds
# Shows the complete flow end-to-end

set -e

cd "$(dirname "$0")"

echo "🛡️  SENTINEL QUICK DEMO"
echo "========================"
echo ""

# Test 1: ACE Policy Engine
echo "1️⃣  Testing ACE Policy Engine..."
cd sentinel-node
npm run test:ace 2>&1 | grep -E "(TEST|Summary)" | head -10
cd ..
echo ""

# Test 2: CRE Workflow with Broadcast
echo "2️⃣  Running CRE Workflow (TEE + xAI)..."
echo "    This uses Chainlink CRE with Confidential HTTP"
echo ""

TEMP_PAYLOAD=$(mktemp)
cat ./sentinel-node/tests/payloads/vulnerable-reentrancy.json > "$TEMP_PAYLOAD"

cre workflow simulate \
    ./api-server/cre-workflow \
    -R . \
    --target=hackathon-settings \
    --non-interactive \
    --trigger-index=0 \
    --http-payload "$(cat $TEMP_PAYLOAD)" \
    --broadcast 2>&1 | grep -E "(SENTINEL GUARDIAN|\[STEP|ACE|Risk Level|Overall Score|Recommended Action)" | head -20

rm -f "$TEMP_PAYLOAD"

echo ""
echo "✅ Demo complete!"
echo ""
echo "Next steps:"
echo "   ./demo-full-flow.sh    # Full interactive demo"
echo "   npm start              # Start Sentinel Node"
