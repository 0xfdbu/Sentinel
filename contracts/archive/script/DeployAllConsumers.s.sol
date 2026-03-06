// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MintingConsumerWithACE} from "../src/MintingConsumerWithACE.sol";
import {CCIPTransferConsumerWithACE} from "../src/CCIPTransferConsumerWithACE.sol";
import {SentinelPauseController} from "../src/core/SentinelPauseController.sol";

/**
 * @title DeployAllConsumers
 * @notice Deploys complete PoR + ACE + CCIP setup with pause controller
 * @dev Deploys: PauseController, MintingConsumer, CCIPConsumer
 */
contract DeployAllConsumers is Script {
    // Sepolia Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant CCIP_ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("DEPLOYING COMPLETE SENTINEL SETUP");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("CCIP Router:", CCIP_ROUTER_SEPOLIA);
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Deploy Pause Controller
        console.log("\n--- Step 1: Deploying Pause Controller ---");
        SentinelPauseController pauseController = new SentinelPauseController();
        console.log("PauseController deployed:", address(pauseController));
        
        // Step 2: Deploy Minting Consumer
        console.log("\n--- Step 2: Deploying Minting Consumer ---");
        MintingConsumerWithACE mintingConsumer = new MintingConsumerWithACE(
            USDA_V4_SEPOLIA,           // stablecoin
            deployer,                   // bankOperator
            address(pauseController)    // pauseController
        );
        console.log("MintingConsumer deployed:", address(mintingConsumer));
        
        // Step 3: Deploy CCIP Transfer Consumer
        console.log("\n--- Step 3: Deploying CCIP Transfer Consumer ---");
        CCIPTransferConsumerWithACE ccipConsumer = new CCIPTransferConsumerWithACE(
            USDA_V4_SEPOLIA,           // stablecoin
            CCIP_ROUTER_SEPOLIA,        // ccipRouter
            deployer,                   // bankOperator
            address(pauseController)    // pauseController
        );
        console.log("CCIPConsumer deployed:", address(ccipConsumer));
        
        // Step 4: Register consumers with pause controller
        console.log("\n--- Step 4: Registering with Pause Controller ---");
        // Note: Consumers self-register their pause status with the controller
        // The controller doesn't need to know about them beforehand
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("\nContract Addresses:");
        console.log("  PauseController:", address(pauseController));
        console.log("  MintingConsumer:", address(mintingConsumer));
        console.log("  CCIPConsumer:", address(ccipConsumer));
        
        console.log("\nRoles Configuration:");
        console.log("  Admin/Guardian:", deployer);
        console.log("  Bank Operator:", deployer);
        
        console.log("\nNext Steps:");
        console.log("1. Fund MintingConsumer with USDA for minting");
        console.log("2. Fund CCIPConsumer with USDA and ETH for CCIP fees");
        console.log("3. Set CRE Forwarder in both consumers (setForwarder)");
        console.log("4. Add supported chains to CCIPConsumer (addSupportedChain)");
        console.log("5. Add sentinel nodes to PauseController (addSentinelNode)");
        console.log("6. Grant MINTER_ROLE to MintingConsumer in USDA token");
        console.log("7. Update workflow config.json with new addresses");
        
        console.log("\nConfig JSON:");
        console.log('  {');
        console.log('    "sepolia": {');
        console.log('      "stablecoinAddress": "', USDA_V4_SEPOLIA, '",');
        console.log('      "mintingConsumerAddress": "', address(mintingConsumer), '",');
        console.log('      "ccipConsumerAddress": "', address(ccipConsumer), '",');
        console.log('      "pauseControllerAddress": "', address(pauseController), '",');
        console.log('      "chainSelector": "16015286601757825753"');
        console.log('    },');
        console.log('    "fuji": {');
        console.log('      "stablecoinAddress": "0x497C61Ed4e738410a25eD9b3a2F071D1606eaa71",');
        console.log('      "chainSelector": "14767482510784806043"');
        console.log('    },');
        console.log('    "porApiUrl": "https://api.firstplaidypusbank.plaid.com/fdx/v6/accounts/deposit_01_checking",');
        console.log('    "decimals": 6');
        console.log('  }');
    }
}
