// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/core/EmergencyGuardianV2.sol";

/**
 * @title DeployEmergencyGuardianV2
 * @notice Deploys upgradeable EmergencyGuardianV2 with UUPS proxy
 * @dev 
 *   - Deploys implementation contract
 *   - Deploys ERC1967Proxy
 *   - Initializes with SentinelRegistryV3
 * 
 *   Sepolia SentinelRegistryV3: 0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9
 */
contract DeployEmergencyGuardianV2 is Script {
    // Sepolia addresses
    address constant REGISTRY_V3 = 0xd8E5061dCde3dC7e5Ff01f54b9B5b369DEf1fDB9;
    
    function run() external {
        vm.startBroadcast();
        
        address admin = msg.sender;
        
        console.log("=== Deploying Emergency Guardian V2 (Upgradeable) ===");
        console.log("Admin:", admin);
        console.log("Registry V3:", REGISTRY_V3);
        console.log("");
        
        // Deploy implementation
        console.log("1. Deploying Implementation...");
        EmergencyGuardianV2 implementation = new EmergencyGuardianV2();
        console.log("   Implementation:", address(implementation));
        console.log("");
        
        // Prepare initialization data
        console.log("2. Preparing Proxy Initialization...");
        bytes memory initData = abi.encodeWithSelector(
            EmergencyGuardianV2.initialize.selector,
            REGISTRY_V3,
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
        EmergencyGuardianV2 guardian = EmergencyGuardianV2(address(proxy));
        console.log("   Registry:", guardian.registry());
        console.log("   DON Verification Required:", guardian.donVerificationRequired());
        console.log("   Default Pause Duration:", guardian.defaultPauseDuration(), "seconds");
        console.log("   Admin has DEFAULT_ADMIN_ROLE:", guardian.hasRole(guardian.DEFAULT_ADMIN_ROLE(), admin));
        console.log("   Admin has UPGRADER_ROLE:", guardian.hasRole(guardian.UPGRADER_ROLE(), admin));
        console.log("");
        
        console.log("=== Deployment Summary ===");
        console.log("Implementation:", address(implementation));
        console.log("Proxy (Use this address):", address(proxy));
        console.log("Registry V3:", REGISTRY_V3);
        console.log("Admin:", admin);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update SentinelRegistryV3 with EmergencyGuardianV2 address");
        console.log("   Call: registry.setEmergencyGuardian(address(proxy))");
        console.log("2. Configure target contracts to accept pauses from proxy");
        console.log("3. Grant DON_SIGNER_ROLE to CRE workflow addresses");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeEmergencyGuardianV2
 * @notice Upgrades the EmergencyGuardianV2 to a new implementation
 */
contract UpgradeEmergencyGuardianV2 is Script {
    address constant PROXY = address(0); // Update with proxy address
    
    function run() external {
        if (PROXY == address(0)) {
            console.log("ERROR: Please update PROXY address in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Upgrading Emergency Guardian V2 ===");
        console.log("Proxy:", PROXY);
        
        // Deploy new implementation
        console.log("1. Deploying New Implementation...");
        EmergencyGuardianV2 newImplementation = new EmergencyGuardianV2();
        console.log("   New Implementation:", address(newImplementation));
        
        // Upgrade proxy
        console.log("2. Upgrading Proxy...");
        EmergencyGuardianV2 proxy = EmergencyGuardianV2(PROXY);
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
 * @title ConfigureEmergencyGuardianV2
 * @notice Configures the guardian after deployment
 */
contract ConfigureEmergencyGuardianV2 is Script {
    address constant PROXY = address(0); // Update with proxy address
    address constant REGISTRY = address(0); // Update with registry address
    
    function run() external {
        if (PROXY == address(0) || REGISTRY == address(0)) {
            console.log("ERROR: Please update PROXY and REGISTRY addresses in script");
            return;
        }
        
        vm.startBroadcast();
        
        console.log("=== Configuring Emergency Guardian V2 ===");
        
        // Set EmergencyGuardian in registry
        console.log("1. Setting EmergencyGuardian in Registry...");
        (bool success, ) = REGISTRY.call(
            abi.encodeWithSelector(
                bytes4(keccak256("setEmergencyGuardian(address)")),
                PROXY
            )
        );
        console.log("   Success:", success ? "YES" : "NO");
        
        vm.stopBroadcast();
    }
}
