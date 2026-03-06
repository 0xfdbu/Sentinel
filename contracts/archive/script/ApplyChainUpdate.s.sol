// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";

interface ITokenPool {
    struct ChainUpdate {
        uint64 remoteChainSelector;
        bytes remotePoolAddress;
        bytes remoteTokenAddress;
        RateLimiterConfig outboundRateLimiterConfig;
        RateLimiterConfig inboundRateLimiterConfig;
    }
    
    struct RateLimiterConfig {
        bool isEnabled;
        uint128 capacity;
        uint128 rate;
    }
    
    function applyChainUpdates(ChainUpdate[] calldata chains) external;
    function isSupportedChain(uint64 chainSelector) external view returns (bool);
}

/**
 * @title ApplyChainUpdate
 * @notice Applies chain updates to the TokenPool
 */
contract ApplyChainUpdate is Script {
    // Configuration
    address constant TOKEN_POOL = 0x36F067776aD58Bd8bf47D9bAd34A3e3e40C6f965;
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    // Chain selectors
    uint64 constant ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("APPLYING CHAIN UPDATE");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("TokenPool:", TOKEN_POOL);
        
        ITokenPool tokenPool = ITokenPool(TOKEN_POOL);
        
        vm.startBroadcast(deployerKey);
        
        // Build chain update
        ITokenPool.ChainUpdate[] memory chains = new ITokenPool.ChainUpdate[](1);
        
        chains[0] = ITokenPool.ChainUpdate({
            remoteChainSelector: ARBITRUM_SEPOLIA_SELECTOR,
            remotePoolAddress: abi.encode(TOKEN_POOL),
            remoteTokenAddress: abi.encode(USDA_V4),
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
        
        tokenPool.applyChainUpdates(chains);
        
        vm.stopBroadcast();
        
        console.log("Chain update applied");
        console.log("Arbitrum Sepolia supported:", tokenPool.isSupportedChain(ARBITRUM_SEPOLIA_SELECTOR));
    }
}
