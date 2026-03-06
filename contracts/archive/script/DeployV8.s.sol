// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {USDAStablecoinV8} from "../src/tokens/USDAStablecoinV8.sol";

/**
 * @title DeployV8
 * @notice Deploy V8 implementation and upgrade proxy
 */
contract DeployV8 is Script {
    address constant USDA_PROXY = 0x500D640f4fE39dAF609C6E14C83b89A68373EaFe;
    
    function run() external {
        vm.startBroadcast();
        
        console.log("=== Deploying USDA V8 ===");
        console.log("Proxy:", USDA_PROXY);
        
        // Get current implementation
        (bool implSuccess, bytes memory implData) = USDA_PROXY.call(
            abi.encodeWithSignature("implementation()")
        );
        if (implSuccess) {
            address currentImpl = abi.decode(implData, (address));
            console.log("Current implementation:", currentImpl);
        }
        
        // Deploy V8 implementation
        console.log("\n1. Deploying V8 implementation...");
        USDAStablecoinV8 v8Impl = new USDAStablecoinV8();
        console.log("V8 Implementation deployed:", address(v8Impl));
        
        // Upgrade proxy to V8
        console.log("\n2. Upgrading proxy to V8...");
        
        // Call upgradeTo on proxy (UUPS pattern)
        (bool upSuccess,) = USDA_PROXY.call(
            abi.encodeWithSignature("upgradeTo(address)", address(v8Impl))
        );
        require(upSuccess, "Upgrade failed");
        console.log("Upgrade successful!");
        
        // Verify upgrade
        (bool verifySuccess, bytes memory verifyData) = USDA_PROXY.call(
            abi.encodeWithSignature("implementation()")
        );
        if (verifySuccess) {
            address newImpl = abi.decode(verifyData, (address));
            console.log("New implementation:", newImpl);
            require(newImpl == address(v8Impl), "Implementation mismatch");
        }
        
        // Verify PolicyEngine still set
        (bool peSuccess, bytes memory peData) = USDA_PROXY.call(
            abi.encodeWithSignature("policyEngine()")
        );
        if (peSuccess) {
            address pe = abi.decode(peData, (address));
            console.log("PolicyEngine:", pe);
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== V8 Deployment Complete ===");
        console.log("Implementation:", address(v8Impl));
        console.log("Proxy:", USDA_PROXY);
    }
}
