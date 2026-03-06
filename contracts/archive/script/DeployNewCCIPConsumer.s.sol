// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployNewCCIPConsumer
 * @notice Deploys a fresh CCIPTransferConsumerWithACE with proper setup
 */
contract DeployNewCCIPConsumer is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    
    // Chain selectors
    uint64 constant ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106;
    uint64 constant FUJI_SELECTOR = 14767482510784806043;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING NEW CCIP CONSUMER");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("CCIP Router:", CCIP_ROUTER_SEPOLIA);
        
        vm.startBroadcast(deployerKey);
        
        // Deploy new CCIPTransferConsumerWithACE
        CCIPTransferConsumerWithACE consumer = new CCIPTransferConsumerWithACE(
            USDA_V4_SEPOLIA,      // stablecoin
            CCIP_ROUTER_SEPOLIA,  // ccipRouter
            deployer,              // bankOperator
            address(0)             // pauseController (can set later)
        );
        
        console.log("\nCCIP Consumer deployed:", address(consumer));
        
        // Add supported chains
        consumer.addSupportedChain(ARBITRUM_SEPOLIA_SELECTOR);
        console.log("Added Arbitrum Sepolia chain selector:", uint256(ARBITRUM_SEPOLIA_SELECTOR));
        
        consumer.addSupportedChain(FUJI_SELECTOR);
        console.log("Added Fuji chain selector:", uint256(FUJI_SELECTOR));
        
        vm.stopBroadcast();
        
        // Fund with ETH for CCIP fees
        console.log("\n--- Funding with ETH ---");
        (bool success, ) = address(consumer).call{value: 0.1 ether}("");
        require(success, "ETH funding failed");
        console.log("Funded 0.1 ETH to CCIP Consumer");
        
        // Verify
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("CCIP Consumer Address:", address(consumer));
        console.log("ETH Balance:", address(consumer).balance);
        console.log("Arbitrum Sepolia Supported:", consumer.supportedChains(ARBITRUM_SEPOLIA_SELECTOR));
        console.log("Fuji Supported:", consumer.supportedChains(FUJI_SELECTOR));
        console.log("\nNext steps:");
        console.log("1. Set CRE Forwarder address (setForwarder)");
        console.log("2. Approve USDA for CCIP transfers");
        console.log("3. Update workflow config.json with new address");
    }
    
    receive() external payable {}
}
