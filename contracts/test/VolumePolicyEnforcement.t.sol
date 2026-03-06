// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/policies/VolumePolicyDON.sol";

contract VolumePolicyEnforcementTest is Test {
    VolumePolicyDON public policy;
    address public admin = address(1);
    address public user = address(2);
    
    // Test values
    uint256 public constant MIN_VALUE = 0.01 ether;  // 0.01 ETH
    uint256 public constant MAX_VALUE = 200 ether;   // 200 ETH
    uint256 public constant DAILY_LIMIT = 1000 ether; // 1000 ETH

    function setUp() public {
        vm.prank(admin);
        policy = new VolumePolicyDON(
            admin,
            MIN_VALUE,
            MAX_VALUE,
            DAILY_LIMIT
        );
    }

    // ==================== LIMIT ENFORCEMENT TESTS ====================

    function test_TransactionWithinLimits_Passes() public {
        // Test value at min boundary
        (bool success1,,) = policy.evaluate(user, address(3), MIN_VALUE, "");
        assertTrue(success1, "Transaction at min value should pass");

        // Test value at max boundary
        (bool success2,,) = policy.evaluate(user, address(3), MAX_VALUE, "");
        assertTrue(success2, "Transaction at max value should pass");

        // Test value in middle
        uint256 midValue = (MIN_VALUE + MAX_VALUE) / 2;
        (bool success3,,) = policy.evaluate(user, address(3), midValue, "");
        assertTrue(success3, "Transaction at mid value should pass");
    }

    function test_TransactionBelowMin_Fails() public {
        uint256 belowMin = MIN_VALUE - 1;
        
        (bool success, string memory reason, uint8 severity) = policy.evaluate(user, address(3), belowMin, "");
        
        assertFalse(success, "Transaction below min should fail");
        assertEq(reason, "Value below minimum", "Should have correct error message");
        assertEq(severity, 4, "Should have CRITICAL severity"); // SEVERITY_CRITICAL = 4
    }

    function test_TransactionAboveMax_Fails() public {
        uint256 aboveMax = MAX_VALUE + 1;
        
        (bool success, string memory reason, uint8 severity) = policy.evaluate(user, address(3), aboveMax, "");
        
        assertFalse(success, "Transaction above max should fail");
        assertEq(reason, "Value above maximum", "Should have correct error message");
        assertEq(severity, 4, "Should have CRITICAL severity");
    }

    function test_ZeroValue_Fails() public {
        (bool success, string memory reason,) = policy.evaluate(user, address(3), 0, "");
        
        assertFalse(success, "Zero value transaction should fail");
        assertEq(reason, "Value below minimum", "Should report below minimum");
    }

    function test_VeryLargeValue_Fails() public {
        uint256 hugeValue = 1000000 ether; // 1M ETH
        
        (bool success, string memory reason,) = policy.evaluate(user, address(3), hugeValue, "");
        
        assertFalse(success, "Huge transaction should fail");
        assertEq(reason, "Value above maximum", "Should report above maximum");
    }

    // ==================== EXEMPTION TESTS ====================

    function test_ExemptAddress_PassesRegardlessOfValue() public {
        // First, exempt the user
        vm.prank(admin);
        policy.setExemption(user, true);

        // Test with value below min - should pass because exempt
        (bool success1,,) = policy.evaluate(user, address(3), 1, "");
        assertTrue(success1, "Exempt address should pass even with small value");

        // Test with value above max - should pass because exempt
        (bool success2,,) = policy.evaluate(user, address(3), 1000000 ether, "");
        assertTrue(success2, "Exempt address should pass even with huge value");
    }

    function test_NonExemptAddress_FollowsLimits() public {
        // Non-exempt user should follow limits
        (bool success1,,) = policy.evaluate(user, address(3), MIN_VALUE - 1, "");
        assertFalse(success1, "Non-exempt address should fail below min");

        (bool success2,,) = policy.evaluate(user, address(3), MAX_VALUE + 1, "");
        assertFalse(success2, "Non-exempt address should fail above max");
    }

    // ==================== LIMIT UPDATE TESTS ====================

    function test_LimitsCanBeUpdated() public {
        uint256 newMin = 0.1 ether;  // 0.1 ETH
        uint256 newMax = 500 ether;  // 500 ETH

        // Update limits as admin
        vm.prank(admin);
        policy.setLimits(newMin, newMax, "Test update");

        // Check new limits are applied
        assertEq(policy.minValue(), newMin, "Min should be updated");
        assertEq(policy.maxValue(), newMax, "Max should be updated");

        // Test old min fails
        (bool success1,,) = policy.evaluate(user, address(3), MIN_VALUE, "");
        assertFalse(success1, "Old min should now fail");

        // Test new min passes
        (bool success2,,) = policy.evaluate(user, address(3), newMin, "");
        assertTrue(success2, "New min should pass");

        // Test old max fails
        (bool success3,,) = policy.evaluate(user, address(3), MAX_VALUE + 1, "");
        assertTrue(success3, "Old max should still pass (below new max)");
    }

    function test_LimitsCanBeUpdatedViaWriteReport() public {
        // Grant DON_SIGNER_ROLE to this test contract
        bytes32 DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
        vm.prank(admin);
        policy.grantRole(DON_SIGNER_ROLE, address(this));

        uint256 newMin = 0.05 ether;
        uint256 newMax = 300 ether;

        // Create report for SET_LIMITS (instruction 1)
        bytes32 reportHash = keccak256("test-report-1");
        bytes memory report = abi.encode(
            reportHash,
            uint8(1), // INSTRUCTION_SET_LIMITS
            newMin,
            newMax,
            "Update via writeReport"
        );

        // Submit writeReport
        policy.writeReport(report);

        // Verify limits updated
        assertEq(policy.minValue(), newMin, "Min should be updated via writeReport");
        assertEq(policy.maxValue(), newMax, "Max should be updated via writeReport");
    }

    // ==================== EDGE CASE TESTS ====================

    function test_TransactionAtExactMin_Passes() public {
        (bool success,,) = policy.evaluate(user, address(3), MIN_VALUE, "");
        assertTrue(success, "Transaction at exact min should pass");
    }

    function test_TransactionAtExactMax_Passes() public {
        (bool success,,) = policy.evaluate(user, address(3), MAX_VALUE, "");
        assertTrue(success, "Transaction at exact max should pass");
    }

    function test_TransactionJustBelowMin_Fails() public {
        uint256 justBelow = MIN_VALUE - 1 wei;
        (bool success,,) = policy.evaluate(user, address(3), justBelow, "");
        assertFalse(success, "Transaction just below min should fail");
    }

    function test_TransactionJustAboveMax_Fails() public {
        uint256 justAbove = MAX_VALUE + 1 wei;
        (bool success,,) = policy.evaluate(user, address(3), justAbove, "");
        assertFalse(success, "Transaction just above max should fail");
    }

    // ==================== POLICY STATE TESTS ====================

    function test_PolicyActiveState() public {
        // Check policy is active
        assertTrue(policy.isActive(), "Policy should be active");
        
        // Evaluation should work when active
        (bool success,,) = policy.evaluate(user, address(3), MIN_VALUE, "");
        assertTrue(success, "Should work when policy is active");
    }

    function test_DailyLimitStorage() public {
        // Check daily limit is stored correctly
        assertEq(policy.dailyVolumeLimit(), DAILY_LIMIT, "Daily limit should match constructor");
        
        // Daily volume tracking variables exist but may not be enforced in evaluate
        // (Based on current implementation)
    }
}
