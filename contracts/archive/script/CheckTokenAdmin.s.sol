// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface ITokenAdminRegistry {
    function getPool(address token) external view returns (address);
    function getAdmin(address token) external view returns (address);
    function isRegistryModule(address module) external view returns (bool);
}

contract CheckTokenAdmin is Script {
    address constant TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant REGISTRY_MODULE = 0x62e731218d0D47305aba2BE3751E7EE9E5520790;
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant POOL = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    
    function run() external view {
        ITokenAdminRegistry registry = ITokenAdminRegistry(TOKEN_ADMIN_REGISTRY);
        
        console.log("TokenAdminRegistry:", TOKEN_ADMIN_REGISTRY);
        console.log("RegistryModule:", REGISTRY_MODULE);
        console.log("USDA V4:", USDA_V4);
        
        address pool = registry.getPool(USDA_V4);
        console.log("Pool for USDA V4:", pool);
        
        address admin = registry.getAdmin(USDA_V4);
        console.log("Admin for USDA V4:", admin);
        
        bool isModule = registry.isRegistryModule(REGISTRY_MODULE);
        console.log("Is RegistryModule valid:", isModule);
        
        if (pool == POOL) {
            console.log("Pool registration: CORRECT");
        } else {
            console.log("Pool registration: MISMATCH (expected:", POOL, ")");
        }
    }
}
