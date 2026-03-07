// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/por/MintingConsumerV8.sol";

/**
 * @title DeployMintingConsumerV8
 * @notice Deploys minting consumer for USDA V8
 */
contract DeployMintingConsumerV8 is Script {
    // Sepolia USDA V8
    address constant USDA_V8 = 0xFA93de331FCd870D83C21A0275d8b3E7aA883F45;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("==============================================");
        console.log("MintingConsumer V8 Deployment");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("USDA V8:", USDA_V8);
        
        vm.startBroadcast(deployerPK);
        
        // Deploy MintingConsumerV8
        console.log("\n1. Deploying MintingConsumerV8...");
        MintingConsumerV8 consumer = new MintingConsumerV8(
            USDA_V8,
            deployer
        );
        console.log("   Consumer:", address(consumer));
        
        // Authorize deployer as minter
        console.log("\n2. Authorizing deployer as minter...");
        consumer.authorizeMinter(deployer);
        console.log("   Deployer authorized");
        
        vm.stopBroadcast();
        
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("Consumer:          ", address(consumer));
        console.log("USDA V8:           ", USDA_V8);
        console.log("Owner:             ", deployer);
        console.log("==============================================");
        console.log("\nNext steps:");
        console.log("1. Grant MINTER_ROLE to consumer on USDA V8");
        console.log("2. Update workflow config");
        console.log("3. Test minting flow");
    }
}
