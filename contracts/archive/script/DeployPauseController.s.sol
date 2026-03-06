// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SentinelPauseController} from "../src/core/SentinelPauseController.sol";

/**
 * @title DeployPauseController
 * @notice Deploys SentinelPauseController for centralized pause management
 * @dev This contract allows sentinel nodes to pause contracts via CRE workflows
 */
contract DeployPauseController is Script {
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING SENTINEL PAUSE CONTROLLER");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerKey);
        
        // Deploy SentinelPauseController
        SentinelPauseController controller = new SentinelPauseController();
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("SentinelPauseController:", address(controller));
        console.log("\nRoles:");
        console.log("  - DEFAULT_ADMIN_ROLE:", deployer);
        console.log("  - GUARDIAN_ROLE:", deployer, "(can pause/unpause)");
        console.log("\nNext steps:");
        console.log("1. Add sentinel nodes: controller.addSentinelNode(nodeAddress)");
        console.log("2. Add guardians: controller.addGuardian(guardianAddress)");
        console.log("3. Update consumer deployments with controller address");
        console.log("4. Configure CRE workflow with sentinel pause capability");
    }
}
