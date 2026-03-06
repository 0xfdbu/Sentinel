// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {USDAStablecoinV7} from "../src/tokens/USDAStablecoinV7.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";

// TokenAdminRegistry interfaces
interface ITokenAdminRegistry {
    function registerAdminViaOwner(address token) external;
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
}

interface IRegistryModuleOwnerCustom {
    function registerAdminViaOwner(address token) external;
}

/**
 * @title DeployV7Full
 * @notice Deploys USDA V7 with ACE + CCIP TokenPool + full configuration
 */
contract DeployV7Full is Script {
    // Sepolia Configuration
    address constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant SEPOLIA_RMN_PROXY = 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991;
    address constant SEPOLIA_REGISTRY_MODULE = 0x62e731218d0D47305aba2BE3751E7EE9E5520790;
    address constant SEPOLIA_TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant SEPOLIA_POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SEPOLIA_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    // Arbitrum Configuration
    address constant ARBITRUM_POOL = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    address constant ARBITRUM_TOKEN = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== USDA V7 Full Deployment ===");
        console.log("Deployer:", deployer);
        console.log("");
        
        require(block.chainid == 11155111, "Must run on Sepolia");
        
        vm.startBroadcast(deployerKey);
        
        // ========================================
        // Step 1: Deploy USDA V7 Implementation
        // ========================================
        console.log("Step 1: Deploying V7 Implementation...");
        USDAStablecoinV7 usdaImpl = new USDAStablecoinV7();
        console.log("Implementation:", address(usdaImpl));
        
        // ========================================
        // Step 2: Deploy Proxy
        // ========================================
        console.log("");
        console.log("Step 2: Deploying Proxy...");
        
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV7.initialize.selector,
            deployer,                    // initialOwner
            SEPOLIA_POLICY_ENGINE,       // policyEngine
            SEPOLIA_GUARDIAN             // guardian (pauser role granted later)
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(usdaImpl), initData);
        address usdaV7 = address(proxy);
        console.log("USDA V7 Proxy:", usdaV7);
        
        USDAStablecoinV7 usda = USDAStablecoinV7(usdaV7);
        
        // ========================================
        // Step 3: Grant Sentinel Pauser Role
        // ========================================
        console.log("");
        console.log("Step 3: Granting Sentinel pauser role...");
        usda.grantSentinelPauserRole(SEPOLIA_GUARDIAN);
        console.log("Pauser role granted to:", SEPOLIA_GUARDIAN);
        
        // ========================================
        // Step 4: Deploy BurnMintTokenPool
        // ========================================
        console.log("");
        console.log("Step 4: Deploying BurnMintTokenPool...");
        
        address[] memory allowlist = new address[](0); // Permissionless
        
        BurnMintTokenPool tokenPool = new BurnMintTokenPool(
            IBurnMintERC20(usdaV7),
            18, // decimals (V7 has 18 decimals)
            allowlist,
            SEPOLIA_RMN_PROXY,
            SEPOLIA_ROUTER
        );
        
        address poolAddress = address(tokenPool);
        console.log("TokenPool:", poolAddress);
        
        // ========================================
        // Step 5: Set TokenPool in V7
        // ========================================
        console.log("");
        console.log("Step 5: Setting TokenPool in V7...");
        usda.setTokenPool(poolAddress);
        console.log("TokenPool set");
        
        // ========================================
        // Step 6: Register with TokenAdminRegistry
        // ========================================
        console.log("");
        console.log("Step 6: Registering with TokenAdminRegistry...");
        
        IRegistryModuleOwnerCustom(SEPOLIA_REGISTRY_MODULE).registerAdminViaOwner(usdaV7);
        ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY).acceptAdminRole(usdaV7);
        ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY).setPool(usdaV7, poolAddress);
        
        console.log("Registered");
        
        // ========================================
        // Step 7: Configure Cross-Chain Routes
        // ========================================
        console.log("");
        console.log("Step 7: Configuring Arbitrum route...");
        
        TokenPool.ChainUpdate[] memory updates = new TokenPool.ChainUpdate[](1);
        bytes[] memory remotePools = new bytes[](1);
        remotePools[0] = abi.encode(ARBITRUM_POOL);
        
        updates[0] = TokenPool.ChainUpdate({
            remoteChainSelector: ARBITRUM_CHAIN_SELECTOR,
            remotePoolAddresses: remotePools,
            remoteTokenAddress: abi.encode(ARBITRUM_TOKEN),
            outboundRateLimiterConfig: TokenPool.RateLimiterConfig({
                isEnabled: false,
                capacity: 0,
                rate: 0
            }),
            inboundRateLimiterConfig: TokenPool.RateLimiterConfig({
                isEnabled: false,
                capacity: 0,
                rate: 0
            })
        });
        
        tokenPool.applyChainUpdates(new uint64[](0), updates);
        console.log("Arbitrum route configured");
        
        vm.stopBroadcast();
        
        // ========================================
        // Summary
        // ========================================
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("USDA_V7_IMPLEMENTATION=", address(usdaImpl));
        console.log("USDA_V7_PROXY=", usdaV7);
        console.log("USDA_V7_TOKEN_POOL=", poolAddress);
        console.log("");
        console.log("ADD TO .env:");
        console.log("USDA_V7_SEPOLIA=", usdaV7);
        console.log("USDA_V7_POOL_SEPOLIA=", poolAddress);
    }
}

// TokenPool interface for configuration
interface TokenPool {
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
}
