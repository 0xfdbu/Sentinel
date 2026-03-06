// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface ITokenAdminRegistry {
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
    function getPool(address token) external view returns (address);
}

interface IRegistryModuleOwnerCustom {
    function registerAdminViaOwner(address token) external;
}

contract RegisterSepoliaPool is Script {
    address constant REGISTRY_MODULE = 0x62e731218d0D47305aba2BE3751E7EE9E5520790;
    address constant TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant TOKEN_POOL = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("REGISTERING SEPOLIA TOKENPOOL");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        
        ITokenAdminRegistry registry = ITokenAdminRegistry(TOKEN_ADMIN_REGISTRY);
        address currentPool = registry.getPool(USDA_V4);
        console.log("Current pool:", currentPool);
        
        if (currentPool != address(0)) {
            console.log("Pool already registered!");
            return;
        }
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Register admin
        console.log("1. Registering admin via RegistryModuleOwnerCustom...");
        IRegistryModuleOwnerCustom(REGISTRY_MODULE).registerAdminViaOwner(USDA_V4);
        
        // Step 2: Accept admin role
        console.log("2. Accepting admin role...");
        registry.acceptAdminRole(USDA_V4);
        
        // Step 3: Set pool
        console.log("3. Setting pool in TokenAdminRegistry...");
        registry.setPool(USDA_V4, TOKEN_POOL);
        
        vm.stopBroadcast();
        
        console.log("\nPool registered successfully!");
        console.log("New pool:", registry.getPool(USDA_V4));
    }
}
