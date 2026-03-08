// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/EmergencyGuardianDON.sol";

contract DeployEmergencyGuardianDON is Script {
    function run() external {
        address admin = 0x9Eb4168b419F2311DaeD5eD8E072513520178f0C;
        
        vm.startBroadcast();
        
        EmergencyGuardianDON guardian = new EmergencyGuardianDON(admin);
        
        console.log("EmergencyGuardianDON deployed at:", address(guardian));
        
        vm.stopBroadcast();
    }
}
