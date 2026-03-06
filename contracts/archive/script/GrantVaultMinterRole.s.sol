// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

// USDA V4 interface
interface IUSDAStablecoin {
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function MINTER_ROLE() external view returns (bytes32);
}

contract GrantVaultMinterRole is Script {
    // Configuration
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant VAULT_V2 = 0xDBF3C1D3CEC639C0a9Ed3d40946076a9Bc042c45;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== GRANT MINTER_ROLE TO VAULT V2 ===");
        console.log("Admin:", deployer);
        console.log("USDA V4:", USDA_V4);
        console.log("Vault V2:", VAULT_V2);
        
        IUSDAStablecoin usda = IUSDAStablecoin(USDA_V4);
        
        // Get MINTER_ROLE
        bytes32 minterRole = usda.MINTER_ROLE();
        console.log("MINTER_ROLE:", vm.toString(minterRole));
        
        // Check current status
        bool hasRole = usda.hasRole(minterRole, VAULT_V2);
        console.log("Vault has MINTER_ROLE:", hasRole);
        
        if (!hasRole) {
            console.log("Granting MINTER_ROLE to Vault V2...");
            
            vm.startBroadcast(deployerPrivateKey);
            usda.grantRole(minterRole, VAULT_V2);
            vm.stopBroadcast();
            
            console.log("MINTER_ROLE granted!");
            
            // Verify
            bool verified = usda.hasRole(minterRole, VAULT_V2);
            console.log("Vault has MINTER_ROLE (verified):", verified);
        } else {
            console.log("Vault already has MINTER_ROLE");
        }
    }
}
