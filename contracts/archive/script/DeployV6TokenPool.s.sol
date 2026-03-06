// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";

// TokenAdminRegistry interface
interface ITokenAdminRegistry {
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
    function getPool(address token) external view returns (address);
}

// USDA V6 interface
interface IUSDAv6 {
    function setTokenPool(address _tokenPool) external;
}

/**
 * @title DeployV6TokenPool
 * @notice Deploys TokenPool for USDA V6 and configures CCIP
 */
contract DeployV6TokenPool is Script {
    // Sepolia
    address constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant SEPOLIA_RMN_PROXY = 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991;
    address constant SEPOLIA_TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant USDA_V6 = 0xc1B1f04212aF9da91cEC3CE1ee9936006b990A61;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== USDA V6 TokenPool Deployment ===");
        console.log("Deployer:", deployer);
        console.log("USDA V6:", USDA_V6);
        console.log("");
        
        require(block.chainid == 11155111, "Must run on Sepolia");
        
        vm.startBroadcast(deployerKey);
        
        // ========================================
        // Step 1: Deploy BurnMintTokenPool
        // ========================================
        console.log("Step 1: Deploying BurnMintTokenPool...");
        
        address[] memory allowlist = new address[](0); // Permissionless
        
        BurnMintTokenPool tokenPool = new BurnMintTokenPool(
            IBurnMintERC20(USDA_V6),
            18, // decimals (USDA V6 has 18 decimals)
            allowlist,
            SEPOLIA_RMN_PROXY,
            SEPOLIA_ROUTER
        );
        
        address poolAddress = address(tokenPool);
        console.log("TokenPool deployed:", poolAddress);
        
        // ========================================
        // Step 2: Register with TokenAdminRegistry
        // ========================================
        console.log("");
        console.log("Step 2: Registering with TokenAdminRegistry...");
        
        ITokenAdminRegistry registry = ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY);
        
        // Accept admin role
        try registry.acceptAdminRole(USDA_V6) {
            console.log("Accepted admin role");
        } catch {
            console.log("Admin role already accepted");
        }
        
        // Set pool
        registry.setPool(USDA_V6, poolAddress);
        console.log("Pool registered in TokenAdminRegistry");
        
        // ========================================
        // Step 3: Grant Roles on USDA V6
        // ========================================
        console.log("");
        console.log("Step 3: Granting roles to TokenPool...");
        
        IUSDAv6 usda = IUSDAv6(USDA_V6);
        usda.setTokenPool(poolAddress);
        console.log("TokenPool set in USDA V6");
        
        vm.stopBroadcast();
        
        // ========================================
        // Summary
        // ========================================
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("USDA_V6_TOKEN_POOL=", poolAddress);
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Configure cross-chain routes");
        console.log("2. Test CCIP transfer");
    }
}
