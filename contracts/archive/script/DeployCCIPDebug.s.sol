// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerDebug} from "../src/CCIPTransferConsumerDebug.sol";

/**
 * @title DeployCCIPDebug
 * @notice Deploys debug version of CCIPConsumer to identify failure point
 */
contract DeployCCIPDebug is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant CRE_FORWARDER_SEPOLIA = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    
    function run() external {
        uint256 deployerKey = vm.envUint("CRE_ETH_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING CCIP DEBUG CONSUMER");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("CCIP Router:", CCIP_ROUTER_SEPOLIA);
        
        vm.startBroadcast(deployerKey);
        
        // Deploy debug consumer
        CCIPTransferConsumerDebug consumer = new CCIPTransferConsumerDebug(
            USDA_V4_SEPOLIA,
            CCIP_ROUTER_SEPOLIA,
            deployer
        );
        
        // Set forwarder
        consumer.setForwarder(CRE_FORWARDER_SEPOLIA);
        
        // Add supported chains
        consumer.addSupportedChain(3478487238524512106); // Arbitrum Sepolia
        consumer.addSupportedChain(14767482510784806043); // Fuji
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("CCIPTransferConsumerDebug:", address(consumer));
        console.log("\nNext steps:");
        console.log("1. Grant MINTER_ROLE and BURNER_ROLE to this consumer on USDA");
        console.log("2. Fund with ETH for CCIP fees");
        console.log("3. Fund with USDA for transfers");
        console.log("4. Update config.json with new ccipConsumerAddress");
        console.log("5. Run workflow and check debug events");
    }
}
