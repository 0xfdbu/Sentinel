// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

// TokenPool interface
interface IBurnMintTokenPool {
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
    
    function applyChainUpdates(
        uint64[] calldata remoteChainSelectorsToRemove,
        ChainUpdate[] calldata updates
    ) external;
    
    function isSupportedChain(uint64 chainSelector) external view returns (bool);
}

contract ConfigureRemotePool is Script {
    // Configuration
    address constant TOKEN_POOL_SEPOLIA = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant REMOTE_TOKEN_POOL_ARB = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    address constant REMOTE_TOKEN_ARB = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== CONFIGURE REMOTE POOL ===");
        console.log("Admin:", deployer);
        console.log("TokenPool:", TOKEN_POOL_SEPOLIA);
        console.log("Remote TokenPool (Arbitrum):", REMOTE_TOKEN_POOL_ARB);
        
        IBurnMintTokenPool pool = IBurnMintTokenPool(TOKEN_POOL_SEPOLIA);
        
        // Check if chain is supported
        bool supported = pool.isSupportedChain(ARBITRUM_CHAIN_SELECTOR);
        console.log("Arbitrum supported:", supported);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Configure remote chain
        uint64[] memory chainsToRemove = new uint64[](0);
        IBurnMintTokenPool.ChainUpdate[] memory updates = new IBurnMintTokenPool.ChainUpdate[](1);
        
        bytes[] memory remotePools = new bytes[](1);
        remotePools[0] = abi.encode(REMOTE_TOKEN_POOL_ARB);
        
        IBurnMintTokenPool.RateLimiterConfig memory noLimit = IBurnMintTokenPool.RateLimiterConfig({
            isEnabled: false,
            capacity: 0,
            rate: 0
        });
        
        updates[0] = IBurnMintTokenPool.ChainUpdate({
            remoteChainSelector: ARBITRUM_CHAIN_SELECTOR,
            remotePoolAddresses: remotePools,
            remoteTokenAddress: abi.encode(REMOTE_TOKEN_ARB),
            outboundRateLimiterConfig: noLimit,
            inboundRateLimiterConfig: noLimit
        });
        
        console.log("Applying chain updates...");
        pool.applyChainUpdates(chainsToRemove, updates);
        
        vm.stopBroadcast();
        
        console.log("Remote pool configured!");
        console.log("Arbitrum TokenPool:", REMOTE_TOKEN_POOL_ARB);
        console.log("Arbitrum Token:", REMOTE_TOKEN_ARB);
    }
}
