// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SetupNewCCIPConsumer
 * @notice Sets up the new CCIP Consumer:
 *   1. Sets CRE Forwarder
 *   2. Transfers USDA to the consumer for bridging
 */
contract SetupNewCCIPConsumer is Script {
    // Configuration
    address payable constant CCIP_CONSUMER = payable(0x6ed731Ed3Eb6200978d32965039721f1bAd03b20);
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant CRE_FORWARDER = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("SETTING UP NEW CCIP CONSUMER");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("CCIP Consumer:", CCIP_CONSUMER);
        console.log("CRE Forwarder:", CRE_FORWARDER);
        
        CCIPTransferConsumerWithACE consumer = CCIPTransferConsumerWithACE(CCIP_CONSUMER);
        IERC20 usda = IERC20(USDA_V4);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Set Forwarder
        console.log("\n--- Step 1: Setting Forwarder ---");
        consumer.setForwarder(CRE_FORWARDER);
        console.log("Forwarder set to:", CRE_FORWARDER);
        
        // Step 2: Transfer USDA to consumer for bridging
        console.log("\n--- Step 2: Funding with USDA ---");
        uint256 fundAmount = 1 * 1e6; // 1 USDA (6 decimals)
        usda.transfer(CCIP_CONSUMER, fundAmount);
        console.log("Funded 10 USDA to CCIP Consumer");
        
        vm.stopBroadcast();
        
        // Verify
        console.log("\n--- Verification ---");
        console.log("Forwarder:", consumer.forwarder());
        console.log("USDA Balance:", usda.balanceOf(CCIP_CONSUMER));
        console.log("ETH Balance:", address(CCIP_CONSUMER).balance);
        
        console.log("\n===========================================");
        console.log("SETUP COMPLETE");
        console.log("===========================================");
    }
}
