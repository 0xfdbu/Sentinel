// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DebugCCIPConsumer
 * @notice Debug script to check CCIP Consumer state
 */
contract DebugCCIPConsumer is Script {
    // Sepolia Configuration
    address payable constant CCIP_CONSUMER = payable(0xFa031de805af3a9A72D37f57a01634ADF4a61cD5);
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    // Chain selectors
    uint64 constant ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106;
    uint64 constant FUJI_SELECTOR = 14767482510784806043;
    
    function run() external view {
        CCIPTransferConsumerWithACE consumer = CCIPTransferConsumerWithACE(CCIP_CONSUMER);
        IERC20 usda = IERC20(USDA_V4);
        
        console.log("===========================================");
        console.log("CCIP CONSUMER DEBUG");
        console.log("===========================================");
        console.log("Consumer Address:", CCIP_CONSUMER);
        console.log("USDA Token:", USDA_V4);
        
        // Check balances
        uint256 ethBalance = address(CCIP_CONSUMER).balance;
        uint256 usdaBalance = usda.balanceOf(CCIP_CONSUMER);
        
        console.log("\n--- Balances ---");
        console.log("ETH Balance:", ethBalance);
        console.log("USDA Balance:", usdaBalance);
        
        // Check supported chains
        console.log("\n--- Supported Chains ---");
        console.log("Arbitrum Sepolia (3478487238524512106):", consumer.supportedChains(ARBITRUM_SEPOLIA_SELECTOR));
        console.log("Fuji (14767482510784806043):", consumer.supportedChains(FUJI_SELECTOR));
        
        // Check other state
        console.log("\n--- State ---");
        console.log("Paused:", consumer.locallyPaused());
        console.log("Forwarder:", consumer.forwarder());
        console.log("Bank Operator:", consumer.bankOperator());
        console.log("CCIP Router:", address(consumer.ccipRouter()));
        
        console.log("\n===========================================");
        console.log("DIAGNOSIS");
        console.log("===========================================");
        
        bool hasIssues = false;
        
        if (ethBalance == 0) {
            console.log("[X] ISSUE: No ETH for CCIP fees");
            hasIssues = true;
        } else {
            console.log("[OK] Has ETH for fees");
        }
        
        if (usdaBalance == 0) {
            console.log("[X] ISSUE: No USDA in consumer");
            hasIssues = true;
        } else {
            console.log("[OK] Has USDA balance");
        }
        
        if (!consumer.supportedChains(ARBITRUM_SEPOLIA_SELECTOR)) {
            console.log("[X] ISSUE: Arbitrum Sepolia not supported");
            hasIssues = true;
        } else {
            console.log("[OK] Arbitrum Sepolia supported");
        }
        
        if (consumer.locallyPaused()) {
            console.log("[X] ISSUE: Contract is paused");
            hasIssues = true;
        } else {
            console.log("[OK] Not paused");
        }
        
        if (consumer.forwarder() == address(0)) {
            console.log("[X] ISSUE: Forwarder not set");
            hasIssues = true;
        } else {
            console.log("[OK] Forwarder set");
        }
        
        if (!hasIssues) {
            console.log("\n[OK] All checks passed - should work!");
        } else {
            console.log("\n[!] Issues found that need fixing");
        }
    }
}
