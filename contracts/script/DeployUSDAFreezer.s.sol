// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/core/USDAFreezer.sol";

/**
 * @title DeployUSDAFreezer
 * @notice Deploys upgradeable USDAFreezer with UUPS proxy
 * @dev 
 *   - Deploys implementation contract
 *   - Deploys ERC1967Proxy
 *   - Initializes with SentinelRegistryV3 and USDA token
 * 
 *   Sepolia SentinelRegistryV3: 0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9
 *   Sepolia USDA Token: 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6
 */
contract DeployUSDAFreezer is Script {
    // Sepolia addresses
    address constant REGISTRY_V3 = 0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9;
    address constant USDA_TOKEN = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        vm.startBroadcast();
        
        address admin = msg.sender;
        
        console.log("=== Deploying USDA Freezer (Upgradeable) ===");
        console.log("Admin:", admin);
        console.log("Registry V3:", REGISTRY_V3);
        console.log("USDA Token:", USDA_TOKEN);
        console.log("");
        
        // Deploy implementation
        console.log("1. Deploying Implementation...");
        USDAFreezer implementation = new USDAFreezer();
        console.log("   Implementation:", address(implementation));
        console.log("");
        
        // Prepare initialization data
        console.log("2. Preparing Proxy Initialization...");
        bytes memory initData = abi.encodeWithSelector(
            USDAFreezer.initialize.selector,
            REGISTRY_V3,
            USDA_TOKEN,
            admin
        );
        
        // Deploy proxy
        console.log("3. Deploying ERC1967Proxy...");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("   Proxy:", address(proxy));
        console.log("");
        
        // Verify initialization
        console.log("4. Verifying Initialization...");
        USDAFreezer freezer = USDAFreezer(address(proxy));
        console.log("   Registry:", freezer.registry());
        console.log("   USDA Token:", freezer.usdaToken());
        console.log("   Admin has DEFAULT_ADMIN_ROLE:", freezer.hasRole(freezer.DEFAULT_ADMIN_ROLE(), admin));
        console.log("   Admin has UPGRADER_ROLE:", freezer.hasRole(freezer.UPGRADER_ROLE(), admin));
        console.log("");
        
        console.log("=== Deployment Summary ===");
        console.log("Implementation:", address(implementation));
        console.log("Proxy (Use this address):", address(proxy));
        console.log("Registry V3:", REGISTRY_V3);
        console.log("USDA Token:", USDA_TOKEN);
        console.log("Admin:", admin);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update workflow config with Freezer address");
        console.log("   File: workflows/usda-freezer/config.json");
        console.log("   freezerAddress:", address(proxy));
        console.log("2. Grant DON_SIGNER_ROLE to CRE workflow addresses");
        console.log("3. Test with: cre workflow simulate ./workflows/usda-freezer");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeUSDAFreezer
 * @notice Upgrades the USDAFreezer to a new implementation
 */
contract UpgradeUSDAFreezer is Script {
    address constant PROXY = address(0); // Update with proxy address
    
    function run() external {
        if (PROXY == address(0)) {
            console.log("ERROR: Please update PROXY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Upgrading USDA Freezer ===");
        console.log("Proxy:", PROXY);
        
        // Deploy new implementation
        console.log("1. Deploying New Implementation...");
        USDAFreezer newImplementation = new USDAFreezer();
        console.log("   New Implementation:", address(newImplementation));
        
        // Upgrade proxy
        console.log("2. Upgrading Proxy...");
        USDAFreezer proxy = USDAFreezer(PROXY);
        proxy.upgradeToAndCall(address(newImplementation), "");
        
        console.log("   Upgrade complete!");
        console.log("");
        console.log("=== Upgrade Summary ===");
        console.log("Proxy:", PROXY);
        console.log("New Implementation:", address(newImplementation));
        
        vm.stopBroadcast();
    }
}

/**
 * @title ConfigureUSDAFreezer
 * @notice Configures the freezer after deployment
 */
contract ConfigureUSDAFreezer is Script {
    address constant PROXY = address(0); // Update with proxy address
    address constant NEW_REGISTRY = address(0); // Update if needed
    address constant NEW_USDA = address(0); // Update if needed
    address constant DON_SIGNER = address(0); // Update with CRE workflow address
    
    function run() external {
        if (PROXY == address(0)) {
            console.log("ERROR: Please update PROXY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Configuring USDA Freezer ===");
        USDAFreezer freezer = USDAFreezer(PROXY);
        
        // Update registry if needed
        if (NEW_REGISTRY != address(0)) {
            console.log("1. Updating Registry...");
            freezer.setRegistry(NEW_REGISTRY);
            console.log("   New Registry:", freezer.registry());
        }
        
        // Update USDA token if needed
        if (NEW_USDA != address(0)) {
            console.log("2. Updating USDA Token...");
            freezer.setUSDAToken(NEW_USDA);
            console.log("   New USDA Token:", freezer.usdaToken());
        }
        
        // Grant DON signer role
        if (DON_SIGNER != address(0)) {
            console.log("3. Granting DON_SIGNER_ROLE...");
            freezer.grantRole(freezer.DON_SIGNER_ROLE(), DON_SIGNER);
            console.log("   DON Signer:", DON_SIGNER);
            console.log("   Has Role:", freezer.hasRole(freezer.DON_SIGNER_ROLE(), DON_SIGNER));
        }
        
        console.log("");
        console.log("=== Configuration Complete ===");
        
        vm.stopBroadcast();
    }
}
