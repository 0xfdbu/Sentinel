// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FundCCIPConsumer
 * @notice Funds CCIPTransferConsumerWithACE with USDA and LINK
 */
contract FundCCIPConsumer is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        // Set this to your deployed CCIP consumer address
        address consumer = vm.envOr("CCIP_CONSUMER_ADDRESS", address(0));
        
        if (consumer == address(0)) {
            console.log("ERROR: Set CCIP_CONSUMER_ADDRESS environment variable");
            console.log("Example: CCIP_CONSUMER_ADDRESS=0x... forge script ...");
            return;
        }
        
        // Amounts to transfer
        uint256 usdaAmount = 50 * 1e6; // 50 USDA (6 decimals)
        uint256 linkAmount = 5 * 1e18;  // 5 LINK (18 decimals)
        
        console.log("===========================================");
        console.log("FUNDING CCIP CONSUMER");
        console.log("===========================================");
        console.log("From:", deployer);
        console.log("To (CCIP Consumer):", consumer);
        console.log("USDA Amount:", usdaAmount / 1e6, "USDA");
        console.log("LINK Amount:", linkAmount / 1e18, "LINK");
        
        IERC20 usda = IERC20(USDA_V4_SEPOLIA);
        IERC20 link = IERC20(LINK_SEPOLIA);
        
        uint256 usdaBalanceBefore = usda.balanceOf(deployer);
        uint256 linkBalanceBefore = link.balanceOf(deployer);
        
        console.log("\nSender USDA balance:", usdaBalanceBefore / 1e6, "USDA");
        console.log("Sender LINK balance:", linkBalanceBefore / 1e18, "LINK");
        
        // Adjust amounts if insufficient balance
        if (usdaBalanceBefore < usdaAmount) {
            usdaAmount = usdaBalanceBefore;
            console.log("Adjusted USDA amount to:", usdaAmount / 1e6, "USDA");
        }
        if (linkBalanceBefore < linkAmount) {
            linkAmount = linkBalanceBefore;
            console.log("Adjusted LINK amount to:", linkAmount / 1e18, "LINK");
        }
        
        if (usdaAmount == 0 && linkAmount == 0) {
            console.log("ERROR: No tokens to transfer!");
            return;
        }
        
        vm.startBroadcast(deployerKey);
        
        // Transfer USDA
        if (usdaAmount > 0) {
            usda.transfer(consumer, usdaAmount);
        }
        
        // Transfer LINK
        if (linkAmount > 0) {
            link.transfer(consumer, linkAmount);
        }
        
        vm.stopBroadcast();
        
        uint256 consumerUsdaBalance = usda.balanceOf(consumer);
        uint256 consumerLinkBalance = link.balanceOf(consumer);
        
        console.log("\nConsumer USDA balance:", consumerUsdaBalance / 1e6, "USDA");
        console.log("Consumer LINK balance:", consumerLinkBalance / 1e18, "LINK");
        console.log("\nCCIP Consumer funded successfully!");
    }
}
