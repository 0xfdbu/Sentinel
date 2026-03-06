// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {USDAStablecoinV6} from "../src/tokens/USDAStablecoinV6.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployV6Only
 * @notice Deploys USDA V6 with ACE protection only (no TokenPool config)
 */
contract DeployV6Only is Script {
    // Sepolia Configuration
    address constant SEPOLIA_POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SEPOLIA_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    // Deployment parameters
    uint256 constant INITIAL_MINT_CAP = 1_000_000_000e9; // 1B USDA
    uint256 constant DAILY_MINT_LIMIT = 100_000_000e9;   // 100M daily
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== USDA V6 Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        require(block.chainid == 11155111, "Must run on Sepolia");
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Deploy Implementation
        console.log("Step 1: Deploying Implementation...");
        USDAStablecoinV6 usdaImpl = new USDAStablecoinV6();
        console.log("Implementation:", address(usdaImpl));
        
        // Step 2: Deploy Proxy
        console.log("");
        console.log("Step 2: Deploying Proxy...");
        
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV6.initialize.selector,
            deployer,
            SEPOLIA_POLICY_ENGINE,
            SEPOLIA_GUARDIAN,
            INITIAL_MINT_CAP,
            DAILY_MINT_LIMIT
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(usdaImpl), initData);
        address usdaV6 = address(proxy);
        console.log("Proxy:", usdaV6);
        
        // Step 3: Grant Sentinel Pauser Role
        console.log("");
        console.log("Step 3: Granting pauser role...");
        USDAStablecoinV6(usdaV6).grantSentinelPauserRole(SEPOLIA_GUARDIAN);
        console.log("Done!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("USDA_V6_IMPLEMENTATION=", address(usdaImpl));
        console.log("USDA_V6_PROXY=", usdaV6);
    }
}
