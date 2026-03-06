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
    function getRemoteToken(uint64 chainSelector) external view returns (bytes memory);
    function getSupportedChains() external view returns (uint64[] memory);
    function owner() external view returns (address);
}

/**
 * @title ConfigurePoolRoutes
 * @notice Configures cross-chain routes for existing TokenPool
 */
contract ConfigurePoolRoutes is Script {
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    address constant TOKEN_POOL_SEPOLIA = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant TOKEN_POOL_ARBITRUM = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    address constant USDA_V4_ARBITRUM = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== Configuring TokenPool Routes ===");
        console.log("Deployer:", deployer);
        console.log("TokenPool:", TOKEN_POOL_SEPOLIA);
        console.log("");
        
        // Check ownership
        ITokenPool pool = ITokenPool(TOKEN_POOL_SEPOLIA);
        address owner = pool.owner();
        console.log("Pool Owner:", owner);
        require(owner == deployer, "Not the pool owner");
        
        // Check if chain is already supported
        bool isSupported = pool.isSupportedChain(ARBITRUM_CHAIN_SELECTOR);
        console.log("Arbitrum supported:", isSupported);
        
        if (isSupported) {
            console.log("Chain already configured, removing first...");
            
            // Remove the chain first
            uint64[] memory chainsToRemove = new uint64[](1);
            chainsToRemove[0] = ARBITRUM_CHAIN_SELECTOR;
            
            vm.startBroadcast(deployerKey);
            pool.applyChainUpdates(chainsToRemove, new ITokenPool.ChainUpdate[](0));
            vm.stopBroadcast();
            
            console.log("Chain removed, will reconfigure");
        }
        
        // Configure Arbitrum route
        console.log("");
        console.log("Configuring Arbitrum route...");
        
        ITokenPool.ChainUpdate[] memory updates = new ITokenPool.ChainUpdate[](1);
        bytes[] memory remotePoolAddresses = new bytes[](1);
        remotePoolAddresses[0] = abi.encode(TOKEN_POOL_ARBITRUM);
        
        updates[0] = ITokenPool.ChainUpdate({
            remoteChainSelector: ARBITRUM_CHAIN_SELECTOR,
            remotePoolAddresses: remotePoolAddresses,
            remoteTokenAddress: abi.encode(USDA_V4_ARBITRUM),
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
        
        vm.startBroadcast(deployerKey);
        pool.applyChainUpdates(new uint64[](0), updates);
        vm.stopBroadcast();
        
        console.log("SUCCESS! Arbitrum route configured");
        console.log("");
        
        // Verify configuration
        console.log("=== Verification ===");
        console.log("Arbitrum supported:", pool.isSupportedChain(ARBITRUM_CHAIN_SELECTOR));
        
        bytes memory remoteToken = pool.getRemoteToken(ARBITRUM_CHAIN_SELECTOR);
        console.log("Remote token:", vm.toString(remoteToken));
    }
}
