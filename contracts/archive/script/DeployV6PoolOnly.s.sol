// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";

contract DeployV6PoolOnly is Script {
    address constant SEPOLIA_ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant SEPOLIA_RMN_PROXY = 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991;
    address constant USDA_V6 = 0xc1B1f04212aF9da91cEC3CE1ee9936006b990A61;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("=== Deploying V6 TokenPool ===");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerKey);
        
        address[] memory allowlist = new address[](0);
        
        BurnMintTokenPool pool = new BurnMintTokenPool(
            IBurnMintERC20(USDA_V6),
            18, // decimals
            allowlist,
            SEPOLIA_RMN_PROXY,
            SEPOLIA_ROUTER
        );
        
        vm.stopBroadcast();
        
        console.log("TokenPool deployed:", address(pool));
    }
}
