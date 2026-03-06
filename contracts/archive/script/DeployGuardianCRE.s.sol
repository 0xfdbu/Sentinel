// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/EmergencyGuardianCRE.sol";

/**
 * @title DeployGuardianCRE
 * @notice Deploys the enhanced EmergencyGuardian with DON report support
 * @dev Run: forge script script/DeployGuardianCRE.s.sol --rpc-url $SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast
 */
contract DeployGuardianCRE is Script {
    // Sepolia SentinelRegistry
    address constant REGISTRY = 0x774B96F8d892A1e4482B52b3d255Fa269136A0E9;
    
    // Deployed contract address will be stored here
    address public guardianCRE;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying EmergencyGuardianCRE...");
        console.log("Registry:", REGISTRY);
        
        // Deploy new Guardian
        EmergencyGuardianCRE guardian = new EmergencyGuardianCRE(REGISTRY);
        guardianCRE = address(guardian);
        
        console.log("EmergencyGuardianCRE deployed:", guardianCRE);
        
        // Grant SENTINEL_ROLE to the API server wallet (for testing)
        address apiWallet = vm.envAddress("API_WALLET", msg.sender);
        guardian.grantRole(guardian.SENTINEL_ROLE(), apiWallet);
        console.log("Granted SENTINEL_ROLE to:", apiWallet);
        
        // Set DON verification required
        guardian.setDonVerificationRequired(true);
        console.log("DON verification enabled");
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("GuardianCRE:", guardianCRE);
        console.log("\nNext steps:");
        console.log("1. Update sentinel-node .env with GUARDIAN_CRE_ADDRESS");
        console.log("2. Update workflow config.json with guardianCREAddress");
        console.log("3. Register GuardianCRE in SentinelRegistry");
        console.log("4. Grant DON_SIGNER_ROLE to CRE workflow address");
    }
}
