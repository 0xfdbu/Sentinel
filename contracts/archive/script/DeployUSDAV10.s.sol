// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/tokens/USDAStablecoinV10.sol";

/**
 * @title DeployUSDAV10
 * @notice Deploys USDA V10 with FREEZE functionality + full Guardian setup
 * @dev 
 *   1. Deploys V10 implementation
 *   2. Deploys ERC1967Proxy
 *   3. Initializes with deployer as owner
 *   4. Grants PAUSER_ROLE to Sentinel Guardian
 *   5. Grants FREEZER_ROLE to Sentinel Guardian (NEW!)
 *   6. Sets up PolicyEngine integration
 */
contract DeployUSDAV10 is Script {
    // Sepolia addresses
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("==============================================");
        console.log("USDA V10 Deployment with Freeze + Guardian");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("PolicyEngine:", POLICY_ENGINE);
        console.log("Sentinel Guardian:", SENTINEL_GUARDIAN);
        
        vm.startBroadcast(deployerPK);
        
        // 1. Deploy implementation
        console.log("\n1. Deploying USDAStablecoinV10 implementation...");
        USDAStablecoinV10 implementation = new USDAStablecoinV10();
        console.log("   Implementation:", address(implementation));
        
        // 2. Deploy proxy
        console.log("\n2. Deploying ERC1967Proxy...");
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV10.initialize.selector,
            deployer,           // initialOwner
            POLICY_ENGINE,      // policyEngine
            SENTINEL_GUARDIAN   // guardian
        );
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("   Proxy:", address(proxy));
        
        // 3. Get proxy interface
        USDAStablecoinV10 usda = USDAStablecoinV10(address(proxy));
        
        // 4. Grant PAUSER_ROLE to Sentinel Guardian
        console.log("\n3. Granting PAUSER_ROLE to Sentinel Guardian...");
        usda.grantSentinelPauserRole(SENTINEL_GUARDIAN);
        
        // 5. Grant FREEZER_ROLE to Sentinel Guardian (NEW!)
        console.log("\n4. Granting FREEZER_ROLE to Sentinel Guardian...");
        usda.grantSentinelFreezerRole(SENTINEL_GUARDIAN);
        
        // 6. Verify permissions
        bool hasPauser = usda.hasRole(usda.PAUSER_ROLE(), SENTINEL_GUARDIAN);
        bool hasFreezer = usda.hasRole(usda.FREEZER_ROLE(), SENTINEL_GUARDIAN);
        
        console.log("\n5. Verification:");
        console.log("   Guardian has PAUSER_ROLE:", hasPauser);
        console.log("   Guardian has FREEZER_ROLE:", hasFreezer);
        
        vm.stopBroadcast();
        
        // Summary
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("USDA V10 Proxy:     ", address(proxy));
        console.log("Implementation:    ", address(implementation));
        console.log("Owner:             ", deployer);
        console.log("PolicyEngine:      ", POLICY_ENGINE);
        console.log("Guardian Pauser:   ", hasPauser ? "YES" : "NO");
        console.log("Guardian Freezer:  ", hasFreezer ? "YES" : "NO");
        console.log("==============================================");
        console.log("\nNEW: Freeze Functions!");
        console.log("- freeze(address, reason)");
        console.log("- unfreeze(address)");
        console.log("- batchFreeze(addresses, reason)");
        console.log("==============================================");
    }
}

/**
 * @title GrantMinterRoleV10
 * @notice Grants MINTER_ROLE to an address (e.g., MintingConsumer)
 */
contract GrantMinterRoleV10 is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address usdaV10 = vm.envAddress("USDA_V10");
        address minter = vm.envAddress("MINTER_ADDRESS");
        
        console.log("Granting MINTER_ROLE on V10...");
        console.log("USDA V10:", usdaV10);
        console.log("Minter:", minter);
        
        vm.startBroadcast(deployerPK);
        
        USDAStablecoinV10 usda = USDAStablecoinV10(usdaV10);
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        usda.grantRole(MINTER_ROLE, minter);
        
        vm.stopBroadcast();
        
        console.log("MINTER_ROLE granted successfully!");
    }
}

/**
 * @title TestFreezeFunctionality
 * @notice Tests the freeze/unfreeze functionality
 */
contract TestFreezeFunctionality is Script {
    function run() external {
        uint256 guardianPK = vm.envUint("PRIVATE_KEY");
        address usdaV10 = vm.envAddress("USDA_V10");
        address target = vm.envAddress("FREEZE_TARGET");
        
        console.log("Testing Freeze Functionality...");
        console.log("USDA V10:", usdaV10);
        console.log("Target to freeze:", target);
        
        vm.startBroadcast(guardianPK);
        
        USDAStablecoinV10 usda = USDAStablecoinV10(usdaV10);
        
        // Check if target is already frozen
        bool isFrozen = usda.isFrozen(target);
        console.log("Currently frozen:", isFrozen);
        
        if (!isFrozen) {
            // Freeze the target
            usda.freeze(target, "Suspicious activity detected");
            console.log("Target frozen!");
            
            // Verify
            isFrozen = usda.isFrozen(target);
            console.log("Frozen status after tx:", isFrozen);
            
            // Get frozen count
            uint256 count = usda.getFrozenCount();
            console.log("Total frozen addresses:", count);
        } else {
            // Unfreeze
            usda.unfreeze(target);
            console.log("Target unfrozen!");
        }
        
        vm.stopBroadcast();
    }
}
