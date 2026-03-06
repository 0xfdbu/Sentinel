// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {USDAStablecoinV6} from "../src/tokens/USDAStablecoinV6.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// CCIP TokenPool imports
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/ccip/pools/BurnMintTokenPool.sol";
import {TokenPool} from "@chainlink/contracts-ccip/ccip/pools/TokenPool.sol";
import {IRouter} from "@chainlink/contracts-ccip/ccip/interfaces/IRouter.sol";
import {IGetCCIPAdmin} from "@chainlink/contracts-ccip/ccip/interfaces/IGetCCIPAdmin.sol";

// TokenAdminRegistry interface
interface ITokenAdminRegistry {
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
    function getPool(address token) external view returns (address);
    function isAdministrator(address token, address account) external view returns (bool);
    function proposeAdministrator(address token, address admin) external;
}

/**
 * @title DeployV6AndConfigureCCIP
 * @notice Deploys USDA V6 with ACE protection and properly configured CCIP TokenPool
 * @dev Includes remote pool configuration for cross-chain transfers
 */
contract DeployV6AndConfigureCCIP is Script {
    // Sepolia Configuration
    address constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant SEPOLIA_TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant SEPOLIA_POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SEPOLIA_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    // Arbitrum Configuration (for remote pool setup)
    address constant ARBITRUM_TOKEN = 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad;
    address constant ARBITRUM_POOL = 0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C;
    
    // Deployment parameters
    uint256 constant INITIAL_MINT_CAP = 1_000_000_000e9; // 1B USDA with 9 decimals
    uint256 constant DAILY_MINT_LIMIT = 100_000_000e9;   // 100M USDA daily
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== USDA V6 + CCIP Deployment ===");
        console.log("Deployer:", deployer);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ==========================================
        // Step 1: Deploy USDA V6 Implementation
        // ==========================================
        console.log("Step 1: Deploying USDA V6 Implementation...");
        USDAStablecoinV6 usdaImpl = new USDAStablecoinV6();
        console.log("USDA V6 Implementation:", address(usdaImpl));
        
        // ==========================================
        // Step 2: Deploy ERC1967 Proxy
        // ==========================================
        console.log("");
        console.log("Step 2: Deploying ERC1967 Proxy...");
        
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV6.initialize.selector,
            deployer,                           // initialOwner
            SEPOLIA_POLICY_ENGINE,              // policyEngine
            SEPOLIA_GUARDIAN,                   // guardian (role granted later)
            INITIAL_MINT_CAP,                   // initialMintCap
            DAILY_MINT_LIMIT                    // dailyMintLimit
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(usdaImpl), initData);
        address usdaV6 = address(proxy);
        console.log("USDA V6 Proxy:", usdaV6);
        
        USDAStablecoinV6 usda = USDAStablecoinV6(usdaV6);
        
        // ==========================================
        // Step 3: Deploy BurnMintTokenPool
        // ==========================================
        console.log("");
        console.log("Step 3: Deploying BurnMintTokenPool...");
        
        // Deploy TokenPool with proper configuration
        BurnMintTokenPool tokenPool = new BurnMintTokenPool(
            usdaV6,                    // token
            18,                        // decimals (token decimals)
            new address[](0),          // allowlist (empty = permissionless)
            SEPOLIA_ROUTER,            // router
            SEPOLIA_TOKEN_ADMIN_REGISTRY // tokenAdminRegistry
        );
        
        console.log("BurnMintTokenPool:", address(tokenPool));
        
        // ==========================================
        // Step 4: Configure TokenPool for Cross-Chain
        // ==========================================
        console.log("");
        console.log("Step 4: Configuring TokenPool for Arbitrum...");
        
        // Prepare chain update for Arbitrum
        TokenPool.ChainUpdate[] memory chainsToAdd = new TokenPool.ChainUpdate[](1);
        
        // Rate limiter config (disabled for testing)
        RateLimiter.Config memory rateLimiterConfig = RateLimiter.Config({
            isEnabled: false,
            minTokens: 0,
            maxTokens: 0
        });
        
        chainsToAdd[0] = TokenPool.ChainUpdate({
            remoteChainSelector: ARBITRUM_CHAIN_SELECTOR,
            remotePoolAddresses: _toBytesArray(ARBITRUM_POOL),
            remoteTokenAddress: abi.encode(ARBITRUM_TOKEN),
            outboundRateLimiterConfig: rateLimiterConfig,
            inboundRateLimiterConfig: rateLimiterConfig
        });
        
        // Apply chain updates
        tokenPool.applyChainUpdates(new uint64[](0), chainsToAdd);
        console.log("TokenPool configured for Arbitrum");
        
        // ==========================================
        // Step 5: Set TokenPool in USDA V6
        // ==========================================
        console.log("");
        console.log("Step 5: Setting TokenPool in USDA V6...");
        usda.setTokenPool(address(tokenPool));
        console.log("TokenPool set in USDA V6");
        
        // ==========================================
        // Step 6: Register with TokenAdminRegistry
        // ==========================================
        console.log("");
        console.log("Step 6: Registering with TokenAdminRegistry...");
        
        ITokenAdminRegistry registry = ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY);
        
        // First, check if we're already the administrator
        if (!registry.isAdministrator(usdaV6, deployer)) {
            // Propose ourselves as administrator if needed
            // Note: This may fail if already registered, which is fine
            try registry.proposeAdministrator(usdaV6, deployer) {
                console.log("Proposed as administrator");
            } catch {
                console.log("Administrator proposal skipped");
            }
        }
        
        // Accept admin role
        try registry.acceptAdminRole(usdaV6) {
            console.log("Accepted admin role");
        } catch {
            console.log("Admin role already accepted or not needed");
        }
        
        // Set pool in registry
        registry.setPool(usdaV6, address(tokenPool));
        console.log("TokenPool registered in TokenAdminRegistry");
        
        // ==========================================
        // Step 7: Grant Sentinel Pauser Role
        // ==========================================
        console.log("");
        console.log("Step 7: Granting Sentinel pauser role...");
        usda.grantSentinelPauserRole(SEPOLIA_GUARDIAN);
        console.log("Sentinel pauser role granted to:", SEPOLIA_GUARDIAN);
        
        vm.stopBroadcast();
        
        // ==========================================
        // Summary
        // ==========================================
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("USDA V6 Implementation:", address(usdaImpl));
        console.log("USDA V6 Proxy:", usdaV6);
        console.log("BurnMintTokenPool:", address(tokenPool));
        console.log("");
        console.log("=== Configuration ===");
        console.log("Remote Chain (Arbitrum):", ARBITRUM_CHAIN_SELECTOR);
        console.log("Remote Pool:", ARBITRUM_POOL);
        console.log("Remote Token:", ARBITRUM_TOKEN);
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Update .env with new addresses");
        console.log("2. Test CCIP transfer to Arbitrum");
        console.log("3. Verify on Etherscan");
    }
    
    // Helper function to convert address to bytes array
    function _toBytesArray(address addr) internal pure returns (bytes[] memory) {
        bytes[] memory arr = new bytes[](1);
        arr[0] = abi.encode(addr);
        return arr;
    }
}

// Required for compilation - RateLimiter struct
type RateLimiter is uint256;

library RateLimiter {
    struct Config {
        bool isEnabled;
        uint128 minTokens;
        uint128 maxTokens;
    }
}
