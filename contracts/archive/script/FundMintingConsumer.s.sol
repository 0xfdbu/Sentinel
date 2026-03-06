// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FundMintingConsumer
 * @notice Funds MintingConsumerWithACE with USDA for minting operations
 */
contract FundMintingConsumer is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        // Set this to your deployed consumer address
        address consumer = vm.envOr("CONSUMER_ADDRESS", address(0));
        
        if (consumer == address(0)) {
            console.log("ERROR: Set CONSUMER_ADDRESS environment variable");
            console.log("Example: CONSUMER_ADDRESS=0x... forge script ...");
            return;
        }
        
        uint256 amount = 100 * 1e6; // 100 USDA (6 decimals) - adjust based on balance
        
        console.log("===========================================");
        console.log("FUNDING MINTING CONSUMER");
        console.log("===========================================");
        console.log("From:", deployer);
        console.log("To (Consumer):", consumer);
        console.log("Amount:", amount / 1e6, "USDA");
        
        IERC20 usda = IERC20(USDA_V4_SEPOLIA);
        
        uint256 balanceBefore = usda.balanceOf(deployer);
        console.log("Sender balance:", balanceBefore / 1e6, "USDA");
        
        if (balanceBefore < amount) {
            amount = balanceBefore; // Send all available
            console.log("Adjusted amount to:", amount / 1e6, "USDA");
        }
        
        if (amount == 0) {
            console.log("ERROR: No USDA to transfer!");
            return;
        }
        
        vm.startBroadcast(deployerKey);
        
        // Transfer USDA to consumer
        usda.transfer(consumer, amount);
        
        vm.stopBroadcast();
        
        uint256 consumerBalance = usda.balanceOf(consumer);
        console.log("Consumer balance:", consumerBalance / 1e6, "USDA");
        console.log("Consumer funded successfully!");
    }
}
