// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/tokens/USDAStablecoinV7.sol";

interface IMintingConsumer {
    function setStablecoin(address _stablecoin) external;
    function bankOperator() external view returns (address);
    function stablecoin() external view returns (address);
}

/**
 * @title SetupMintingConsumerV7
 * @notice Update MintingConsumer V5 to use USDA V7 and grant MINTER_ROLE
 */
contract SetupMintingConsumerV7 is Script {
    // Contract addresses
    address constant MINTING_CONSUMER = 0xFe0747c381A2227a954FeE7f99F41E382c6039a6;
    address constant USDA_V7 = 0x500D640f4fE39dAF609C6E14C83b89A68373EaFe;
    
    function run() external {
        vm.startBroadcast();
        
        console.log("=== Setting up MintingConsumer V5 for V7 ===");
        console.log("MintingConsumer:", MINTING_CONSUMER);
        console.log("USDA V7:", USDA_V7);
        
        // Check current stablecoin
        IMintingConsumer consumer = IMintingConsumer(MINTING_CONSUMER);
        address currentToken = consumer.stablecoin();
        console.log("\nCurrent token:", currentToken);
        
        // Update stablecoin if needed
        if (currentToken != USDA_V7) {
            console.log("Updating stablecoin to V7...");
            consumer.setStablecoin(USDA_V7);
            console.log("Updated! New token:", consumer.stablecoin());
        } else {
            console.log("Already using V7");
        }
        
        // Grant MINTER_ROLE to MintingConsumer on V7
        console.log("\n=== Granting MINTER_ROLE to MintingConsumer ===");
        USDAStablecoinV7 usda = USDAStablecoinV7(USDA_V7);
        bytes32 minterRole = usda.MINTER_ROLE();
        
        bool hasRole = usda.hasRole(minterRole, MINTING_CONSUMER);
        console.log("Current MINTER_ROLE status:", hasRole);
        
        if (!hasRole) {
            console.log("Granting MINTER_ROLE...");
            usda.grantRole(minterRole, MINTING_CONSUMER);
            console.log("Granted! Status now:", usda.hasRole(minterRole, MINTING_CONSUMER));
        } else {
            console.log("Already has MINTER_ROLE");
        }
        
        // Also grant BURNER_ROLE for completeness
        console.log("\n=== Granting BURNER_ROLE to MintingConsumer ===");
        bytes32 burnerRole = usda.BURNER_ROLE();
        bool hasBurnerRole = usda.hasRole(burnerRole, MINTING_CONSUMER);
        console.log("Current BURNER_ROLE status:", hasBurnerRole);
        
        if (!hasBurnerRole) {
            console.log("Granting BURNER_ROLE...");
            usda.grantRole(burnerRole, MINTING_CONSUMER);
            console.log("Granted! Status now:", usda.hasRole(burnerRole, MINTING_CONSUMER));
        } else {
            console.log("Already has BURNER_ROLE");
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Setup Complete ===");
    }
}
