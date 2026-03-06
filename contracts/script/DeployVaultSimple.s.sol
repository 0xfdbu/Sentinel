// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/por/SentinelVaultETHSimple.sol";

/**
 * @title DeployVaultSimple
 * @notice Deploys SentinelVaultETHSimple for CRE workflow-triggered minting
 */
contract DeployVaultSimple is Script {
    // Sepolia addresses
    address constant CHAINLINK_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("==============================================");
        console.log("Vault Simple Deployment (CRE Integration)");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Chainlink ETH/USD:", CHAINLINK_ETH_USD);
        
        vm.startBroadcast(deployerPK);
        
        // Deploy Vault Simple
        console.log("\n1. Deploying SentinelVaultETHSimple...");
        SentinelVaultETHSimple vault = new SentinelVaultETHSimple(
            CHAINLINK_ETH_USD,
            deployer
        );
        console.log("   Vault Simple:", address(vault));
        
        vm.stopBroadcast();
        
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("Vault Simple:      ", address(vault));
        console.log("Chainlink Feed:    ", CHAINLINK_ETH_USD);
        console.log("Owner:             ", deployer);
        console.log("==============================================");
        console.log("\nNext steps:");
        console.log("1. Update workflow config.json with new vault address");
        console.log("2. Deploy workflow: cre workflow deploy eth-por-unified --target production");
        console.log("3. Test: cast send <vault_address> \"depositETH()\" --value 0.01ether");
        console.log("\nConfig JSON to add:");
        console.log('  "vaultAddress": "', address(vault), '",' );
    }
}
