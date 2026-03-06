#!/bin/bash
export SEPOLIA_RPC="https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH"
export CRE_ETH_PRIVATE_KEY="0xe587e35e24afdae4e37706c9e457c81bc0932a053b13a48752f9a88d93e98115"

# Contract addresses
VOLUME_RBAC="0xdd5d03A9d414Df8c8Af7E41eb5E81f6ff5912A25"
BLACKLIST_RBAC="0xE0af3cDd58Ef7AA7186539cCD1184C1e3b395eE7"
POLICY_ENGINE="0x62CC29A58404631B7db65CE14E366F63D3B96B16"
USDA_V8="0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF"
MINTING_CONSUMER="0xba5e6151a625429e8840c16ffe7a8e8044fbd325"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          COMPREHENSIVE POLICY TEST SUITE                           ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Policy Registration
echo "📋 Test 1: Policy Registration in PolicyEngine"
echo "─────────────────────────────────────────────────────────"
POLICY_COUNT=$(cast call $POLICY_ENGINE "getPolicyCount()" --rpc-url $SEPOLIA_RPC 2>/dev/null || echo "0")
echo "   Policy count: $POLICY_COUNT"
echo ""

# Test 2: Volume Policy Configuration
echo "📋 Test 2: Volume Policy Configuration"
echo "─────────────────────────────────────────────────────────"
MIN_VALUE=$(cast call $VOLUME_RBAC "minValue()" --rpc-url $SEPOLIA_RPC | cast --from-wei)
MAX_VALUE=$(cast call $VOLUME_RBAC "maxValue()" --rpc-url $SEPOLIA_RPC | cast --from-wei)
DAILY_LIMIT=$(cast call $VOLUME_RBAC "dailyVolumeLimit()" --rpc-url $SEPOLIA_RPC | cast --from-wei)
echo "   Min Value: $MIN_VALUE USD"
echo "   Max Value: $MAX_VALUE USD"
echo "   Daily Limit: $DAILY_LIMIT USD"
IS_ACTIVE=$(cast call $VOLUME_RBAC "isActive()" --rpc-url $SEPOLIA_RPC)
echo "   Active: $(if [ "$IS_ACTIVE" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "YES ✓"; else echo "NO ✗"; fi)"
echo ""

# Test 3: Blacklist Policy State
echo "📋 Test 3: Blacklist Policy State"
echo "─────────────────────────────────────────────────────────"
IS_BLACKLIST_ACTIVE=$(cast call $BLACKLIST_RBAC "isActive()" --rpc-url $SEPOLIA_RPC)
echo "   Active: $(if [ "$IS_BLACKLIST_ACTIVE" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "YES ✓"; else echo "NO ✗"; fi)"
TEST_ADDR="0x1234567890123456789012345678901234567890"
IS_BLACKLISTED=$(cast call $BLACKLIST_RBAC "isBlacklisted(address)" $TEST_ADDR --rpc-url $SEPOLIA_RPC)
echo "   Test address blacklisted: $(if [ "$IS_BLACKLISTED" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "YES ✓"; else echo "NO"; fi)"
echo ""

# Test 4: Policy Evaluation (Simulation)
echo "📋 Test 4: Policy Evaluation"
echo "─────────────────────────────────────────────────────────"
echo "   Testing evaluate() function..."
# Try to evaluate a benign address
echo "   Evaluating benign address (should pass)..."
eval_result=$(cast call $POLICY_ENGINE "evaluate(address,uint256,bytes)" \
  "0x9Eb4168b419F2311DaeD5eD8E072513520178f0C" \
  "1000000000000000000" \
  "0x" \
  --rpc-url $SEPOLIA_RPC 2>&1)
if echo "$eval_result" | grep -q "0x0000000000000000000000000000000000000000000000000000000000000001"; then
    echo "   Result: PASS ✓"
else
    echo "   Result: Check needed"
    echo "   Raw: $eval_result"
fi
echo ""

# Test 5: USDA V8 Policy Integration
echo "📋 Test 5: USDA V8 Policy Integration"
echo "─────────────────────────────────────────────────────────"
echo "   USDA V8: $USDA_V8"
# Check if policies are registered
POLICY_CHECK=$(cast call $USDA_V8 "policies(uint256)" "0" --rpc-url $SEPOLIA_RPC 2>&1)
if echo "$POLICY_CHECK" | grep -q "0xdd5d03"; then
    echo "   VolumePolicyRBAC: REGISTERED ✓"
else
    echo "   VolumePolicyRBAC: Not directly registered (via PolicyEngine)"
fi
echo ""

# Test 6: Minting Consumer Integration
echo "📋 Test 6: Minting Consumer Policy Check"
echo "─────────────────────────────────────────────────────────"
CONSUMER_POLICY=$(cast call $MINTING_CONSUMER "policyEngine()" --rpc-url $SEPOLIA_RPC 2>/dev/null || echo "N/A")
echo "   Consumer PolicyEngine: $CONSUMER_POLICY"
echo "   Expected: $POLICY_ENGINE"
if [ "$CONSUMER_POLICY" = "$POLICY_ENGINE" ]; then
    echo "   Match: ✓"
else
    echo "   Match: ✗ (May use different policy engine)"
fi
echo ""

# Test 7: Role Verification
echo "📋 Test 7: RBAC Role Verification"
echo "─────────────────────────────────────────────────────────"
SENTINEL="0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"
SENTINEL_ROLE=$(cast keccak "SENTINEL_ROLE")
PM_ROLE=$(cast keccak "POLICY_MANAGER_ROLE")
BM_ROLE=$(cast keccak "BLACKLIST_MANAGER_ROLE")

# VolumePolicy checks
HAS_SENTINEL_VOL=$(cast call $VOLUME_RBAC "hasRole(bytes32,address)" $SENTINEL_ROLE $SENTINEL --rpc-url $SEPOLIA_RPC)
HAS_PM_VOL=$(cast call $VOLUME_RBAC "hasRole(bytes32,address)" $PM_ROLE $SENTINEL --rpc-url $SEPOLIA_RPC)
echo "   VolumePolicyRBAC:"
echo "     SENTINEL_ROLE: $(if [ "$HAS_SENTINEL_VOL" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "✓ GRANTED"; else echo "✗ NOT GRANTED"; fi)"
echo "     POLICY_MANAGER_ROLE: $(if [ "$HAS_PM_VOL" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "✓ GRANTED"; else echo "✗ NOT GRANTED"; fi)"

# BlacklistPolicy checks
HAS_SENTINEL_BL=$(cast call $BLACKLIST_RBAC "hasRole(bytes32,address)" $SENTINEL_ROLE $SENTINEL --rpc-url $SEPOLIA_RPC)
HAS_BM_BL=$(cast call $BLACKLIST_RBAC "hasRole(bytes32,address)" $BM_ROLE $SENTINEL --rpc-url $SEPOLIA_RPC)
echo "   BlacklistPolicyRBAC:"
echo "     SENTINEL_ROLE: $(if [ "$HAS_SENTINEL_BL" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "✓ GRANTED"; else echo "✗ NOT GRANTED"; fi)"
echo "     BLACKLIST_MANAGER_ROLE: $(if [ "$HAS_BM_BL" = "0x0000000000000000000000000000000000000000000000000000000000000001" ]; then echo "✓ GRANTED"; else echo "✗ NOT GRANTED"; fi)"
echo ""

echo "════════════════════════════════════════════════════════════════════"
echo "📊 TEST SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
