// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/por/SentinelVaultETHV2.sol";

/**
 * @title UpdateVaultMinDeposit
 * @notice Updates the minimum deposit on Vault V2 from 0.01 ETH to 0.001 ETH
 * @dev Run: forge script script/UpdateVaultMinDeposit.s.sol --rpc-url $SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast
 */
contract UpdateVaultMinDeposit is Script {
    // Vault V2 deployed address
    address constant VAULT_V2 = 0x69C8E369Ce1feC4444F070Df8093e5bDAEcE7D22;
    
    // New minimum: 0.001 ETH = 0.001 * 10^18 = 10^15 wei
    uint256 constant NEW_MIN_DEPOSIT = 0.001 ether;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SentinelVaultETHV2 vault = SentinelVaultETHV2(VAULT_V2);
        
        console.log("Current minimum deposit:", vault.minimumDeposit());
        console.log("Setting new minimum deposit to:", NEW_MIN_DEPOSIT);
        
        // Update minimum deposit (requires DEFAULT_ADMIN_ROLE)
        vault.setMinimumDeposit(NEW_MIN_DEPOSIT);
        
        console.log("New minimum deposit:", vault.minimumDeposit());
        console.log("Update complete!");
        
        vm.stopBroadcast();
    }
}
