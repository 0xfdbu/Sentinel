// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract GrantVaultMinter is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        
        address usdaV10 = 0x9177D27e212f3d208a92a6261c8B30B426abf772;
        address vaultV2 = 0x69C8E369Ce1feC4444F070Df8093e5bDAEcE7D22;
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        
        console.log("Granting MINTER_ROLE...");
        console.log("USDA V10:", usdaV10);
        console.log("Vault V2:", vaultV2);
        
        vm.startBroadcast(deployerPK);
        
        (bool success, ) = usdaV10.call(
            abi.encodeWithSignature(
                "grantRole(bytes32,address)",
                MINTER_ROLE,
                vaultV2
            )
        );
        
        require(success, "Failed to grant MINTER_ROLE");
        
        vm.stopBroadcast();
        
        console.log("[OK] MINTER_ROLE granted to Vault V2");
    }
}
