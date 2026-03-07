// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/tokens/USDAStablecoinV8.sol";

/**
 * @title DeployUSDAV8
 * @notice Deploys upgradeable USDA V8 with freezer integration
 * @dev 
 *   - Deploys implementation contract
 *   - Deploys ERC1967Proxy
 *   - Initializes with freezer address
 * 
 *   Sepolia Addresses:
 *   - SentinelRegistryV3: 0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9
 *   - EmergencyGuardianV2: 0x... (optional)
 *   - USDAFreezer: 0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21
 *   - PolicyEngine: 0x62CC29A58404631B7db65CE14E366F63D3B96B16
 */
contract DeployUSDAV8 is Script {
    // Sepolia addresses
    address constant REGISTRY_V3 = 0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9;
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant FREEZER = 0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21;
    address constant GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1; // Optional
    
    function run() external {
        vm.startBroadcast();
        
        address admin = msg.sender;
        
        console.log("=== Deploying USDA V8 (Upgradeable with Freezer) ===");
        console.log("Admin:", admin);
        console.log("Policy Engine:", POLICY_ENGINE);
        console.log("Freezer:", FREEZER);
        console.log("Guardian:", GUARDIAN);
        console.log("");
        
        // Deploy implementation
        console.log("1. Deploying V8 Implementation...");
        USDAStablecoinV8 implementation = new USDAStablecoinV8();
        console.log("   Implementation:", address(implementation));
        console.log("");
        
        // Prepare initialization data
        console.log("2. Preparing Proxy Initialization...");
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV8.initialize.selector,
            admin,           // admin
            POLICY_ENGINE,   // policy engine
            GUARDIAN,        // sentinel guardian (optional)
            FREEZER          // freezer (NEW in V8)
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
        USDAStablecoinV8 usda = USDAStablecoinV8(address(proxy));
        console.log("   Name:", usda.name());
        console.log("   Symbol:", usda.symbol());
        console.log("   Decimals:", usda.decimals());
        console.log("   Owner:", usda.owner());
        console.log("   Freezer:", usda.freezer());
        console.log("   Guardian:", usda.sentinelGuardian());
        console.log("   Total Supply:", usda.totalSupply());
        console.log("   Admin has MINTER_ROLE:", usda.hasRole(usda.MINTER_ROLE(), admin));
        console.log("   Admin has UPGRADER_ROLE:", usda.hasRole(usda.UPGRADER_ROLE(), admin));
        console.log("");
        
        console.log("=== Deployment Summary ===");
        console.log("Implementation:", address(implementation));
        console.log("Proxy (Use this address):", address(proxy));
        console.log("Freezer:", FREEZER);
        console.log("Admin:", admin);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Mint initial supply to admin");
        console.log("   Call: usda.mint(admin, amount)");
        console.log("2. Grant MINTER_ROLE to MintingConsumer");
        console.log("3. Test freezer integration");
        console.log("4. Update frontend with new USDA address");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeUSDAV8
 * @notice Upgrades the USDA V8 to a new implementation
 */
contract UpgradeUSDAV8 is Script {
    address constant PROXY = address(0); // Update with proxy address
    
    function run() external {
        if (PROXY == address(0)) {
            console.log("ERROR: Please update PROXY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Upgrading USDA V8 ===");
        console.log("Proxy:", PROXY);
        
        // Deploy new implementation
        console.log("1. Deploying New Implementation...");
        USDAStablecoinV8 newImplementation = new USDAStablecoinV8();
        console.log("   New Implementation:", address(newImplementation));
        
        // Upgrade proxy
        console.log("2. Upgrading Proxy...");
        USDAStablecoinV8 proxy = USDAStablecoinV8(PROXY);
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
 * @title MintUSDAV8
 * @notice Mints initial supply for testing
 */
contract MintUSDAV8 is Script {
    address constant PROXY = address(0); // Update with proxy address
    uint256 constant MINT_AMOUNT = 1000000 * 1e6; // 1M USDA (6 decimals)
    
    function run() external {
        if (PROXY == address(0)) {
            console.log("ERROR: Please update PROXY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Minting USDA V8 ===");
        USDAStablecoinV8 usda = USDAStablecoinV8(PROXY);
        
        address recipient = msg.sender;
        console.log("Recipient:", recipient);
        console.log("Amount:", MINT_AMOUNT / 1e6, "USDA");
        
        usda.mint(recipient, MINT_AMOUNT);
        
        console.log("New Balance:", usda.balanceOf(recipient) / 1e6, "USDA");
        console.log("Total Supply:", usda.totalSupply() / 1e6, "USDA");
        
        vm.stopBroadcast();
    }
}

/**
 * @title TestFreezerUSDAV8
 * @notice Tests the freezer integration
 */
contract TestFreezerUSDAV8 is Script {
    address constant PROXY = address(0); // Update with proxy address
    address constant FREEZER = 0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21;
    address constant TEST_ADDRESS = 0x1234567890123456789012345678901234567890;
    
    function run() external {
        if (PROXY == address(0)) {
            console.log("ERROR: Please update PROXY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Testing USDA V8 Freezer Integration ===");
        USDAStablecoinV8 usda = USDAStablecoinV8(PROXY);
        
        // Check freezer
        console.log("Freezer Address:", usda.freezer());
        console.log("Is Test Address Frozen:", usda.isFrozen(TEST_ADDRESS));
        
        // Try transfer (should work if not frozen)
        console.log("\nAttempting transfer...");
        try usda.transfer(TEST_ADDRESS, 100 * 1e6) {
            console.log("Transfer succeeded (address not frozen)");
        } catch Error(string memory reason) {
            console.log("Transfer failed:", reason);
        }
        
        vm.stopBroadcast();
    }
}
