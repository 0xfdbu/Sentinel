#!/bin/bash
# Trigger Sentinel Node → Pause-with-DON Workflow
# 
# This sends a transaction that triggers fraudScore >= 70 in sentinel node:
# - Suspicious Function Call (upgrade): +40
# - Unusual Gas Limit (>500k): +20  
# - Contract Interaction: +15
# TOTAL: 75 (>= 70 threshold)
#
# Usage: ./trigger-pause-workflow.sh

set -e

RPC_URL="https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH"
USDA_ADDRESS="0xFA93de331FCd870D83C21A0275d8b3E7aA883F45"

echo "================================================"
echo "🚨 Triggering Sentinel Pause Workflow"
echo "================================================"
echo ""

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Set PRIVATE_KEY first:"
    echo "   export PRIVATE_KEY=0x..."
    exit 1
fi

TEST_ADDR=$(cast wallet address "$PRIVATE_KEY")
echo "From: $TEST_ADDR"
echo "Target: $USDA_ADDRESS (USDA V8)"
echo ""

# Send transaction with:
# 1. Suspicious function selector (upgrade: 0x3659cfe6) -> +40
# 2. High gas limit (600k > 500k) -> +20
# 3. Contract interaction -> +15
# Total: 75 >= 70 threshold ✓

echo "Sending suspicious transaction..."
echo "   Function: upgradeTo (0x3659cfe6) - suspicious signature"
echo "   Gas: 600,000 (unusual gas limit)"
echo ""

# Function: upgradeTo(address) - selector 0x3659cfe6
# This is in the SUSPICIOUS_SIGNATURES list
cast send "$USDA_ADDRESS" \
    "0x3659cfe60000000000000000000000000000000000000000000000000000000000000000" \
    --gas-limit 600000 \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    || echo ""

echo ""
echo "================================================"
echo "✅ Transaction sent!"
echo "================================================"
echo ""
echo "Fraud Score Breakdown:"
echo "   Suspicious Function Call (upgrade): +40"
echo "   Unusual Gas Limit (>500k): +20"
echo "   Contract Interaction: +15"
echo "   ────────────────────────────────────"
echo "   TOTAL: 75/100 (>= 70 threshold ✓)"
echo ""
echo "Sentinel node should detect this and spawn:"
echo "   cre workflow simulate ./workflows/pause-with-don ..."
echo ""
echo "Watch sentinel node logs for PAUSE EXECUTED"
echo ""
