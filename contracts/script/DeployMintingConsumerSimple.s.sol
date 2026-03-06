// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/por/MintingConsumerSimple.sol";

/**
 * @title DeployMintingConsumerSimple
 * @notice Deploys simplified minting consumer for testing with local CRE simulation
 * @dev This version accepts direct calls for testing (no DON signature validation)
 */
contract DeployMintingConsumerSimple is Script {
    // Sepolia USDA V3
    address constant USDA_V3 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("==============================================");
        console.log("MintingConsumer Simple Deployment (Testing)");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("USDA V3:", USDA_V3);
        
        vm.startBroadcast(deployerPK);
        
        // Deploy MintingConsumerSimple
        console.log("\n1. Deploying MintingConsumerSimple...");
        MintingConsumerSimple consumer = new MintingConsumerSimple(
            USDA_V3,
            deployer
        );
        console.log("   Consumer:", address(consumer));
        
        // Authorize deployer as minter (for testing)
        console.log("\n2. Authorizing deployer as minter...");
        consumer.authorizeMinter(deployer);
        console.log("   Deployer authorized");
        
        vm.stopBroadcast();
        
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("Consumer:          ", address(consumer));
        console.log("USDA Token:        ", USDA_V3);
        console.log("Owner:             ", deployer);
        console.log("==============================================");
        console.log("\nNext steps:");
        console.log("1. Fund with USDA for minting");
        console.log("2. Update workflow config:");
        console.log('   "mintingConsumerAddress": "', address(consumer), '",' );
        console.log('   "simulationMode": true');
        console.log("3. Run workflow simulation with --broadcast");
    }
}
