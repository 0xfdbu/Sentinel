// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface ICCIPConsumer {
    function setForwarder(address _forwarder) external;
}

contract SetCCIPForwarder is Script {
    address constant CCIP_CONSUMER = 0xB624Ed65E4366C8C78165a089345549973ebfB9d;
    address constant CRE_FORWARDER = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Setting forwarder on CCIP Consumer...");
        
        vm.startBroadcast(deployerKey);
        ICCIPConsumer consumer = ICCIPConsumer(CCIP_CONSUMER);
        consumer.setForwarder(CRE_FORWARDER);
        vm.stopBroadcast();
        
        console.log("CCIP Consumer forwarder set!");
    }
}
