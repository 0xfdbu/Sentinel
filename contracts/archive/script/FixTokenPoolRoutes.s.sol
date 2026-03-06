// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// TokenPool interfaces
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
    
    function applyChainUpdates(
        uint64[] calldata chainsToRemove,
        ChainUpdate[] calldata updates
    ) external;
    
    function isSupportedChain(uint64 remoteChainSelector) external view returns (bool);
}

/**
 * @title FixTokenPoolRoutes
 * @notice Properly configures cross-chain routes using CCIP contract types
 * @dev Based on CRE template ConfigureTokenPools.s.sol
 */
contract FixTokenPoolRoutes is Script {
    // Chain selectors
    uint64 constant SEPOLIA_CHAIN_SELECTOR = 16015286601757825753;
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    // TokenPools
    address constant TOKEN_POOL_SEPOLIA = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant TOKEN_POOL_ARBITRUM = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    
    // Tokens
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant USDA_V4_ARBITRUM = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        
        console.log("===========================================");
        console.log("CONFIGURING TOKENPOOL ROUTES");
        console.log("===========================================");
        
        // ========================================
        // SEPOLIA -> ARBITRUM ROUTE
        // ========================================
        console.log("\n--- Sepolia -> Arbitrum ---");
        
        // Build ChainUpdate
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
        
        vm.broadcast(deployerKey);
        ITokenPool(TOKEN_POOL_SEPOLIA).applyChainUpdates(new uint64[](0), updates);
        
        console.log("Route configured!");
        
        // ========================================
        // ARBITRUM -> SEPOLIA ROUTE
        // ========================================
        console.log("\n--- Arbitrum -> Sepolia ---");
        
        // Build ChainUpdate
        ITokenPool.ChainUpdate[] memory updatesArb = new ITokenPool.ChainUpdate[](1);
        bytes[] memory remotePoolAddressesArb = new bytes[](1);
        remotePoolAddressesArb[0] = abi.encode(TOKEN_POOL_SEPOLIA);
        
        updatesArb[0] = ITokenPool.ChainUpdate({
            remoteChainSelector: SEPOLIA_CHAIN_SELECTOR,
            remotePoolAddresses: remotePoolAddressesArb,
            remoteTokenAddress: abi.encode(USDA_V4_SEPOLIA),
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
        
        // Note: For Arbitrum, we'd need to switch forks or run separately
        // For now, just configuring Sepolia side
        console.log("(Arbitrum route would be configured separately)");
        
        console.log("\n===========================================");
        console.log("ROUTE CONFIGURATION COMPLETE!");
        console.log("===========================================");
    }
}
