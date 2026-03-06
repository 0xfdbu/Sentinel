// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {USDAStablecoinV4} from "../src/tokens/USDAStablecoinV4.sol";

/**
 * @title ConfigureTokenPool
 * @notice Configures the TokenPool with chain updates and grants roles
 */
contract ConfigureTokenPool is Script {
    // Configuration
    address constant TOKEN_POOL = 0x36F067776aD58Bd8bf47D9bAd34A3e3e40C6f965;
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("CONFIGURING TOKEN POOL");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("TokenPool:", TOKEN_POOL);
        console.log("USDA V4:", USDA_V4);
        
        BurnMintTokenPool tokenPool = BurnMintTokenPool(TOKEN_POOL);
        USDAStablecoinV4 usda = USDAStablecoinV4(USDA_V4);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Grant MINTER_ROLE to TokenPool
        console.log("\n--- Step 1: Granting MINTER_ROLE ---");
        usda.grantMinterRole(TOKEN_POOL);
        console.log("Granted MINTER_ROLE to TokenPool");
        
        // Step 2: Grant BURNER_ROLE to TokenPool
        console.log("\n--- Step 2: Granting BURNER_ROLE ---");
        usda.grantBurnerRole(TOKEN_POOL);
        console.log("Granted BURNER_ROLE to TokenPool");
        
        vm.stopBroadcast();
        
        // Verification
        console.log("\n===========================================");
        console.log("VERIFICATION");
        console.log("===========================================");
        console.log("TokenPool isMinter:", usda.isMinter(TOKEN_POOL));
        console.log("TokenPool isBurner:", usda.isBurner(TOKEN_POOL));
        
        console.log("\n===========================================");
        console.log("CONFIGURATION COMPLETE");
        console.log("===========================================");
        console.log("\nNOTE: Chain updates must be configured separately using");
        console.log("      cast call or a separate script with proper encoding");
    }
}
