// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IMintingConsumer {
    function setForwarder(address _forwarder) external;
    function forwarder() external view returns (address);
    function bankOperator() external view returns (address);
}

contract SetForwarderV7 is Script {
    address constant MINTING_CONSUMER = 0xFe0747c381A2227a954FeE7f99F41E382c6039a6;
    address constant CRE_FORWARDER = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    
    function run() external {
        vm.startBroadcast();
        
        console.log("Setting forwarder on MintingConsumer...");
        IMintingConsumer consumer = IMintingConsumer(MINTING_CONSUMER);
        
        address currentForwarder = consumer.forwarder();
        console.log("Current forwarder:", currentForwarder);
        
        consumer.setForwarder(CRE_FORWARDER);
        
        address newForwarder = consumer.forwarder();
        console.log("New forwarder:", newForwarder);
        
        vm.stopBroadcast();
    }
}
