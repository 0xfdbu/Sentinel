// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// TokenPool interface
interface ITokenPool {
    struct ChainUpdate {
        uint64 remoteChainSelector;
        bytes[] remotePoolAddresses;
        bytes remoteTokenAddress;
        RateLimiterConfig outboundRateLimiterConfig;
        RateLimiterConfig inboundRateLimiterConfig;
    }
    
    struct RateLimiterConfig {
        bool isEnabled;
        uint128 capacity;
        uint128 rate;
    }
    
    function applyChainUpdates(uint64[] calldata chainsToRemove, ChainUpdate[] calldata updates) external;
    function isSupportedChain(uint64 remoteChainSelector) external view returns (bool);
    function getRouter() external view returns (address);
    function owner() external view returns (address);
}

// USDA V6 interface
interface IUSDAv6 {
    function setTokenPool(address _tokenPool) external;
    function grantRole(bytes32 role, address account) external;
    function MINTER_ROLE() external view returns (bytes32);
    function BURNER_ROLE() external view returns (bytes32);
    function tokenPool() external view returns (address);
}

/**
 * @title ConfigureV6Pool
 * @notice Configures V6 TokenPool with cross-chain routes
 */
contract ConfigureV6Pool is Script {
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    address constant USDA_V6 = 0xc1B1f04212aF9da91cEC3CE1ee9936006b990A61;
    address constant TOKEN_POOL_V6 = 0xCD6A340c1731F9A36f83880c215741C06e0F670b;
    
    // Arbitrum references
    address constant ARBITRUM_TOKEN = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    address constant ARBITRUM_POOL = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== Configuring V6 TokenPool ===");
        console.log("Deployer:", deployer);
        console.log("TokenPool:", TOKEN_POOL_V6);
        console.log("");
        
        // Check ownership
        ITokenPool pool = ITokenPool(TOKEN_POOL_V6);
        address owner = pool.owner();
        console.log("Pool Owner:", owner);
        require(owner == deployer, "Not the pool owner");
        
        vm.startBroadcast(deployerKey);
        
        // ========================================
        // Step 1: Configure Cross-Chain Routes
        // ========================================
        console.log("Configuring Arbitrum route...");
        
        ITokenPool.ChainUpdate[] memory updates = new ITokenPool.ChainUpdate[](1);
        bytes[] memory remotePools = new bytes[](1);
        remotePools[0] = abi.encode(ARBITRUM_POOL);
        
        updates[0] = ITokenPool.ChainUpdate({
            remoteChainSelector: ARBITRUM_CHAIN_SELECTOR,
            remotePoolAddresses: remotePools,
            remoteTokenAddress: abi.encode(ARBITRUM_TOKEN),
            outboundRateLimiterConfig: ITokenPool.RateLimiterConfig({
                isEnabled: false,
                capacity: 0,
                rate: 0
            }),
            inboundRateLimiterConfig: ITokenPool.RateLimiterConfig({
                isEnabled: false,
                capacity: 0,
                rate: 0
            })
        });
        
        pool.applyChainUpdates(new uint64[](0), updates);
        console.log("Arbitrum route configured!");
        
        // ========================================
        // Step 2: Grant Roles to Pool on V6
        // ========================================
        console.log("");
        console.log("Granting roles to TokenPool on V6...");
        
        IUSDAv6 usda = IUSDAv6(USDA_V6);
        usda.setTokenPool(TOKEN_POOL_V6);
        console.log("TokenPool set in V6");
        
        vm.stopBroadcast();
        
        // ========================================
        // Verification
        // ========================================
        console.log("");
        console.log("=== Verification ===");
        console.log("Arbitrum supported:", pool.isSupportedChain(ARBITRUM_CHAIN_SELECTOR));
        console.log("TokenPool in V6:", usda.tokenPool());
        console.log("");
        console.log("========================================");
        console.log("V6 CCIP CONFIGURATION COMPLETE!");
        console.log("========================================");
    }
}
