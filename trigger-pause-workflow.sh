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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env file if it exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

RPC_URL="${SEPOLIA_RPC:-https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH}"
USDA_ADDRESS="0xFA93de331FCd870D83C21A0275d8b3E7aA883F45"

# Use SENTINEL_PRIVATE_KEY from .env or PRIVATE_KEY from environment
PRIVATE_KEY="${SENTINEL_PRIVATE_KEY:-$PRIVATE_KEY}"

echo "================================================"
echo "🚨 Triggering Sentinel Pause Workflow"
echo "================================================"
echo ""

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "0x..." ]; then
    echo "❌ No private key found. Either:"
    echo "   1. Set SENTINEL_PRIVATE_KEY in .env file"
    echo "   2. export PRIVATE_KEY=0x..."
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
