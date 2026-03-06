// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {USDAStablecoinV6} from "../src/tokens/USDAStablecoinV6.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// TokenPool interface for configuration
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
    function getRemotePool(uint64 chainSelector) external view returns (bytes memory);
    function owner() external view returns (address);
}

// TokenAdminRegistry interface
interface ITokenAdminRegistry {
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
    function getPool(address token) external view returns (address);
    function isAdministrator(address token, address account) external view returns (bool);
}

// BurnMintTokenPool interface
interface IBurnMintTokenPool {
    function getToken() external view returns (address);
    function getRouter() external view returns (address);
}

/**
 * @title DeployV6Full
 * @notice Deploys USDA V6 with ACE protection and configures existing/new CCIP setup
 */
contract DeployV6Full is Script {
    // Sepolia Configuration
    address constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant SEPOLIA_TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant SEPOLIA_POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SEPOLIA_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    // Arbitrum Configuration
    address constant ARBITRUM_TOKEN = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    address constant ARBITRUM_POOL = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    
    // Existing TokenPool (if reconfiguring)
    address constant EXISTING_POOL = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    
    // Deployment parameters
    uint256 constant INITIAL_MINT_CAP = 1_000_000_000e9; // 1B USDA
    uint256 constant DAILY_MINT_LIMIT = 100_000_000e9;   // 100M daily
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== USDA V6 Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        // Only run on Sepolia
        require(block.chainid == 11155111, "Must run on Sepolia");
        
        vm.startBroadcast(deployerKey);
        
        // ==========================================
        // Step 1: Deploy USDA V6 Implementation
        // ==========================================
        console.log("Step 1: Deploying USDA V6 Implementation...");
        USDAStablecoinV6 usdaImpl = new USDAStablecoinV6();
        console.log("USDA V6 Implementation:", address(usdaImpl));
        
        // ==========================================
        // Step 2: Deploy Proxy
        // ==========================================
        console.log("");
        console.log("Step 2: Deploying Proxy...");
        
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV6.initialize.selector,
            deployer,
            SEPOLIA_POLICY_ENGINE,
            SEPOLIA_GUARDIAN,
            INITIAL_MINT_CAP,
            DAILY_MINT_LIMIT
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(usdaImpl), initData);
        address usdaV6 = address(proxy);
        console.log("USDA V6 Proxy:", usdaV6);
        
        USDAStablecoinV6 usda = USDAStablecoinV6(usdaV6);
        
        // ==========================================
        // Step 3: Try to Configure Existing TokenPool
        // ==========================================
        console.log("");
        console.log("Step 3: Configuring TokenPool...");
        
        // Check if existing pool is owned by us
        try ITokenPool(EXISTING_POOL).owner() returns (address owner) {
            console.log("Existing Pool Owner:", owner);
            
            if (owner == deployer) {
                console.log("We own the pool! Configuring routes...");
                
                // Configure Arbitrum route
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
                
                try ITokenPool(EXISTING_POOL).applyChainUpdates(new uint64[](0), updates) {
                    console.log("SUCCESS! TokenPool configured for Arbitrum");
                } catch (bytes memory err) {
                    console.log("Failed to configure pool (may be a different version):");
                    console.logBytes(err);
                }
            } else {
                console.log("We don't own the existing pool");
            }
        } catch {
            console.log("Could not get pool owner");
        }
        
        // ==========================================
        // Step 4: Grant Sentinel Pauser Role
        // ==========================================
        console.log("");
        console.log("Step 4: Granting Sentinel pauser role...");
        usda.grantSentinelPauserRole(SEPOLIA_GUARDIAN);
        console.log("Sentinel pauser role granted to:", SEPOLIA_GUARDIAN);
        
        vm.stopBroadcast();
        
        // ==========================================
        // Summary
        // ==========================================
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("USDA V6 Implementation:", address(usdaImpl));
        console.log("USDA V6 Proxy:", usdaV6);
        console.log("");
        console.log("ADD TO .env:");
        console.log("USDA_V6_SEPOLIA=", usdaV6);
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Update MintingConsumer V5 to use new USDA V6");
        console.log("2. Test minting via MintingConsumer V5");
        console.log("3. Test CCIP transfer with new token");
        console.log("4. If needed, deploy new TokenPool for USDA V6");
    }
}
