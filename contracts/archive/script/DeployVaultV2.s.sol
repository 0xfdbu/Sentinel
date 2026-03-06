// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/por/SentinelVaultETHV2.sol";

/**
 * @title DeployVaultV2
 * @notice Deploys SentinelVaultETHV2 with proper CRE workflow setup
 */
contract DeployVaultV2 is Script {
    // Sepolia addresses
    address constant USDA_V10 = 0x9177D27e212f3d208a92a6261c8B30B426abf772;
    address constant CHAINLINK_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        console.log("==============================================");
        console.log("Vault V2 Deployment with CRE Integration");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("USDA V10:", USDA_V10);
        console.log("Chainlink ETH/USD:", CHAINLINK_ETH_USD);
        
        vm.startBroadcast(deployerPK);
        
        // Deploy Vault V2
        console.log("\n1. Deploying SentinelVaultETHV2...");
        SentinelVaultETHV2 vault = new SentinelVaultETHV2(
            USDA_V10,
            CHAINLINK_ETH_USD,
            deployer
        );
        console.log("   Vault V2:", address(vault));
        
        // Grant MINTER_ROLE on USDA to vault
        console.log("\n2. Granting MINTER_ROLE to vault on USDA V10...");
        // Need to call USDA to grant role
        // This assumes deployer has DEFAULT_ADMIN_ROLE on USDA
        
        vm.stopBroadcast();
        
        console.log("\n==============================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("==============================================");
        console.log("Vault V2:          ", address(vault));
        console.log("USDA Token:        ", USDA_V10);
        console.log("Owner:             ", deployer);
        console.log("==============================================");
        console.log("\nNext steps:");
        console.log("1. Grant MINTER_ROLE on USDA V10 to vault");
        console.log("2. Grant WORKFLOW_ROLE to CRE DON address");
        console.log("3. Update workflow config with new vault address");
        console.log("4. Test deposit + mint flow");
    }
}

/**
 * @title SetupVaultV2
 * @notice Grants necessary roles for Vault V2
 */
contract SetupVaultV2 is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address vaultV2 = vm.envAddress("VAULT_V2");
        address usdaV10 = vm.envAddress("USDA_V10");
        address workflowAddress = vm.envAddress("CRE_WORKFLOW_ADDRESS");
        
        console.log("Setting up Vault V2...");
        console.log("Vault V2:", vaultV2);
        console.log("USDA V10:", usdaV10);
        console.log("Workflow:", workflowAddress);
        
        vm.startBroadcast(deployerPK);
        
        // 1. Grant MINTER_ROLE to vault on USDA
        console.log("\n1. Granting MINTER_ROLE to vault...");
        // Call USDA V10 to grant MINTER_ROLE to vault
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        (bool success, ) = usdaV10.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                MINTER_ROLE,
                vaultV2
            )
        );
        require(success, "Failed to grant MINTER_ROLE");
        console.log("   MINTER_ROLE granted");
        
        // 2. Grant WORKFLOW_ROLE to CRE workflow address
        console.log("\n2. Granting WORKFLOW_ROLE to CRE...");
        SentinelVaultETHV2 vault = SentinelVaultETHV2(vaultV2);
        vault.grantWorkflowRole(workflowAddress);
        console.log("   WORKFLOW_ROLE granted");
        
        vm.stopBroadcast();
        
        console.log("\n[OK] Setup complete!");
    }
}
