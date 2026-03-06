// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/policies/VolumePolicyRBAC.sol";
import "../src/policies/BlacklistPolicyRBAC.sol";
import "../src/policies/PolicyEngine.sol";

/**
 * @title DeployACEPoliciesRBAC
 * @notice Deploys upgraded ACE policies with Role-Based Access Control
 * @dev 
 *   Upgrades from Ownable to AccessControl pattern:
 *   - VolumePolicyRBAC: Uses POLICY_MANAGER_ROLE, SENTINEL_ROLE
 *   - BlacklistPolicyRBAC: Uses BLACKLIST_MANAGER_ROLE, SENTINEL_ROLE
 *   
 *   After deployment, Sentinel Guardian can be granted SENTINEL_ROLE
 *   to autonomously adjust policies during threat responses.
 */
contract DeployACEPoliciesRBAC is Script {
    // Existing contracts (Sepolia)
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    // Admin (wallet)
    address admin;
    
    function run() external {
        vm.startBroadcast();
        
        admin = msg.sender;
        
        console.log("=== Deploying ACE Policies with RBAC ===");
        console.log("Admin:", admin);
        console.log("Sentinel Guardian:", SENTINEL_GUARDIAN);
        console.log("");
        
        // ============================================
        // 1. Deploy VolumePolicyRBAC
        // ============================================
        console.log("1. Deploying VolumePolicyRBAC...");
        
        // Default limits: min=1 USD, max=50k USD, daily=100k USD
        VolumePolicyRBAC volumePolicy = new VolumePolicyRBAC(
            admin,              // admin
            1 ether,            // minValue (1 USD in wei)
            50000 ether,        // maxValue (50k USD)
            100000 ether        // dailyLimit (100k USD)
        );
        
        console.log("   Deployed:", address(volumePolicy));
        console.log("   Min Value:", volumePolicy.minValue() / 1e18, "USD");
        console.log("   Max Value:", volumePolicy.maxValue() / 1e18, "USD");
        console.log("   Daily Limit:", volumePolicy.dailyVolumeLimit() / 1e18, "USD");
        
        // ============================================
        // 2. Deploy BlacklistPolicyRBAC
        // ============================================
        console.log("");
        console.log("2. Deploying BlacklistPolicyRBAC...");
        
        BlacklistPolicyRBAC blacklistPolicy = new BlacklistPolicyRBAC(admin);
        
        console.log("   Deployed:", address(blacklistPolicy));
        
        // ============================================
        // 3. Grant SENTINEL_ROLE to Sentinel Guardian
        // ============================================
        console.log("");
        console.log("3. Granting SENTINEL_ROLE to Sentinel Guardian...");
        
        // Grant Sentinel Guardian the role on VolumePolicy
        volumePolicy.grantSentinelRole(SENTINEL_GUARDIAN);
        console.log("   VolumePolicy: SENTINEL_ROLE granted");
        
        // Grant Sentinel Guardian the role on BlacklistPolicy
        blacklistPolicy.grantSentinelRole(SENTINEL_GUARDIAN);
        console.log("   BlacklistPolicy: SENTINEL_ROLE granted");
        
        // Verify
        bool hasVolumeRole = volumePolicy.hasRole(volumePolicy.SENTINEL_ROLE(), SENTINEL_GUARDIAN);
        bool hasBlacklistRole = blacklistPolicy.hasRole(blacklistPolicy.SENTINEL_ROLE(), SENTINEL_GUARDIAN);
        
        console.log("");
        console.log("   Verification:");
        console.log("   VolumePolicy SENTINEL_ROLE:", hasVolumeRole ? "YES" : "NO");
        console.log("   BlacklistPolicy SENTINEL_ROLE:", hasBlacklistRole ? "YES" : "NO");
        
        // ============================================
        // 4. Register new policies in PolicyEngine
        // ============================================
        console.log("");
        console.log("4. Registering new policies in PolicyEngine...");
        
        PolicyEngine policyEngine = PolicyEngine(POLICY_ENGINE);
        
        // Register VolumePolicyRBAC
        try policyEngine.addPolicy(address(volumePolicy), 100) {
            console.log("   VolumePolicyRBAC registered");
        } catch {
            console.log("   VolumePolicyRBAC registration failed (may already exist)");
        }
        
        // Register BlacklistPolicyRBAC
        try policyEngine.addPolicy(address(blacklistPolicy), 200) {
            console.log("   BlacklistPolicyRBAC registered");
        } catch {
            console.log("   BlacklistPolicyRBAC registration failed (may already exist)");
        }
        
        // ============================================
        // 5. Summary
        // ============================================
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("");
        console.log("New RBAC Policies:");
        console.log("  VolumePolicyRBAC:", address(volumePolicy));
        console.log("  BlacklistPolicyRBAC:", address(blacklistPolicy));
        console.log("");
        console.log("Roles Granted to Sentinel Guardian (", SENTINEL_GUARDIAN, "):");
        console.log("  VolumePolicyRBAC.SENTINEL_ROLE:", hasVolumeRole ? "YES" : "NO");
        console.log("  VolumePolicyRBAC.POLICY_MANAGER_ROLE:", 
            volumePolicy.hasRole(volumePolicy.POLICY_MANAGER_ROLE(), SENTINEL_GUARDIAN) ? "YES" : "NO");
        console.log("  BlacklistPolicyRBAC.SENTINEL_ROLE:", hasBlacklistRole ? "YES" : "NO");
        console.log("  BlacklistPolicyRBAC.BLACKLIST_MANAGER_ROLE:", 
            blacklistPolicy.hasRole(blacklistPolicy.BLACKLIST_MANAGER_ROLE(), SENTINEL_GUARDIAN) ? "YES" : "NO");
        console.log("");
        console.log("PolicyEngine Registration:");
        console.log("  Check PolicyEngine.policies() for new entries");
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Update workflow config with new policy addresses");
        console.log("  2. Test Sentinel Guardian policy modification");
        console.log("  3. Update frontend to use new policies");
        
        vm.stopBroadcast();
        
        // Log addresses for reference
        console.log("");
        console.log("=== Contract Addresses ===");
        console.log("VolumePolicyRBAC:", address(volumePolicy));
        console.log("BlacklistPolicyRBAC:", address(blacklistPolicy));
    }
}

/**
 * @title GrantSentinelRoleExisting
 * @notice Grants SENTINEL_ROLE on existing RBAC policies to Sentinel Guardian
 */
contract GrantSentinelRoleExisting is Script {
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    // Update these after deployment
    address constant VOLUME_POLICY_RBAC = address(0); // Replace after deploy
    address constant BLACKLIST_POLICY_RBAC = address(0); // Replace after deploy
    
    function run() external {
        vm.startBroadcast();
        
        console.log("Granting SENTINEL_ROLE on existing RBAC policies...");
        
        if (VOLUME_POLICY_RBAC != address(0)) {
            VolumePolicyRBAC volumePolicy = VolumePolicyRBAC(VOLUME_POLICY_RBAC);
            volumePolicy.grantSentinelRole(SENTINEL_GUARDIAN);
            console.log("VolumePolicyRBAC: SENTINEL_ROLE granted");
        }
        
        if (BLACKLIST_POLICY_RBAC != address(0)) {
            BlacklistPolicyRBAC blacklistPolicy = BlacklistPolicyRBAC(BLACKLIST_POLICY_RBAC);
            blacklistPolicy.grantSentinelRole(SENTINEL_GUARDIAN);
            console.log("BlacklistPolicyRBAC: SENTINEL_ROLE granted");
        }
        
        vm.stopBroadcast();
    }
}
