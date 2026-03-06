#!/bin/bash
# Test Blacklist Workflow via CRE CLI Broadcast
# Usage: ./test.sh

CRE_BIN="${CRE_BIN:-$HOME/.cre/bin/cre}"

echo "=== Blacklist Manager - CRE Broadcast Test ==="
echo ""

# Test 1: Blacklist an address
echo "Test 1: Blacklisting address..."
$CRE_BIN workflow simulate . \
  --target local-simulation \
  --broadcast \
  --payload '{"action":"blacklist","address":"0x3333333333333333333333333333333333333333","reason":"Test blacklist via CRE"}'

echo ""
echo "Test complete! Check transaction on Sepolia explorer."
