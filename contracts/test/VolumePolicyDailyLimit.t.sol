// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/policies/VolumePolicyDON.sol";

contract VolumePolicyDailyLimitTest is Test {
    VolumePolicyDON public policy;
    address public admin = address(1);
    address public user = address(2);
    
    uint256 public constant MIN_VALUE = 0.01 ether;
    uint256 public constant MAX_VALUE = 200 ether;
    uint256 public constant DAILY_LIMIT = 1000 ether;

    function setUp() public {
        vm.prank(admin);
        policy = new VolumePolicyDON(
            admin,
            MIN_VALUE,
            MAX_VALUE,
            DAILY_LIMIT
        );
    }

    // ==================== DAILY LIMIT ENFORCEMENT TESTS ====================

    function test_UserDailyVolumeTracking() public {
        uint256 txValue = 100 ether; // 100 ETH
        
        // First transaction - should pass
        (bool success1,,) = policy.evaluate(user, address(3), txValue, "");
        assertTrue(success1, "First transaction should pass");
        
        // Check volume tracked
        assertEq(policy.dailyVolume(user), txValue, "Volume should be tracked");
        
        // Second transaction - should pass (200 ETH total, under 1000 limit)
        (bool success2,,) = policy.evaluate(user, address(3), txValue, "");
        assertTrue(success2, "Second transaction should pass");
        assertEq(policy.dailyVolume(user), txValue * 2, "Volume should be cumulative");
    }

    function test_UserDailyVolumeLimitEnforced() public {
        uint256 largeTx = 150 ether; // 150 ETH (under 200 max, but will exceed daily limit)
        
        // First large transaction - should pass
        (bool success1,,) = policy.evaluate(user, address(3), largeTx, "");
        assertTrue(success1, "First large tx should pass");
        assertEq(policy.dailyVolume(user), 150 ether, "Volume should be 150 ETH");
        
        // 5 more transactions - total 900 ETH (under limit)
        for (uint i = 0; i < 5; i++) {
            policy.evaluate(user, address(3), largeTx, "");
        }
        
        // Volume should be 900 ETH
        assertEq(policy.dailyVolume(user), 900 ether, "Volume should be 900 ETH");
        
        // One more (1050 ETH) - should FAIL
        (bool success2, string memory reason,) = policy.evaluate(user, address(3), largeTx, "");
        assertFalse(success2, "Next tx should fail");
        assertEq(reason, "User daily volume limit exceeded", "Should have correct error");
        
        // Volume should still be 900 ETH (failed tx not counted)
        assertEq(policy.dailyVolume(user), 900 ether, "Volume should remain 900 ETH");
    }

    function test_DailyVolumeResetAfter24Hours() public {
        uint256 txValue = 100 ether; // 100 ETH each
        
        // Use up daily volume (10 x 100 = 1000 ETH)
        for (uint i = 0; i < 10; i++) {
            policy.evaluate(user, address(3), txValue, "");
        }
        
        // Check at limit
        assertEq(policy.dailyVolume(user), 1000 ether, "Should be at 1000 ETH limit");
        
        // Next transaction should fail
        (bool success3,,) = policy.evaluate(user, address(3), txValue, "");
        assertFalse(success3, "11th tx should fail (would exceed limit)");
        
        // Wait 24 hours + 1 second
        vm.warp(block.timestamp + 24 hours + 1);
        
        // Now should pass (volume reset)
        (bool success4,,) = policy.evaluate(user, address(3), txValue, "");
        assertTrue(success4, "Tx after 24h reset should pass");
        assertEq(policy.dailyVolume(user), txValue, "Volume should be reset to single tx");
    }

    function test_GlobalDailyVolumeTracking() public {
        address user2 = address(4);
        address user3 = address(5);
        uint256 txValue = 100 ether;
        
        // Multiple users transact
        (bool s1,,) = policy.evaluate(user, address(3), txValue, "");
        (bool s2,,) = policy.evaluate(user2, address(3), txValue, "");
        (bool s3,,) = policy.evaluate(user3, address(3), txValue, "");
        
        assertTrue(s1 && s2 && s3, "All should pass");
        
        // Global volume should be 300 ETH
        assertEq(policy.globalDailyVolume(), txValue * 3, "Global volume should track all users");
    }

    function test_ExemptUserBypassesAllLimits() public {
        // Make user exempt
        vm.prank(admin);
        policy.setExemption(user, true);
        
        uint256 hugeValue = 10000 ether; // Way above max and daily limit
        
        // Should pass because exempt
        (bool success,,) = policy.evaluate(user, address(3), hugeValue, "");
        assertTrue(success, "Exempt user should bypass all limits");
        
        // Volume should NOT be tracked for exempt users
        assertEq(policy.dailyVolume(user), 0, "Exempt user volume should not be tracked");
    }

    function test_RemainingDailyVolumeQuery() public {
        uint256 txValue = 100 ether;
        
        // Check remaining before any tx
        uint256 remaining1 = policy.getRemainingDailyVolume(user);
        assertEq(remaining1, DAILY_LIMIT, "Should have full limit remaining");
        
        // Use some volume (100 ETH)
        policy.evaluate(user, address(3), txValue, "");
        
        uint256 remaining2 = policy.getRemainingDailyVolume(user);
        assertEq(remaining2, DAILY_LIMIT - txValue, "Should have 900 ETH remaining");
        
        // Use up all remaining volume (9 more x 100 = 900 ETH)
        for (uint i = 0; i < 9; i++) {
            policy.evaluate(user, address(3), txValue, "");
        }
        
        uint256 remaining3 = policy.getRemainingDailyVolume(user);
        assertEq(remaining3, 0, "Should have 0 remaining");
    }

    function test_MultipleSmallTransactions() public {
        uint256 smallValue = 10 ether; // 10 ETH each
        
        // Do 100 transactions of 10 ETH = 1000 ETH total
        for (uint i = 0; i < 100; i++) {
            (bool success,,) = policy.evaluate(user, address(3), smallValue, "");
            assertTrue(success, string(abi.encodePacked("Tx ", vm.toString(i), " should pass")));
        }
        
        assertEq(policy.dailyVolume(user), 1000 ether, "Should have exactly 1000 ETH");
        
        // One more small tx should fail
        (bool success,,) = policy.evaluate(user, address(3), smallValue, "");
        assertFalse(success, "101st tx should fail (exceeds limit)");
    }

    function test_EdgeCase_ExactlyAtDailyLimit() public {
        // 10 transactions of 100 ETH = exactly 1000 ETH limit
        for (uint i = 0; i < 10; i++) {
            policy.evaluate(user, address(3), 100 ether, "");
        }
        
        // Check at exactly limit
        assertEq(policy.dailyVolume(user), 1000 ether, "Should be exactly at 1000 ETH");
        
        // One wei more should fail
        (bool success2,,) = policy.evaluate(user, address(3), 1, "");
        assertFalse(success2, "One wei over limit should fail");
    }

    function test_DifferentUsersHaveSeparateLimits() public {
        address user2 = address(4);
        uint256 value = 100 ether;
        
        // User 1 uses some of their limit (10 x 100 = 1000 ETH)
        for (uint i = 0; i < 10; i++) {
            policy.evaluate(user, address(3), value, "");
        }
        
        // User 1 at limit - next tx should fail
        (bool s1,,) = policy.evaluate(user, address(3), value, "");
        assertFalse(s1, "User1 tx should fail (at limit)");
        
        // User 2 should still have full limit
        (bool s2,,) = policy.evaluate(user2, address(3), value, "");
        assertTrue(s2, "User2 tx should pass (separate limit)");
        
        // User1 at 1000 ETH, User2 at 100 ETH
        assertEq(policy.dailyVolume(user), 1000 ether, "User1 volume correct");
        assertEq(policy.dailyVolume(user2), 100 ether, "User2 volume correct");
    }

    function test_VolumeNotTrackedForFailedTransaction() public {
        uint256 volumeBefore = policy.dailyVolume(user);
        
        // Try transaction that fails min value check
        (bool success,,) = policy.evaluate(user, address(3), 0.001 ether, "");
        assertFalse(success, "Should fail min value");
        
        // Volume should not increase
        assertEq(policy.dailyVolume(user), volumeBefore, "Volume should not increase for failed tx");
        
        // Try transaction that fails max value check
        (bool success2,,) = policy.evaluate(user, address(3), 300 ether, "");
        assertFalse(success2, "Should fail max value after daily limit reached");
        
        // Volume should still not increase
        assertEq(policy.dailyVolume(user), volumeBefore, "Volume should still not increase");
    }
}
