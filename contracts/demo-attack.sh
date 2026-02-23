#!/bin/bash
# Sentinel Hackathon Demo - Attack with 1-Block Delay Architecture
# 
# IMPORTANT: This demo shows Sentinel WITHOUT MEV infrastructure.
# Detection happens after block confirmation, pause applies to NEXT block.

set -e

export PRIVATE_KEY=0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194
export RPC_URL=https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH

VAULT="0x22650892Ce8db57fCDB48AE8b3508F52420A727A"
DRAINER="0x997E47e8169b1A9112F9Bc746De6b6677c0791C0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     🛡️  SENTINEL HACKATHON DEMO - 1-BLOCK DELAY ARCHITECTURE    ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Without MEV infrastructure:                                     ║"
echo "║  1. Attack executes in Block N                                   ║"
echo "║  2. Sentinel detects in Block N (post-confirmation)              ║"
echo "║  3. Pause executes in Block N+1 (next block)                     ║"
echo "║                                                                  ║"
echo "║  Result: First attack succeeds, subsequent attacks blocked       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check initial state
echo "📊 STEP 0: Initial State"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PAUSED=$(cast call $VAULT 'paused()(bool)' --rpc-url $RPC_URL 2>/dev/null || echo "unknown")
BALANCE=$(cast balance $VAULT --rpc-url $RPC_URL 2>/dev/null || echo "0")
echo "  Vault Paused: $PAUSED"
echo "  Vault Balance: $BALANCE wei ($(echo "scale=6; $BALANCE / 1000000000000000000" | bc) ETH)"
echo ""

# Unpause if needed
if [ "$PAUSED" = "true" ]; then
  echo "🔄 Unpausing vault for demo..."
  cast send $VAULT "unpause()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL 2>&1 | grep -q "status"
  sleep 3
  echo "  ✓ Vault unpaused"
  echo ""
fi

# Get fresh balance
BEFORE=$(cast balance $VAULT --rpc-url $RPC_URL)
echo "📊 Pre-Attack Balance: $(echo "scale=6; $BEFORE / 1000000000000000000" | bc) ETH"
echo ""

# Execute attack
echo "⚔️  STEP 1: Executing Reentrancy Attack"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Target: $VAULT"
echo "  Attacker: $DRAINER"
echo "  Function: attack(uint256) - triggers CRITICAL threat level"
echo "  Value: 0.001 ETH"
echo ""
echo "  Executing transaction..."

TX_RESULT=$(cast send $DRAINER \
  "attack(uint256)" 100000000000000 \
  --value 0.001ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --gas-limit 500000 2>&1)

TX_HASH=$(echo "$TX_RESULT" | grep "transactionHash" | awk '{print $2}')
BLOCK=$(echo "$TX_RESULT" | grep "blockNumber" | awk '{print $2}')

echo "  ✓ Attack Transaction: $TX_HASH"
echo "  ✓ Block: $BLOCK"
echo ""

# Check immediate state (attack should have executed)
echo "📊 STEP 2: Post-Attack State (Same Block)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 2
AFTER_ATTACK=$(cast balance $VAULT --rpc-url $RPC_URL)
DRAINED=$(echo "$BEFORE - $AFTER_ATTACK" | bc)
echo "  Vault Balance: $(echo "scale=6; $AFTER_ATTACK / 1000000000000000000" | bc) ETH"
echo "  Amount Drained: $(echo "scale=6; $DRAINED / 1000000000000000000" | bc) ETH"
echo "  Vault Paused: $(cast call $VAULT 'paused()(bool)' --rpc-url $RPC_URL)"
echo ""
echo "  Note: Attack succeeded because Sentinel detects POST-confirmation"
echo ""

# Monitor for auto-pause (next block)
echo "⏱️  STEP 3: Waiting for Sentinel Detection & Pause"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sentinel polls every 1 second..."
echo ""

for i in {1..30}; do
  sleep 1
  CURRENT_PAUSED=$(cast call $VAULT 'paused()(bool)' --rpc-url $RPC_URL 2>/dev/null || echo "false")
  CURRENT_BALANCE=$(cast balance $VAULT --rpc-url $RPC_URL 2>/dev/null || echo "0")
  
  printf "\r  [$i/30] Checking... Paused: $CURRENT_PAUSED | Balance: $(echo "scale=4; $CURRENT_BALANCE / 1000000000000000000" | bc) ETH"
  
  if [ "$CURRENT_PAUSED" = "true" ]; then
    echo ""
    echo ""
    echo "  ✅ SUCCESS! Guardian Auto-Paused the Vault!"
    echo ""
    break
  fi
done

echo ""
echo "📊 STEP 4: Final State"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FINAL_PAUSED=$(cast call $VAULT 'paused()(bool)' --rpc-url $RPC_URL)
FINAL_BALANCE=$(cast balance $VAULT --rpc-url $RPC_URL)
DRAIN_COUNT=$(cast call $DRAINER 'drainCount()(uint256)' --rpc-url $RPC_URL 2>/dev/null || echo "0")

echo "  Vault Paused: $FINAL_PAUSED"
echo "  Final Balance: $(echo "scale=6; $FINAL_BALANCE / 1000000000000000000" | bc) ETH"
echo "  Reentrancy Count: $DRAIN_COUNT"
echo ""

if [ "$FINAL_PAUSED" = "true" ]; then
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║                    ✅ DEMO SUCCESSFUL!                           ║"
  echo "╠══════════════════════════════════════════════════════════════════╣"
  echo "║  Sentinel detected the attack and auto-paused the vault          ║"
  echo "║  Subsequent attacks would be BLOCKED                             ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
else
  echo "⚠️  Vault not auto-paused yet. Check Sentinel Node logs."
fi

echo ""
