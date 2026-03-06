// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/tokens/USDAStablecoinV8.sol";

/**
 * @title DeployUSDAV9
 * @notice Deploys USDA V9 (using V8 implementation) with proper access control setup
 * @dev 
 *   1. Deploys V8 implementation
 *   2. Deploys ERC1967Proxy
 *   3. Initializes with deployer as owner
 *   4. Grants PAUSER_ROLE to Sentinel Guardian
 *   5. Sets up PolicyEngine integration
 */
contract DeployUSDAV9 is Script {
    // Sepolia addresses
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SENTINEL_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("==============================================");
        console.log("USDA V9 Deployment with Guardian Setup");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("PolicyEngine:", POLICY_ENGINE);
        console.log("Sentinel Guardian:", SENTINEL_GUARDIAN);
        
        vm.startBroadcast(deployerPK);
        
        // 1. Deploy implementation
        console.log("\n1. Deploying USDAStablecoinV8 implementation...");
        USDAStablecoinV8 implementation = new USDAStablecoinV8();
        console.log("   Implementation:", address(implementation));
        
        // 2. Deploy proxy
        console.log("\n2. Deploying ERC1967Proxy...");
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV8.initialize.selector,
            deployer,           // initialOwner
            POLICY_ENGINE,      // policyEngine
            SENTINEL_GUARDIAN   // guardian (stored for reference)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("   Proxy:", address(proxy));
        
        // 3. Get proxy interface
        USDAStablecoinV8 usda = USDAStablecoinV8(address(proxy));
        
        // 4. Grant PAUSER_ROLE to Sentinel Guardian
        console.log("\n3. Granting PAUSER_ROLE to Sentinel Guardian...");
        usda.grantSentinelPauserRole(SENTINEL_GUARDIAN);
        
        // 5. Verify
        bool hasPauserRole = usda.hasRole(usda.PAUSER_ROLE(), SENTINEL_GUARDIAN);
        console.log("   Guardian has PAUSER_ROLE:", hasPauserRole);
        
        // 6. Also grant MINTER_ROLE to deployer (for testing)
        console.log("\n4. Setup complete!");
        
        vm.stopBroadcast();
        
        // Summary
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("USDA V9 Proxy:     ", address(proxy));
        console.log("Implementation:    ", address(implementation));
        console.log("Owner:             ", deployer);
        console.log("PolicyEngine:      ", POLICY_ENGINE);
        console.log("Guardian Pauser:   ", hasPauserRole ? "YES" : "NO");
        console.log("==============================================");
        console.log("\nNext steps:");
        console.log("1. Update frontend .env with new USDA address");
        console.log("2. Grant MINTER_ROLE to MintingConsumer");
        console.log("3. Test pause functionality");
    }
}

/**
 * @title GrantMinterRole
 * @notice Grants MINTER_ROLE to an address (e.g., MintingConsumer)
 */
contract GrantMinterRole is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        // Get addresses from environment
        address usdaV9 = vm.envAddress("USDA_V9");
        address minter = vm.envAddress("MINTER_ADDRESS");
        
        console.log("Granting MINTER_ROLE...");
        console.log("USDA V9:", usdaV9);
        console.log("Minter:", minter);
        
        vm.startBroadcast(deployerPK);
        
        USDAStablecoinV8 usda = USDAStablecoinV8(usdaV9);
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        usda.grantRole(MINTER_ROLE, minter);
        
        vm.stopBroadcast();
        
        console.log("MINTER_ROLE granted successfully!");
    }
}

/**
 * @title TestGuardianPause
 * @notice Tests that Guardian can pause the contract
 */
contract TestGuardianPause is Script {
    function run() external {
        address usdaV9 = vm.envAddress("USDA_V9");
        address guardian = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
        
        console.log("Testing Guardian pause functionality...");
        console.log("USDA V9:", usdaV9);
        console.log("Guardian:", guardian);
        
        USDAStablecoinV8 usda = USDAStablecoinV8(usdaV9);
        
        // Check initial state
        bool isPaused = usda.paused();
        console.log("Currently paused:", isPaused);
        
        // Check guardian has role
        bytes32 PAUSER_ROLE = keccak256("PAUSER_ROLE");
        bool hasRole = usda.hasRole(PAUSER_ROLE, guardian);
        console.log("Guardian has PAUSER_ROLE:", hasRole);
        
        if (hasRole && !isPaused) {
            console.log("\n[OK] Guardian CAN pause the contract");
        } else if (isPaused) {
            console.log("\n[WARN] Contract is already paused");
        } else {
            console.log("\n[FAIL] Guardian does NOT have PAUSER_ROLE");
        }
    }
}
