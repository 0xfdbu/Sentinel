// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";

/**
 * @title DeployCCIPConsumerDirect
 * @notice Deploys CCIPTransferConsumerWithACE with proper forwarder setup
 * @dev This version is designed to work with CRE Forwarder for onReport
 */
contract DeployCCIPConsumerDirect is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    
    // CRE Forwarder on Sepolia (from CRE hackathon config)
    address constant CRE_FORWARDER_SEPOLIA = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    
    function run() external {
        uint256 deployerKey = vm.envUint("CRE_ETH_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING CCIP CONSUMER WITH ACE");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("CCIP Router:", CCIP_ROUTER_SEPOLIA);
        console.log("CRE Forwarder:", CRE_FORWARDER_SEPOLIA);
        
        vm.startBroadcast(deployerKey);
        
        // Deploy CCIPTransferConsumerWithACE
        CCIPTransferConsumerWithACE consumer = new CCIPTransferConsumerWithACE(
            USDA_V4_SEPOLIA,      // stablecoin
            CCIP_ROUTER_SEPOLIA,  // ccipRouter
            deployer,              // bankOperator
            address(0)             // pauseController (none for now)
        );
        
        // Set the forwarder immediately
        consumer.setForwarder(CRE_FORWARDER_SEPOLIA);
        
        // Add supported chains
        // Arbitrum Sepolia
        consumer.addSupportedChain(3478487238524512106);
        // Fuji
        consumer.addSupportedChain(14767482510784806043);
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("CCIPTransferConsumerWithACE:", address(consumer));
        console.log("\nConfiguration:");
        console.log("- Forwarder set to:", CRE_FORWARDER_SEPOLIA);
        console.log("- Arbitrum Sepolia supported: yes");
        console.log("- Fuji supported: yes");
        console.log("\nNext steps:");
        console.log("1. Grant MINTER_ROLE and BURNER_ROLE to this consumer");
        console.log("2. Fund with ETH for CCIP fees");
        console.log("3. Fund with USDA for transfers");
        console.log("4. Update config.json with ccipConsumerAddress");
    }
}
