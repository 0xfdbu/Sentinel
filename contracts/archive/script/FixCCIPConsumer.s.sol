// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FixCCIPConsumer
 * @notice Fixes CCIP Consumer issues:
 *   1. Funds with ETH for CCIP fees
 *   2. Adds Arbitrum Sepolia as supported chain
 */
contract FixCCIPConsumer is Script {
    // Sepolia Configuration
    address payable constant CCIP_CONSUMER = payable(0xFa031de805af3a9A72D37f57a01634ADF4a61cD5);
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    // Chain selectors
    uint64 constant ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("FIXING CCIP CONSUMER");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("CCIP Consumer:", CCIP_CONSUMER);
        
        // Check current state
        uint256 ethBalance = address(CCIP_CONSUMER).balance;
        console.log("\nCurrent ETH Balance:", ethBalance);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Fund with ETH for CCIP fees
        console.log("\n--- Step 1: Funding with ETH ---");
        (bool success, ) = CCIP_CONSUMER.call{value: 0.05 ether}("");
        require(success, "ETH transfer failed");
        console.log("Funded 0.05 ETH to CCIP Consumer");
        
        // Step 2: Add Arbitrum Sepolia as supported chain
        console.log("\n--- Step 2: Adding Arbitrum Sepolia ---");
        CCIPTransferConsumerWithACE consumer = CCIPTransferConsumerWithACE(CCIP_CONSUMER);
        consumer.addSupportedChain(ARBITRUM_SEPOLIA_SELECTOR);
        console.log("Added Arbitrum Sepolia chain selector:", uint256(ARBITRUM_SEPOLIA_SELECTOR));
        
        vm.stopBroadcast();
        
        // Verify
        console.log("\n--- Verification ---");
        console.log("New ETH Balance:", address(CCIP_CONSUMER).balance);
        console.log("Arbitrum Sepolia Supported:", consumer.supportedChains(ARBITRUM_SEPOLIA_SELECTOR));
        
        console.log("\n===========================================");
        console.log("FIX COMPLETE");
        console.log("===========================================");
    }
    
    // Allow receiving ETH
    receive() external payable {}
}
