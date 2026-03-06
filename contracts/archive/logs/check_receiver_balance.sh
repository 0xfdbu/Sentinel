#!/bin/bash
ARBITRUM_SEPOLIA_RPC="https://arbitrum-sepolia-rpc.publicnode.com"
USDA_ARBITRUM="0x543b8555f9284D106422F0eD7B9d25F9520a17Ad"
RECEIVER="0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"

echo "Checking receiver balance on Arbitrum Sepolia..."
BALANCE=$(cast call "$USDA_ARBITRUM" "balanceOf(address)" "$RECEIVER" --rpc-url "$ARBITRUM_SEPOLIA_RPC" 2>/dev/null)
echo "Raw balance: $BALANCE"
BALANCE_DEC=$(cast to-dec "$BALANCE" 2>/dev/null || echo "0")
echo "Receiver USDA Balance: $BALANCE_DEC"

if [ "$BALANCE_DEC" -gt "0" ]; then
    echo ""
    echo "✅ CCIP transfer successful! Tokens received on Arbitrum."
else
    echo ""
    echo "⏳ Still waiting for CCIP delivery..."
    echo "Check: https://ccip.chain.link/msg/0xad041e741ccaaf89f8e13715193dfed200e19caf3609e6847eaa5d1982c2751f"
fi
