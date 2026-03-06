// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {USDAStablecoinV7} from "../src/tokens/USDAStablecoinV7.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";

// Minimal interfaces
interface IRegistryModuleOwnerCustom {
    function registerAdminViaOwner(address token) external;
}

interface ITokenAdminRegistry {
    function acceptAdminRole(address token) external;
    function setPool(address token, address pool) external;
}

contract DeployV7Only is Script {
    address constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant SEPOLIA_RMN_PROXY = 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991;
    address constant SEPOLIA_REGISTRY_MODULE = 0x62e731218d0D47305aba2BE3751E7EE9E5520790;
    address constant SEPOLIA_TOKEN_ADMIN_REGISTRY = 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82;
    address constant SEPOLIA_POLICY_ENGINE = 0x62CC29A58404631B7db65CE14E366F63D3B96B16;
    address constant SEPOLIA_GUARDIAN = 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("Deploying USDA V7...");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerKey);
        
        // Deploy V7 Implementation
        USDAStablecoinV7 impl = new USDAStablecoinV7();
        console.log("Implementation:", address(impl));
        
        // Deploy Proxy
        bytes memory initData = abi.encodeWithSelector(
            USDAStablecoinV7.initialize.selector,
            deployer,
            SEPOLIA_POLICY_ENGINE,
            SEPOLIA_GUARDIAN
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        address usdaV7 = address(proxy);
        console.log("Proxy:", usdaV7);
        
        // Grant pauser role
        USDAStablecoinV7(usdaV7).grantSentinelPauserRole(SEPOLIA_GUARDIAN);
        console.log("Pauser role granted");
        
        // Deploy TokenPool
        address[] memory allowlist = new address[](0);
        BurnMintTokenPool pool = new BurnMintTokenPool(
            IBurnMintERC20(usdaV7),
            18,
            allowlist,
            SEPOLIA_RMN_PROXY,
            SEPOLIA_ROUTER
        );
        console.log("TokenPool:", address(pool));
        
        // Set pool in V7
        USDAStablecoinV7(usdaV7).setTokenPool(address(pool));
        console.log("Pool set in V7");
        
        // Register in TokenAdminRegistry
        IRegistryModuleOwnerCustom(SEPOLIA_REGISTRY_MODULE).registerAdminViaOwner(usdaV7);
        ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY).acceptAdminRole(usdaV7);
        ITokenAdminRegistry(SEPOLIA_TOKEN_ADMIN_REGISTRY).setPool(usdaV7, address(pool));
        console.log("Registered in TokenAdminRegistry");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("USDA_V7:", usdaV7);
        console.log("USDA_V7_POOL:", address(pool));
    }
}
