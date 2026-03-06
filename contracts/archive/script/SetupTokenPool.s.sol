// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

// Interface for USDA V4
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUSDAStablecoinV4 {
    function grantMintAndBurnRoles(address minterBurner) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function MINTER_ROLE() external view returns (bytes32);
    function BURNER_ROLE() external view returns (bytes32);
}

// Interface for TokenAdminRegistry
interface ITokenAdminRegistry {
    function registerAdmin(address token, address admin) external;
    function getPool(address token) external view returns (address);
}

// Interface for TokenPool
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
    
    function getSupportedChains() external view returns (uint64[] memory);
    function isSupportedChain(uint64 chainSelector) external view returns (bool);
}

contract SetupTokenPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get addresses from environment
        address stablecoin = vm.envAddress("STABLECOIN_ADDRESS");
        address tokenPool = vm.envAddress("TOKENPOOL_ADDRESS");
        uint256 remoteChainSelector = vm.envUint("REMOTE_CHAIN_SELECTOR");
        address remoteTokenPool = vm.envAddress("REMOTE_TOKENPOOL_ADDRESS");
        address remoteStablecoin = vm.envAddress("REMOTE_STABLECOIN_ADDRESS");
        
        console.log("Setup on chain:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Stablecoin:", stablecoin);
        console.log("TokenPool:", tokenPool);
        console.log("Remote Chain:", remoteChainSelector);
        console.log("Remote TokenPool:", remoteTokenPool);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Grant mint and burn roles to the TokenPool
        console.log("\n1. Granting mint/burn roles to TokenPool...");
        IUSDAStablecoinV4 usda = IUSDAStablecoinV4(stablecoin);
        usda.grantMintAndBurnRoles(tokenPool);
        
        bool hasMinter = usda.hasRole(usda.MINTER_ROLE(), tokenPool);
        bool hasBurner = usda.hasRole(usda.BURNER_ROLE(), tokenPool);
        console.log("   Has MINTER_ROLE:", hasMinter);
        console.log("   Has BURNER_ROLE:", hasBurner);
        
        // Step 2: Configure cross-chain route
        console.log("\n2. Configuring cross-chain route...");
        IBurnMintTokenPool pool = IBurnMintTokenPool(tokenPool);
        
        uint64[] memory chainsToRemove = new uint64[](0);
        IBurnMintTokenPool.ChainUpdate[] memory updates = new IBurnMintTokenPool.ChainUpdate[](1);
        
        bytes[] memory remotePools = new bytes[](1);
        remotePools[0] = abi.encode(remoteTokenPool);
        
        // No rate limiting for now (enable with capacity/rate if needed)
        IBurnMintTokenPool.RateLimiterConfig memory noLimit = IBurnMintTokenPool.RateLimiterConfig({
            isEnabled: false,
            capacity: 0,
            rate: 0
        });
        
        updates[0] = IBurnMintTokenPool.ChainUpdate({
            remoteChainSelector: uint64(remoteChainSelector),
            remotePoolAddresses: remotePools,
            remoteTokenAddress: abi.encode(remoteStablecoin),
            outboundRateLimiterConfig: noLimit,
            inboundRateLimiterConfig: noLimit
        });
        
        pool.applyChainUpdates(chainsToRemove, updates);
        console.log("   Cross-chain route configured!");
        
        vm.stopBroadcast();
        
        console.log("\n=== SETUP COMPLETE ===");
        console.log("TokenPool can now:");
        console.log("  - Mint/burn USDA on this chain");
        console.log("  - Send/receive to/from configured remote chain");
    }
}
