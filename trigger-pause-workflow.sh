#!/bin/bash
# Trigger Sentinel Node → Pause-with-DON Workflow
# 
# Uses a REAL blacklisted address from ScamSniffer as recipient
# Fraud Score: Blacklisted (+50) + Gas (+20) + Contract (+15) = 85 ✓
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

# Fetch a blacklisted address from ScamSniffer
echo "Fetching blacklisted address from ScamSniffer..."
BLACKLIST=$(curl -s "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json" 2>/dev/null | head -20)

# Pick a random blacklisted address (skip first few which might be formatting)
BLACKLISTED_ADDR=$(echo "$BLACKLIST" | grep -oE '"0x[0-9a-fA-F]{40}"' | head -5 | tail -1 | tr -d '"' || echo "")

if [ -z "$BLACKLISTED_ADDR" ]; then
    # Fallback: known Lazarus Group address (confirmed blacklisted)
    BLACKLISTED_ADDR="0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1"
    echo "   Using fallback blacklisted address"
fi

echo "   Blacklisted Recipient: $BLACKLISTED_ADDR"
echo ""

# Check USDA balance
echo "Checking USDA balance..."
USDA_BALANCE=$(cast call "$USDA_ADDRESS" "balanceOf(address)" "$TEST_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
USDA_BALANCE_HUMAN=$(cast to-unit "$USDA_BALANCE" 6)
echo "USDA Balance: $USDA_BALANCE_HUMAN"
echo ""

if [ "$(echo "$USDA_BALANCE_HUMAN < 1" | bc -l 2>/dev/null || echo "1")" = "1" ]; then
    echo "❌ Insufficient USDA balance"
    echo "   Need at least 1 USDA"
    exit 1
fi

# Send transfer TO blacklisted address with high gas
echo "Sending USDA transfer TO blacklisted address..."
echo "   Recipient: $BLACKLISTED_ADDR (BLACKLISTED +50 points)"
echo "   Amount: 1 USDA"
echo "   Gas: 600,000 (Unusual Gas +20 points)"
echo "   Contract call (+15 points)"
echo ""

AMOUNT="1000000" # 1 USDA

cast send "$USDA_ADDRESS" "transfer(address,uint256)" "$BLACKLISTED_ADDR" "$AMOUNT" \
    --gas-limit 600000 \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY"

echo ""
echo "================================================"
echo "✅ Transaction sent to BLACKLISTED address!"
echo "================================================"
echo ""
echo "Fraud Score Breakdown:"
echo "   Blacklisted Recipient: +50 🚫"
echo "   Unusual Gas Limit (>500k): +20"
echo "   Contract Interaction: +15"
echo "   ────────────────────────────────────"
echo "   TOTAL: 85/100 (>= 70 threshold ✓)"
echo ""
echo "Sentinel node SHOULD trigger:"
echo "   cre workflow simulate ./workflows/pause-with-don ..."
echo ""
echo "Watch sentinel node logs for:"
echo "   '🚨 HIGH FRAUD SCORE DETECTED: 85'"
echo "   '🔴 SPAWNING CRE CLI FOR PAUSE WORKFLOW'"
echo ""
