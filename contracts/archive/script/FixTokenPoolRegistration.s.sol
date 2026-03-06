// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// TokenAdminRegistry interfaces
interface ITokenAdminRegistry {
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
}

interface IRegistryModuleOwnerCustom {
    function registerAdminViaOwner(address token) external;
}

/**
 * @title FixTokenPoolRegistration
 * @notice Registers TokenPool with CCIP TokenAdminRegistry (required for CCIP transfers)
 * @dev The CRE template shows this is MANDATORY for CCIP to work
 */
contract FixTokenPoolRegistration is Script {
    // Sepolia Configuration
    address constant SEPOLIA_REGISTRY_MODULE = 0x62e731218d0D47305aba2BE3751E7EE9E5520790;
    address constant SEPOLIA_TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant TOKEN_POOL_SEPOLIA = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    // Arbitrum Sepolia Configuration  
    address constant ARBITRUM_REGISTRY_MODULE = 0x97300785aF1edE1343DB6d90706A35CF14aA3d81;
    address constant ARBITRUM_TOKEN_ADMIN_REGISTRY = 0xA92053a4a3922084d992fD2835bdBa4caC6877e6;
    address constant TOKEN_POOL_ARBITRUM = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    address constant USDA_V4_ARBITRUM = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        string memory sepoliaRpc = vm.envString("SEPOLIA_RPC");
        string memory arbitrumRpc = vm.envString("ARBITRUM_SEPOLIA_RPC");
        
        console.log("===========================================");
        console.log("REGISTERING TOKENPOOLS WITH TOKENADMINREGISTRY");
        console.log("===========================================");
        
        // ========================================
        // SEPOLIA REGISTRATION
        // ========================================
        console.log("\n--- SEPOLIA ---");
        vm.createSelectFork(sepoliaRpc);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Register admin via RegistryModuleOwnerCustom
        console.log("1. Registering admin via RegistryModuleOwnerCustom...");
        IRegistryModuleOwnerCustom(SEPOLIA_REGISTRY_MODULE).registerAdminViaOwner(USDA_V4_SEPOLIA);
        
        // Step 2: Accept admin role
        console.log("2. Accepting admin role...");
        ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY).acceptAdminRole(USDA_V4_SEPOLIA);
        
        // Step 3: Set pool in TokenAdminRegistry
        console.log("3. Setting pool in TokenAdminRegistry...");
        ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY).setPool(USDA_V4_SEPOLIA, TOKEN_POOL_SEPOLIA);
        
        vm.stopBroadcast();
        
        console.log("Sepolia TokenPool registered!");
        
        // ========================================
        // ARBITRUM SEPOLIA REGISTRATION
        // ========================================
        console.log("\n--- ARBITRUM SEPOLIA ---");
        vm.createSelectFork(arbitrumRpc);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Register admin
        console.log("1. Registering admin via RegistryModuleOwnerCustom...");
        IRegistryModuleOwnerCustom(ARBITRUM_REGISTRY_MODULE).registerAdminViaOwner(USDA_V4_ARBITRUM);
        
        // Step 2: Accept admin role
        console.log("2. Accepting admin role...");
        ITokenAdminRegistry(ARBITRUM_TOKEN_ADMIN_REGISTRY).acceptAdminRole(USDA_V4_ARBITRUM);
        
        // Step 3: Set pool
        console.log("3. Setting pool in TokenAdminRegistry...");
        ITokenAdminRegistry(ARBITRUM_TOKEN_ADMIN_REGISTRY).setPool(USDA_V4_ARBITRUM, TOKEN_POOL_ARBITRUM);
        
        vm.stopBroadcast();
        
        console.log("Arbitrum TokenPool registered!");
        
        console.log("\n===========================================");
        console.log("REGISTRATION COMPLETE!");
        console.log("===========================================");
        console.log("\nTokenPools are now registered with CCIP.");
        console.log("Users can now bridge via CCIP Router.");
    }
}
