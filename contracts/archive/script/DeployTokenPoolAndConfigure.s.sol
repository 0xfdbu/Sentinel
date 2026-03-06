// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployTokenPoolAndConfigure
 * @notice Deploys BurnMintTokenPool for USDA and configures CCIP
 */
contract DeployTokenPoolAndConfigure is Script {
    // Sepolia Configuration
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant CCIP_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant RMN_PROXY = 0x8b97106672C882137Cf00B15C19699673f9e70b9;
    
    // Arbitrum Sepolia Chain Selector
    uint64 constant ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING BURNMINT TOKEN POOL FOR USDA");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4);
        console.log("CCIP Router:", CCIP_ROUTER);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Deploy BurnMintTokenPool
        console.log("\n--- Step 1: Deploying BurnMintTokenPool ---");
        
        // Empty allowlist (permissionless)
        address[] memory allowlist = new address[](0);
        
        BurnMintTokenPool tokenPool = new BurnMintTokenPool(
            IBurnMintERC20(USDA_V4),
            6, // decimals (USDA has 6 decimals)
            allowlist,
            RMN_PROXY,
            CCIP_ROUTER
        );
        
        console.log("TokenPool deployed:", address(tokenPool));
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("TokenPool Address:", address(tokenPool));
        console.log("\nNext steps:");
        console.log("1. Configure chain updates (Arbitrum Sepolia)");
        console.log("2. Grant MINTER_ROLE to TokenPool in USDA");
        console.log("3. Grant BURNER_ROLE to TokenPool in USDA");
        console.log("4. Test CCIP transfer");
    }
}
