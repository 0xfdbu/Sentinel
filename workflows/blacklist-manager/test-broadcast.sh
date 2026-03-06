#!/bin/bash
# Test Blacklist Workflow with Broadcast
# This simulates how the API server runs CRE workflows

set -e

echo "=== Blacklist Manager Workflow Test ==="
echo ""

# Configuration
CRE_BIN="${CRE_BIN:-$HOME/.cre/bin/cre}"
WORKFLOW_DIR="$(cd "$(dirname "$0")" && pwd)"
PAYLOAD='{"action":"blacklist","address":"0x2222222222222222222222222222222222222222","reason":"Test from broadcast script"}'

# Check CRE binary
if [ ! -f "$CRE_BIN" ]; then
    echo "Error: CRE binary not found at $CRE_BIN"
    echo "Set CRE_BIN environment variable or install CRE"
    exit 1
fi

echo "CRE Binary: $CRE_BIN"
echo "Workflow Dir: $WORKFLOW_DIR"
echo "Payload: $PAYLOAD"
echo ""

# Run workflow simulation with broadcast
echo "Running workflow simulation with broadcast..."
echo ""

cd "$WORKFLOW_DIR"

# Option 1: Simulate locally (no broadcast)
# $CRE_BIN workflow simulate blacklist-manager --target local-simulation

# Option 2: Simulate with broadcast (local-simulation with --broadcast flag)
$CRE_BIN workflow simulate . \
    --target local-simulation \
    --broadcast \
    --payload "$PAYLOAD" 2>&1 | tee /tmp/blacklist-test.log

echo ""
echo "=== Test Complete ==="
echo ""

# Check for success in output
if grep -q "SUCCESS" /tmp/blacklist-test.log; then
    echo "✅ Workflow completed successfully"
    TX_HASH=$(grep -oE "0x[0-9a-fA-F]{64}" /tmp/blacklist-test.log | head -1)
    if [ ! -z "$TX_HASH" ]; then
        echo "Transaction: $TX_HASH"
        echo "Explorer: https://sepolia.etherscan.io/tx/$TX_HASH"
    fi
else
    echo "❌ Workflow failed - check /tmp/blacklist-test.log"
    exit 1
fi
