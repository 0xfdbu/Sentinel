#!/bin/bash

# Test Pause with DON Workflow
# This script simulates the pause workflow using CRE CLI

echo "=== Pause with DON - Test Script ==="
echo ""

# Configuration
WORKFLOW_NAME="pause-with-don"
GUARDIAN_ADDRESS="0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"

echo "Workflow: $WORKFLOW_NAME"
echo "Target Guardian: $GUARDIAN_ADDRESS"
echo ""

# Test 1: Simulation mode (no broadcast)
echo "=== Test 1: Simulation Mode ==="
echo "Testing pause action without broadcasting..."
echo ""

cre workflow simulate $WORKFLOW_NAME \
  --target local-simulation \
  --payload '{
    "action": "pause",
    "target": "'$GUARDIAN_ADDRESS'",
    "reason": "Emergency pause test",
    "broadcast": false
  }'

echo ""
echo "=== Test 1 Complete ==="
echo ""

# Test 2: Broadcast mode (requires CRE_ETH_PRIVATE_KEY)
if [ -n "$CRE_ETH_PRIVATE_KEY" ]; then
    echo "=== Test 2: Broadcast Mode ==="
    echo "Testing pause action with on-chain broadcast..."
    echo "WARNING: This will actually pause the contract!"
    echo ""
    
    read -p "Are you sure you want to broadcast? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        cre workflow simulate $WORKFLOW_NAME \
          --target local-simulation \
          --broadcast \
          --payload '{
            "action": "pause",
            "target": "'$GUARDIAN_ADDRESS'",
            "reason": "Emergency pause - broadcast test",
            "broadcast": true
          }'
    else
        echo "Broadcast test skipped."
    fi
    echo ""
    echo "=== Test 2 Complete ==="
else
    echo "=== Test 2: Broadcast Mode ==="
    echo "Skipped: CRE_ETH_PRIVATE_KEY not set"
    echo "To enable broadcast testing, set the environment variable:"
    echo "  export CRE_ETH_PRIVATE_KEY=0x..."
fi

echo ""
echo "=== All Tests Complete ==="
