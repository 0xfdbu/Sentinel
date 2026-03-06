// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MintingConsumerWithACE} from "../src/MintingConsumerWithACE.sol";

/**
 * @title SetForwarder
 * @notice Sets the CRE Forwarder address on MintingConsumerWithACE
 */
contract SetForwarder is Script {
    // Sepolia Configuration
    address constant MINTING_CONSUMER = 0xF81de8171cf69c643244885945A959244D36fb23;
    address constant CRE_FORWARDER = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("SETTING CRE FORWARDER ON CONSUMER");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Consumer:", MINTING_CONSUMER);
        console.log("Forwarder:", CRE_FORWARDER);
        
        vm.startBroadcast(deployerKey);
        
        // Set forwarder on MintingConsumerWithACE
        MintingConsumerWithACE consumer = MintingConsumerWithACE(MINTING_CONSUMER);
        consumer.setForwarder(CRE_FORWARDER);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Forwarder set successfully!");
        console.log("The consumer will now accept reports from the CRE Forwarder.");
    }
}
