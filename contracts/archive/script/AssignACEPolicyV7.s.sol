// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IPolicyEngine {
    function setPolicyForToken(address token, address policy) external;
    function policyForToken(address token) external view returns (address);
    function policies(uint256 index) external view returns (address);
    function owner() external view returns (address);
}

contract AssignACEPolicyV7 is Script {
    address constant POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant USDA_V7 = 0x500D640f4fE39dAF609C6E14C83b89A68373EaFe;
    
    function run() external {
        vm.startBroadcast();
        
        IPolicyEngine engine = IPolicyEngine(POLICY_ENGINE);
        
        console.log("PolicyEngine:", POLICY_ENGINE);
        console.log("USDA V7:", USDA_V7);
        console.log("Owner:", engine.owner());
        console.log("");
        
        // Get policy at index 0 (BlacklistPolicy)
        address blacklistPolicy = engine.policies(0);
        console.log("Blacklist Policy:", blacklistPolicy);
        
        // Check current policy for V7
        address currentPolicy = engine.policyForToken(USDA_V7);
        console.log("Current policy for V7:", currentPolicy);
        
        // Set policy if not set
        if (currentPolicy == address(0)) {
            console.log("\nAssigning blacklist policy to V7...");
            engine.setPolicyForToken(USDA_V7, blacklistPolicy);
            
            address newPolicy = engine.policyForToken(USDA_V7);
            console.log("New policy for V7:", newPolicy);
        } else {
            console.log("\nPolicy already assigned!");
        }
        
        vm.stopBroadcast();
    }
}
