// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";

/**
 * @title DeployCCIPConsumerACE
 * @notice Deploys CCIPTransferConsumerWithACE for CRE workflow
 * @dev Uses zero address for pause controller if not deployed yet (can be set later)
 */
contract DeployCCIPConsumerACE is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        // Optional: Set if pause controller is already deployed
        address pauseController = vm.envOr("PAUSE_CONTROLLER", address(0));
        
        console.log("===========================================");
        console.log("DEPLOYING CCIP TRANSFER CONSUMER WITH ACE");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("CCIP Router:", CCIP_ROUTER_SEPOLIA);
        if (pauseController == address(0)) {
            console.log("Pause Controller: Not set (can add later)");
        } else {
            console.log("Pause Controller:", pauseController);
        }
        
        vm.startBroadcast(deployerKey);
        
        // Deploy CCIPTransferConsumerWithACE
        CCIPTransferConsumerWithACE consumer = new CCIPTransferConsumerWithACE(
            USDA_V4_SEPOLIA,      // stablecoin
            CCIP_ROUTER_SEPOLIA,  // ccipRouter
            deployer,              // bankOperator
            pauseController        // pauseController (can be address(0) initially)
        );
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("CCIPTransferConsumerWithACE:", address(consumer));
        console.log("\nNext steps:");
        console.log("1. Fund contract with LINK for CCIP fees");
        console.log("2. Fund contract with USDA for transfers");
        console.log("3. Set CRE Forwarder address (via setForwarder)");
        if (pauseController == address(0)) {
            console.log("4. Deploy PauseController and set via setPauseController");
        }
        console.log("5. Add supported destination chains (addSupportedChain)");
        console.log("6. Configure ACE policies in CRE");
        console.log("7. Update workflow config.json with consumer address");
    }
}
