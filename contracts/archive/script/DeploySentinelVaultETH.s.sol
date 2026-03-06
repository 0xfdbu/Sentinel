// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SentinelVaultETH} from "../src/por/SentinelVaultETH.sol";

/**
 * @title DeploySentinelVaultETH
 * @notice Deploys the ETH-collateralized minting vault for USDA
 * @dev The vault accepts ETH deposits and mints USDA based on aggregated price data
 */
contract DeploySentinelVaultETH is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        // Configuration - using deployed V8 contract
        address usdaV8 = vm.envOr("USDA_V8", address(0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF));
        // Chainlink ETH/USD price feed on Sepolia
        address chainlinkPriceFeed = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
        address guardian = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
        
        // CRE workflow address (needs SENTINEL_ROLE)
        // This is the address that will execute the mint after price aggregation
        address creWorkflow = vm.envOr("CRE_WORKFLOW_ADDRESS", address(0));
        
        console.log("Deploying SentinelVaultETH...");
        console.log("Deployer:", deployer);
        console.log("USDA V8:", usdaV8);
        console.log("Chainlink Price Feed:", chainlinkPriceFeed);
        console.log("Guardian:", guardian);
        console.log("CRE Workflow (SENTINEL_ROLE):", creWorkflow);
        
        vm.startBroadcast(deployerPK);
        
        // Deploy the vault
        SentinelVaultETH vault = new SentinelVaultETH(
            usdaV8,
            chainlinkPriceFeed,
            deployer
        );
        
        // Grant SENTINEL_ROLE to CRE workflow if specified
        if (creWorkflow != address(0)) {
            vault.grantRole(vault.SENTINEL_ROLE(), creWorkflow);
            console.log("Granted SENTINEL_ROLE to CRE workflow:", creWorkflow);
        }
        
        // Grant SENTINEL_ROLE to deployer for testing
        vault.grantRole(vault.SENTINEL_ROLE(), deployer);
        console.log("Granted SENTINEL_ROLE to deployer for testing");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("========================================");
        console.log("VAULT DEPLOYED!");
        console.log("========================================");
        console.log("SentinelVaultETH:", address(vault));
        console.log("USDA Token:", address(vault.usdaToken()));
        console.log("Chainlink Price Feed:", address(vault.chainlinkPriceFeed()));
        console.log("Collateral Ratio:", vault.collateralRatio());
        console.log("Minimum Deposit:", vault.minimumDeposit());
        console.log("");
        console.log("Environment Variables:");
        console.log("  export VAULT_ETH_ADDRESS=", address(vault));
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Grant MINTER_ROLE to vault on USDA V8:");
        console.log("     usdaV8.grantRole(MINTER_ROLE, ", address(vault), ")");
        console.log("  2. Update API server .env with VAULT_ETH_ADDRESS");
        console.log("  3. Grant SENTINEL_ROLE to CRE workflow address on vault");
        console.log("========================================");
    }
}

/**
 * @title GrantVaultMinterRole
 * @notice Grants MINTER_ROLE to vault on USDA V8
 */
contract GrantVaultMinterRole is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        address vault = vm.envOr("VAULT_ETH_ADDRESS", address(0));
        address usdaV8 = vm.envOr("USDA_V8", address(0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF));
        
        require(vault != address(0), "Set VAULT_ETH_ADDRESS environment variable");
        
        console.log("Granting MINTER_ROLE to vault...");
        console.log("Vault:", vault);
        console.log("USDA V8:", usdaV8);
        
        vm.startBroadcast(deployerPK);
        
        // Get USDA contract interface
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        
        // USDA V8 interface for granting role
        (bool success, ) = usdaV8.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                MINTER_ROLE,
                vault
            )
        );
        
        require(success, "Failed to grant MINTER_ROLE");
        
        vm.stopBroadcast();
        
        console.log("MINTER_ROLE granted successfully!");
    }
}

/**
 * @title GrantSentinelRole
 * @notice Grants SENTINEL_ROLE to CRE workflow on vault
 */
contract GrantSentinelRole is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address vault = vm.envOr("VAULT_ETH_ADDRESS", address(0));
        address sentinel = vm.envOr("SENTINEL_ADDRESS", address(0));
        
        require(vault != address(0), "Set VAULT_ETH_ADDRESS environment variable");
        require(sentinel != address(0), "Set SENTINEL_ADDRESS environment variable");
        
        console.log("Granting SENTINEL_ROLE to:", sentinel);
        console.log("Vault:", vault);
        
        vm.startBroadcast(deployerPK);
        
        // Grant SENTINEL_ROLE
        bytes32 SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
        (bool success, ) = vault.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                SENTINEL_ROLE,
                sentinel
            )
        );
        
        require(success, "Failed to grant SENTINEL_ROLE");
        
        vm.stopBroadcast();
        
        console.log("SENTINEL_ROLE granted successfully!");
    }
}

/**
 * @title CheckVaultStatus
 * @notice Check vault configuration and balances
 */
contract CheckVaultStatus is Script {
    function run() external {
        address vault = vm.envOr("VAULT_ETH_ADDRESS", address(0));
        
        require(vault != address(0), "Set VAULT_ETH_ADDRESS environment variable");
        
        console.log("Checking Vault Status...");
        console.log("Vault:", vault);
        
        // Call vault functions to check state
        // This is a view function so no broadcast needed
        
        console.log("");
        console.log("To check status, use cast:");
        console.log("  cast call", vault, "'usdaToken()'(address) --rpc-url $SEPOLIA_RPC");
        console.log("  cast call", vault, "'policyEngine()'(address) --rpc-url $SEPOLIA_RPC");
        console.log("  cast balance", vault, "--rpc-url $SEPOLIA_RPC");
    }
}
