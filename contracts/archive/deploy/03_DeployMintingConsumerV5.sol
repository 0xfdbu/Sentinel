// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MintingConsumerWithACEV5} from "../src/MintingConsumerWithACEV5.sol";

/**
 * @title DeployMintingConsumerV5
 * @notice Deploys MintingConsumerWithACEV5 for USDA V5
 */
contract DeployMintingConsumerV5 is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        // Configuration
        address usdaV5 = vm.envOr("USDA_V5_PROXY", address(0));
        address bankOperator = vm.envOr("BANK_OPERATOR", deployer);
        address pauseController = vm.envOr("PAUSE_CONTROLLER", address(0));
        
        if (usdaV5 == address(0)) {
            console.log("Error: Set USDA_V5_PROXY environment variable");
            console.log("Example: export USDA_V5_PROXY=0x4E2eE356AfFF55EDA02DC47b8513a57653cF54fc");
            return;
        }
        
        console.log("========================================");
        console.log("Deploying MintingConsumerWithACEV5");
        console.log("========================================");
        console.log("USDA V5:        ", usdaV5);
        console.log("Bank Operator:  ", bankOperator);
        console.log("Pause Controller:", pauseController);
        console.log("");
        
        vm.startBroadcast(deployerPK);
        
        // Deploy Minting Consumer
        MintingConsumerWithACEV5 consumer = new MintingConsumerWithACEV5(
            usdaV5,
            bankOperator,
            pauseController
        );
        
        vm.stopBroadcast();
        
        console.log("========================================");
        console.log("DEPLOYED!");
        console.log("========================================");
        console.log("MintingConsumer V5: ", address(consumer));
        console.log("");
        console.log("Environment:");
        console.log("  export MINTING_CONSUMER_V5=", address(consumer));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Grant MINTER_ROLE to consumer on USDA V5");
        console.log("   cast send $USDA_V5_PROXY \"grantMinterRole(address)\" $MINTING_CONSUMER_V5 --private-key $PRIVATE_KEY");
        console.log("");
        console.log("2. Set CRE Forwarder in consumer");
        console.log("   cast send $MINTING_CONSUMER_V5 \"setForwarder(address)\" $CRE_FORWARDER --private-key $PRIVATE_KEY");
        console.log("");
        console.log("3. Fund consumer with ETH for gas (if needed)");
    }
}
