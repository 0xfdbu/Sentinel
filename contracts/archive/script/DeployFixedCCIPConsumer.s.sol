// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACEFixed} from "../src/CCIPTransferConsumerWithACEFixed.sol";

/**
 * @title DeployFixedCCIPConsumer
 * @notice Deploys CCIPTransferConsumerWithACEFixed - has processCCIPViaBankOperator
 * @dev This version allows direct calls from bank operator, bypassing Forwarder
 */
contract DeployFixedCCIPConsumer is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    
    function run() external {
        uint256 deployerKey = vm.envUint("CRE_ETH_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING CCIP CONSUMER WITH ACE - FIXED");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("CCIP Router:", CCIP_ROUTER_SEPOLIA);
        
        vm.startBroadcast(deployerKey);
        
        // Deploy CCIPTransferConsumerWithACEFixed
        CCIPTransferConsumerWithACEFixed consumer = new CCIPTransferConsumerWithACEFixed(
            USDA_V4_SEPOLIA,      // stablecoin
            CCIP_ROUTER_SEPOLIA,  // ccipRouter
            deployer,              // bankOperator
            address(0)             // pauseController (none for now)
        );
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("CCIPTransferConsumerWithACEFixed:", address(consumer));
        console.log("\nNext steps:");
        console.log("1. Add supported chains (addSupportedChain)");
        console.log("2. Set CRE Forwarder (setForwarder)");
        console.log("3. Fund with ETH for CCIP fees");
        console.log("4. Update config.json with ccipConsumerAddress");
    }
}
