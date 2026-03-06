#!/bin/bash

TX_HASH="0x1c5d9e31693755d6a69293e5dae7e49afa77d84b15b045c7aa9f1dd78ca99cd0"
ARBITRUM_RPC="https://arbitrum-sepolia-rpc.publicnode.com"
USDA_ARBITRUM="0x543b8555f9284D106422F0eD7B9d25F9520a17Ad"
RECEIVER="0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"

echo "========================================"
echo "CCIP Transfer Status Check (V5 Test)"
echo "========================================"
echo ""
echo "Sepolia Transaction: $TX_HASH"
echo ""
echo "CCIP Explorer Links:"
echo "  By Transaction: https://ccip.chain.link/msg/$TX_HASH"
echo ""
echo "Checking Arbitrum receiver balance..."
BALANCE=$(cast call "$USDA_ARBITRUM" "balanceOf(address)" "$RECEIVER" --rpc-url "$ARBITRUM_RPC" 2>/dev/null | cast to-dec 2>/dev/null || echo "0")
echo ""
echo "Receiver Balance: $BALANCE USDA"
echo ""

if [ "$BALANCE" -gt "0" ]; then
    echo "✅ SUCCESS! CCIP transfer completed!"
    echo ""
    echo "Tokens received: $BALANCE USDA"
else
    echo "⏳ CCIP message still processing..."
    echo ""
    echo "The message was sent from Sepolia but may still be:"
    echo "  - Waiting for finality on Sepolia"
    echo "  - Being executed on Arbitrum"
    echo "  - Waiting for manual execution (if failed)"
    echo ""
    echo "Check CCIP Explorer for detailed status:"
    echo "  https://ccip.chain.link/msg/$TX_HASH"
fi

echo ""
echo "========================================"
