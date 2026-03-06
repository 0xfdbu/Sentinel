// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/core/SentinelRegistryV3.sol";

/**
 * @title DeploySentinelRegistryV3
 * @notice Deploys SentinelRegistryV3 with LINK staking for guardian nodes
 * @dev 
 *   Deploys registry with:
 *   - 5 LINK minimum stake for guardians
 *   - Permissionless registration
 *   - Slashing mechanism for false positives
 *   - Reputation tracking
 * 
 *   Sepolia LINK Token: 0x779877A7B0D9E8603169DdbD7836e478b4624789
 */
contract DeploySentinelRegistryV3 is Script {
    // Sepolia addresses
    address constant LINK_TOKEN = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    
    function run() external {
        vm.startBroadcast();
        
        address admin = msg.sender;
        address treasury = msg.sender; // Can be updated later
        
        console.log("=== Deploying Sentinel Registry V3 ===");
        console.log("Admin:", admin);
        console.log("LINK Token:", LINK_TOKEN);
        console.log("Guardian Stake: 5 LINK");
        console.log("");
        
        // Deploy registry
        console.log("1. Deploying SentinelRegistryV3...");
        SentinelRegistryV3 registry = new SentinelRegistryV3(
            LINK_TOKEN,
            treasury,
            admin
        );
        
        console.log("   Deployed:", address(registry));
        console.log("");
        
        // Verify configuration
        console.log("2. Verifying Configuration...");
        console.log("   LINK Token:", registry.linkToken());
        console.log("   Treasury:", registry.treasury());
        console.log("   Guardian Stake:", registry.GUARDIAN_STAKE() / 1e18, "LINK");
        console.log("   Min Reputation:", registry.MIN_REPUTATION() / 100, "%");
        console.log("   Action Cooldown:", registry.ACTION_COOLDOWN(), "seconds");
        console.log("");
        
        // Verify roles
        console.log("3. Verifying Roles...");
        bool hasAdminRole = registry.hasRole(registry.ADMIN_ROLE(), admin);
        bool hasDefaultAdmin = registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin);
        bool hasSlasherRole = registry.hasRole(registry.SLASHER_ROLE(), admin);
        
        console.log("   Admin has ADMIN_ROLE:", hasAdminRole ? "YES" : "NO");
        console.log("   Admin has DEFAULT_ADMIN_ROLE:", hasDefaultAdmin ? "YES" : "NO");
        console.log("   Admin has SLASHER_ROLE:", hasSlasherRole ? "YES" : "NO");
        console.log("");
        
        console.log("=== Deployment Summary ===");
        console.log("SentinelRegistryV3:", address(registry));
        console.log("Admin:", admin);
        console.log("LINK Token:", LINK_TOKEN);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Approve 5 LINK to register as guardian");
        console.log("2. Call registerGuardian() with your node metadata");
        console.log("3. Set EmergencyGuardianCRE address once deployed");
        
        vm.stopBroadcast();
    }
}

/**
 * @title TestGuardianRegistration
 * @notice Tests guardian registration with LINK staking
 */
contract TestGuardianRegistration is Script {
    address constant LINK_TOKEN = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant REGISTRY = address(0); // Update after deployment
    
    function run() external {
        if (REGISTRY == address(0)) {
            console.log("ERROR: Please update REGISTRY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        address guardian = msg.sender;
        SentinelRegistryV3 registry = SentinelRegistryV3(REGISTRY);
        
        console.log("=== Testing Guardian Registration ===");
        console.log("Guardian:", guardian);
        console.log("Registry:", REGISTRY);
        console.log("");
        
        // Check LINK balance
        IERC20 link = IERC20(LINK_TOKEN);
        uint256 balance = link.balanceOf(guardian);
        console.log("LINK Balance:", balance / 1e18, "LINK");
        
        if (balance < 5e18) {
            console.log("ERROR: Insufficient LINK balance. Need at least 5 LINK.");
            vm.stopBroadcast();
            return;
        }
        
        // Approve LINK
        console.log("1. Approving LINK...");
        link.approve(REGISTRY, 5e18);
        console.log("   Approved 5 LINK");
        
        // Register as guardian
        console.log("2. Registering as guardian...");
        try registry.registerGuardian("Test Guardian Node - Sepolia") {
            console.log("   [PASS] Registered successfully");
        } catch Error(string memory reason) {
            console.log("   [FAIL] Failed:", reason);
            vm.stopBroadcast();
            return;
        } catch {
            console.log("   [FAIL] Failed with unknown error");
            vm.stopBroadcast();
            return;
        }
        
        // Verify registration
        console.log("3. Verifying registration...");
        SentinelRegistryV3.Guardian memory g = registry.getGuardian(guardian);
        
        console.log("   Status:", uint8(g.status) == 1 ? "Active" : "Inactive");
        console.log("   Staked:", g.stakedAmount / 1e18, "LINK");
        console.log("   Registered At:", g.registeredAt);
        console.log("   Reputation:", g.reputation / 100, "%");
        console.log("   Has GUARDIAN_ROLE:", registry.hasRole(registry.GUARDIAN_ROLE(), guardian) ? "YES" : "NO");
        console.log("   Has SENTINEL_ROLE:", registry.hasRole(registry.SENTINEL_ROLE(), guardian) ? "YES" : "NO");
        
        // Check active guardian count
        console.log("4. Registry Stats:");
        console.log("   Total Guardians:", registry.getGuardianCount());
        console.log("   Active Guardians:", registry.getActiveGuardianCount());
        console.log("   Total Staked:", registry.totalStaked() / 1e18, "LINK");
        
        vm.stopBroadcast();
    }
}
