// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/policies/PolicyEngine.sol";

/**
 * @title SetupSentinelGuardianACE
 * @notice Grants Sentinel Guardian the necessary roles to modify ACE policies
 * @dev 
 *   This script sets up the Sentinel Guardian with permissions to:
 *   1. Evaluate policies in PolicyEngine (authorized sentinel)
 *   2. Modify VolumePolicy limits (requires owner or delegated role)
 *   3. Add/remove addresses from BlacklistPolicy (requires owner or delegated role)
 *   4. Trigger emergency pauses (PAUSER_ROLE on target contracts)
 * 
 *   NOTE: Since VolumePolicy and BlacklistPolicy use Ownable, we have two options:
 *   A) Transfer ownership to Sentinel Guardian (not recommended - loses control)
 *   B) Use CRE workflow with owner wallet to execute policy changes (current approach)
 *   C) Deploy a PolicyAdmin delegate contract (future enhancement)
 *   
 *   This script implements option B + authorizes Sentinel in PolicyEngine
 */
contract SetupSentinelGuardianACE is Script {
    // Contract addresses (Sepolia)
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("Setting up Sentinel Guardian ACE permissions...");
        console.log("Deployer:", deployer);
        console.log("Sentinel Guardian:", SENTINEL_GUARDIAN);
        console.log("Policy Engine:", POLICY_ENGINE);
        
        vm.startBroadcast(deployerPK);
        
        // Authorize Sentinel Guardian in PolicyEngine
        PolicyEngine policyEngine = PolicyEngine(POLICY_ENGINE);
        policyEngine.authorizeSentinel(SENTINEL_GUARDIAN);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("========================================");
        console.log("SENTINEL GUARDIAN ACE SETUP COMPLETE!");
        console.log("========================================");
        console.log("");
        console.log("Granted Permissions:");
        console.log("  - Authorized Sentinel in PolicyEngine: YES");
        console.log("");
        console.log("Sentinel Guardian can now:");
        console.log("  1. Evaluate policies via evaluateFromContract()");
        console.log("  2. Run policy checks on mint/burn operations");
        console.log("");
        console.log("NOTE: For modifying policy limits (daily mint, blacklist),");
        console.log("      use the CRE workflow with owner key via /setup page.");
        console.log("========================================");
    }
}

/**
 * @title GrantSentinelRoleVolumePolicy
 * @notice Grants SENTINEL_ROLE to Guardian on VolumePolicyRBAC
 */
contract GrantSentinelRoleVolumePolicy is Script {
    address constant VOLUME_POLICY = 0xdd5d03A9d414Df8c8Af7E41eb5E81f6ff5912A25;
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        console.log("Granting SENTINEL_ROLE to Guardian on VolumePolicyRBAC...");
        console.log("Volume Policy:", VOLUME_POLICY);
        console.log("Guardian:", SENTINEL_GUARDIAN);
        
        vm.startBroadcast(deployerPK);
        
        // Call grantRole using low-level call since we don't have the interface
        bytes32 SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
        (bool success, ) = VOLUME_POLICY.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                SENTINEL_ROLE,
                SENTINEL_GUARDIAN
            )
        );
        require(success, "Failed to grant SENTINEL_ROLE");
        
        vm.stopBroadcast();
        
        console.log("SENTINEL_ROLE granted successfully!");
    }
}

/**
 * @title UpdateDailyMintLimit
 * @notice Updates the daily mint limit via VolumePolicyRBAC
 * @dev This script is meant to be called via CRE workflow from the /setup page
 */
contract UpdateDailyMintLimit is Script {
    address constant VOLUME_POLICY = 0xdd5d03A9d414Df8c8Af7E41eb5E81f6ff5912A25;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        // Get new limit from environment (in wei)
        uint256 newLimit = vm.envOr("DAILY_MINT_LIMIT", uint256(2000 * 10**18)); // Default 2000 USDA
        
        console.log("Updating daily mint limit...");
        console.log("Volume Policy:", VOLUME_POLICY);
        console.log("New Limit:", newLimit / 1e18, "USDA");
        
        vm.startBroadcast(deployerPK);
        
        // Call setDailyLimit using low-level call (requires reason string)
        (bool success, ) = VOLUME_POLICY.call(
            abi.encodeWithSignature(
                "setDailyLimit(uint256,string)",
                newLimit,
                "Sentinel Guardian setup - 2000 USDA daily limit"
            )
        );
        require(success, "Failed to set daily limit");
        
        vm.stopBroadcast();
        
        console.log("Daily mint limit updated successfully!");
    }
}

/**
 * @title GrantSentinelRoleBlacklistPolicy
 * @notice Grants SENTINEL_ROLE to Guardian on BlacklistPolicyRBAC
 */
contract GrantSentinelRoleBlacklistPolicy is Script {
    address constant BLACKLIST_POLICY = 0xE0af3cDd58Ef7AA7186539cCD1184C1e3b395eE7;
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        console.log("Granting SENTINEL_ROLE to Guardian on BlacklistPolicyRBAC...");
        console.log("Blacklist Policy:", BLACKLIST_POLICY);
        console.log("Guardian:", SENTINEL_GUARDIAN);
        
        vm.startBroadcast(deployerPK);
        
        // Call grantRole using low-level call
        bytes32 SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
        (bool success, ) = BLACKLIST_POLICY.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                SENTINEL_ROLE,
                SENTINEL_GUARDIAN
            )
        );
        require(success, "Failed to grant SENTINEL_ROLE");
        
        vm.stopBroadcast();
        
        console.log("SENTINEL_ROLE granted successfully!");
    }
}

/**
 * @title AddToBlacklist
 * @notice Adds an address to the blacklist
 */
contract AddToBlacklist is Script {
    address constant BLACKLIST_POLICY = 0xE0af3cDd58Ef7AA7186539cCD1184C1e3b395eE7;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address addressToBlacklist = vm.envAddress("ADDRESS_TO_BLACKLIST");
        string memory reason = vm.envOr("BLACKLIST_REASON", string("Suspicious activity"));
        
        console.log("Adding address to blacklist...");
        console.log("Blacklist Policy:", BLACKLIST_POLICY);
        console.log("Address:", addressToBlacklist);
        console.log("Reason:", reason);
        
        vm.startBroadcast(deployerPK);
        
        // Call addToBlacklist using low-level call for RBAC version
        (bool success, ) = BLACKLIST_POLICY.call(
            abi.encodeWithSignature(
                "addToBlacklist(address,string)",
                addressToBlacklist,
                reason
            )
        );
        require(success, "Failed to add to blacklist");
        
        vm.stopBroadcast();
        
        console.log("Address blacklisted successfully!");
    }
}

/**
 * @title RemoveFromBlacklist
 * @notice Removes an address from the blacklist
 */
contract RemoveFromBlacklist is Script {
    address constant BLACKLIST_POLICY = 0xE0af3cDd58Ef7AA7186539cCD1184C1e3b395eE7;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address addressToUnblacklist = vm.envAddress("ADDRESS_TO_UNBLACKLIST");
        
        console.log("Removing address from blacklist...");
        console.log("Address:", addressToUnblacklist);
        
        vm.startBroadcast(deployerPK);
        
        // Call removeFromBlacklist using low-level call for RBAC version
        (bool success, ) = BLACKLIST_POLICY.call(
            abi.encodeWithSignature(
                "removeFromBlacklist(address)",
                addressToUnblacklist
            )
        );
        require(success, "Failed to remove from blacklist");
        
        vm.stopBroadcast();
        
        console.log("Address removed from blacklist successfully!");
    }
}

/**
 * @title GrantPauserRole
 * @notice Grants PAUSER_ROLE to an address on USDA V8
 */
contract GrantPauserRole is Script {
    address constant USDA_V8 = 0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address pauser = vm.envAddress("PAUSER_ADDRESS");
        
        console.log("Granting PAUSER_ROLE...");
        console.log("USDA V8:", USDA_V8);
        console.log("Pauser:", pauser);
        
        vm.startBroadcast(deployerPK);
        
        // Get the role bytes32
        bytes32 PAUSER_ROLE = keccak256("PAUSER_ROLE");
        
        (bool success, ) = USDA_V8.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                PAUSER_ROLE,
                pauser
            )
        );
        
        require(success, "Failed to grant PAUSER_ROLE");
        
        vm.stopBroadcast();
        
        console.log("PAUSER_ROLE granted successfully!");
    }
}

/**
 * @title TestACEEnforcement
 * @notice Tests that ACE policies are being enforced
 */
contract TestACEEnforcement is Script {
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external view {
        console.log("Testing ACE Enforcement...");
        console.log("Policy Engine:", POLICY_ENGINE);
        console.log("Sentinel Guardian:", SENTINEL_GUARDIAN);
        
        PolicyEngine policyEngine = PolicyEngine(POLICY_ENGINE);
        
        // Check if Sentinel is authorized
        bool isAuthorized = policyEngine.isAuthorizedSentinel(SENTINEL_GUARDIAN);
        console.log("Sentinel Guardian Authorized:", isAuthorized);
        
        // Get active policies
        uint256 policyCount = policyEngine.getActivePolicyCount();
        console.log("Active Policies:", policyCount);
        
        // List active policies
        PolicyEngine.PolicyInfo[] memory allPolicies = policyEngine.getAllPolicies();
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allPolicies.length; i++) {
            if (allPolicies[i].isActive) {
                activeCount++;
            }
        }
        console.log("Total Active Policies:", activeCount);
        
        console.log("");
        console.log("ACE Enforcement Test Complete!");
    }
}


