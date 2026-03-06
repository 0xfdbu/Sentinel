// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

// USDA V4 interface
interface IUSDAStablecoin {
    function mint(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract MintUSDAV4 is Script {
    // Configuration
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== MINT USDA V4 (Direct) ===");
        console.log("Minter:", deployer);
        console.log("USDA V4:", USDA_V4);
        
        IUSDAStablecoin usda = IUSDAStablecoin(USDA_V4);
        
        // Check initial balance
        uint256 initialBalance = usda.balanceOf(deployer);
        console.log("Initial Balance:", initialBalance / 1e6, "USDA");
        
        // Mint 100 USDA
        uint256 mintAmount = 100 * 1e6;
        console.log("Minting:", mintAmount / 1e6, "USDA");
        
        vm.startBroadcast(deployerPrivateKey);
        usda.mint(deployer, mintAmount);
        vm.stopBroadcast();
        
        uint256 afterBalance = usda.balanceOf(deployer);
        console.log("Final Balance:", afterBalance / 1e6, "USDA");
        console.log("Minted:", (afterBalance - initialBalance) / 1e6, "USDA");
        console.log("SUCCESS!");
    }
}
