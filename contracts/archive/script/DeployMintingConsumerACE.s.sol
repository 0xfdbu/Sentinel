// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MintingConsumerWithACE} from "../src/MintingConsumerWithACE.sol";

/**
 * @title DeployMintingConsumerACE
 * @notice Deploys MintingConsumerWithACE for CRE workflow
 * @dev Uses zero address for pause controller if not deployed yet (can be set later)
 */
contract DeployMintingConsumerACE is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        // Optional: Set if pause controller is already deployed
        address pauseController = vm.envOr("PAUSE_CONTROLLER", address(0));
        
        console.log("===========================================");
        console.log("DEPLOYING MINTING CONSUMER WITH ACE");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        if (pauseController == address(0)) {
            console.log("Pause Controller: Not set (can add later)");
        } else {
            console.log("Pause Controller:", pauseController);
        }
        
        vm.startBroadcast(deployerKey);
        
        // Deploy MintingConsumerWithACE
        MintingConsumerWithACE consumer = new MintingConsumerWithACE(
            USDA_V4_SEPOLIA,    // stablecoin
            deployer,            // bankOperator
            pauseController      // pauseController (can be address(0) initially)
        );
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("MintingConsumerWithACE:", address(consumer));
        console.log("\nNext steps:");
        console.log("1. Fund contract with USDA for minting");
        console.log("2. Set CRE Forwarder address (via setForwarder)");
        if (pauseController == address(0)) {
            console.log("3. Deploy PauseController and set via setPauseController");
        }
        console.log("4. Configure ACE policies in CRE");
        console.log("5. Update workflow config.json with consumer address");
    }
}
