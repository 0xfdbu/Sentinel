// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/SentinelRegistryV2.sol";

/**
 * @title DeploySentinelRegistryV2
 * @notice Deploys SentinelRegistryV2 with full RBAC configuration
 * @dev 
 *   Deploys registry and configures:
 *   - Primary Guardian with GUARDIAN_ROLE and SENTINEL_ROLE
 *   - Policy targets (PolicyEngine, VolumePolicy, BlacklistPolicy, USDA)
 *   - Ready for autonomous Sentinel operation
 */
contract DeploySentinelRegistryV2 is Script {
    // Sepolia addresses
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant VOLUME_POLICY_RBAC = 0xdd5d03A9d414Df8c8Af7E41eb5E81f6ff5912A25;
    address constant BLACKLIST_POLICY_RBAC = 0xE0af3cDd58Ef7AA7186539cCD1184C1e3b395eE7;
    address constant USDA_V8 = 0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF;
    
    function run() external {
        vm.startBroadcast();
        
        address admin = msg.sender;
        address guardian = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
        
        console.log("=== Deploying Sentinel Registry V2 ===");
        console.log("Admin:", admin);
        console.log("Guardian:", guardian);
        console.log("");
        
        // Deploy registry
        console.log("1. Deploying SentinelRegistryV2...");
        SentinelRegistryV2 registry = new SentinelRegistryV2(
            admin,
            guardian,
            POLICY_ENGINE,
            VOLUME_POLICY_RBAC,
            BLACKLIST_POLICY_RBAC,
            USDA_V8
        );
        
        console.log("   Deployed:", address(registry));
        console.log("");
        
        // Verify configuration
        console.log("2. Verifying Configuration...");
        console.log("   Policy Engine:", registry.policyEngine());
        console.log("   Volume Policy:", registry.volumePolicy());
        console.log("   Blacklist Policy:", registry.blacklistPolicy());
        console.log("   USDA Token:", registry.usdaToken());
        console.log("");
        
        // Verify roles
        console.log("3. Verifying RBAC Roles...");
        bool hasGuardianRole = registry.hasRole(registry.GUARDIAN_ROLE(), guardian);
        bool hasSentinelRole = registry.hasRole(registry.SENTINEL_ROLE(), guardian);
        bool hasAdminRole = registry.hasRole(registry.ADMIN_ROLE(), admin);
        
        console.log("   Guardian has GUARDIAN_ROLE:", hasGuardianRole ? "YES" : "NO");
        console.log("   Guardian has SENTINEL_ROLE:", hasSentinelRole ? "YES" : "NO");
        console.log("   Admin has ADMIN_ROLE:", hasAdminRole ? "YES" : "NO");
        console.log("");
        
        // Check sentinel info
        console.log("4. Checking Guardian Info...");
        (address sentinelAddr, string memory name, uint256 registeredAt,, uint256 actions, bool isActive, uint256 reputation) = 
            registry.sentinels(guardian);
        console.log("   Address:", sentinelAddr);
        console.log("   Name:", name);
        console.log("   Registered At:", registeredAt);
        console.log("   Actions Taken:", actions);
        console.log("   Active:", isActive ? "YES" : "NO");
        console.log("   Reputation:", reputation / 100);
        console.log("");
        
        // Verify policy contracts have registry as authorized
        console.log("5. Checking Policy Contract Permissions...");
        
        // Check VolumePolicyRBAC
        bytes32 sentinelRole = keccak256("SENTINEL_ROLE");
        bytes32 policyManagerRole = keccak256("POLICY_MANAGER_ROLE");
        
        (bool volSuccess, bytes memory volData) = VOLUME_POLICY_RBAC.call(
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)")), sentinelRole, guardian)
        );
        if (volSuccess) {
            bool hasRole = abi.decode(volData, (bool));
            console.log("   Guardian has VolumePolicyRBAC.SENTINEL_ROLE:", hasRole ? "YES" : "NO");
        }
        
        (bool volPmSuccess, bytes memory volPmData) = VOLUME_POLICY_RBAC.call(
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)")), policyManagerRole, guardian)
        );
        if (volPmSuccess) {
            bool hasRole = abi.decode(volPmData, (bool));
            console.log("   Guardian has VolumePolicyRBAC.POLICY_MANAGER_ROLE:", hasRole ? "YES" : "NO");
        }
        
        // Check BlacklistPolicyRBAC
        bytes32 blacklistManagerRole = keccak256("BLACKLIST_MANAGER_ROLE");
        
        (bool blSuccess, bytes memory blData) = BLACKLIST_POLICY_RBAC.call(
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)")), sentinelRole, guardian)
        );
        if (blSuccess) {
            bool hasRole = abi.decode(blData, (bool));
            console.log("   Guardian has BlacklistPolicyRBAC.SENTINEL_ROLE:", hasRole ? "YES" : "NO");
        }
        
        (bool blBmSuccess, bytes memory blBmData) = BLACKLIST_POLICY_RBAC.call(
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)")), blacklistManagerRole, guardian)
        );
        if (blBmSuccess) {
            bool hasRole = abi.decode(blBmData, (bool));
            console.log("   Guardian has BlacklistPolicyRBAC.BLACKLIST_MANAGER_ROLE:", hasRole ? "YES" : "NO");
        }
        
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("SentinelRegistryV2:", address(registry));
        console.log("Admin:", admin);
        console.log("Guardian:", guardian);
        console.log("Status: READY FOR TESTING");
        
        vm.stopBroadcast();
    }
}

/**
 * @title TestSentinelRegistryV2
 * @notice Runs comprehensive tests on deployed registry
 */
contract TestSentinelRegistryV2 is Script {
    address constant REGISTRY = address(0); // Update after deployment
    address constant USDA_V8 = 0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF;
    address constant GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external {
        if (REGISTRY == address(0)) {
            console.log("ERROR: Please update REGISTRY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Testing Sentinel Registry V2 ===");
        
        SentinelRegistryV2 registry = SentinelRegistryV2(REGISTRY);
        
        // Test 1: Volume Policy Adjustment
        console.log("\n1. Testing Volume Policy Adjustment...");
        
        // Reduce to 75% (MEDIUM threat)
        uint256 newLimit = 37500 ether;
        try registry.adjustVolumeLimit(newLimit, "MEDIUM threat - test") {
            console.log("   [PASS] Volume limit adjusted to 37,500 USD");
        } catch Error(string memory reason) {
            console.log("   [FAIL] Failed:", reason);
        } catch {
            console.log("   [FAIL] Failed with unknown error");
        }
        
        // Test 2: Blacklist Management
        console.log("\n2. Testing Blacklist Management...");
        
        address testAddr = 0x1234567890123456789012345678901234567890;
        try registry.blacklistAddress(testAddr, "Testing sentinel blacklist") {
            console.log("   [PASS] Address blacklisted");
        } catch Error(string memory reason) {
            console.log("   [FAIL] Failed:", reason);
        } catch {
            console.log("   [FAIL] Failed with unknown error");
        }
        
        // Test 3: Emergency Pause
        console.log("\n3. Testing Emergency Pause...");
        
        try registry.emergencyPause(USDA_V8, "Testing emergency pause") {
            console.log("   [PASS] Emergency pause triggered");
        } catch Error(string memory reason) {
            console.log("   [FAIL] Failed:", reason);
        } catch {
            console.log("   [FAIL] Failed with unknown error");
        }
        
        // Test 4: Emergency Unpause
        console.log("\n4. Testing Emergency Unpause...");
        
        try registry.emergencyUnpause(USDA_V8, "Testing emergency unpause") {
            console.log("   [PASS] Emergency unpause triggered");
        } catch Error(string memory reason) {
            console.log("   [FAIL] Failed:", reason);
        } catch {
            console.log("   [FAIL] Failed with unknown error");
        }
        
        // Check action count
        uint256 actionCount = registry.getEmergencyActionCount();
        console.log("\n5. Total Emergency Actions:", actionCount);
        
        vm.stopBroadcast();
    }
}
