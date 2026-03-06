// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";

contract DeployTokenPools is Script {
    // Configuration for Sepolia
    struct Config {
        uint64 chainSelector;
        address router;
        address rmnProxy;
        address tokenAdminRegistry;
        address stablecoin;
        string name;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        
        // Setup configurations
        Config memory sepolia = Config({
            chainSelector: 16015286601757825753,
            router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59,
            rmnProxy: 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991,
            tokenAdminRegistry: 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82,
            stablecoin: 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6, // V4
            name: "Sepolia"
        });
        
        Config memory arbitrumSepolia = Config({
            chainSelector: 3478487238524512106,
            router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165,
            rmnProxy: 0xAc8CFc3762a979628334a0E4C1026244498E821b,
            tokenAdminRegistry: 0xA92053a4a3922084d992fD2835bdBa4caC6877e6,
            stablecoin: 0x543b8555f9284D106422F0eD7B9d25F9520a17Ad, // V4
            name: "ArbitrumSepolia"
        });
        
        // Determine which network we're on based on chain ID
        uint256 chainId = block.chainid;
        Config memory config;
        
        if (chainId == 11155111) {
            config = sepolia;
        } else if (chainId == 421614) {
            config = arbitrumSepolia;
        } else {
            revert("Unsupported network");
        }
        
        console.log("Deploying on:", config.name);
        console.log("Chain ID:", chainId);
        console.log("Stablecoin:", config.stablecoin);
        
        // Deploy TokenPool
        vm.startBroadcast(deployerPrivateKey);
        
        address[] memory allowlist = new address[](0); // Permissionless
        
        BurnMintTokenPool pool = new BurnMintTokenPool(
            IBurnMintERC20(config.stablecoin),
            6, // decimals
            allowlist,
            config.rmnProxy,
            config.router
        );
        
        vm.stopBroadcast();
        
        console.log("TokenPool deployed:", address(pool));
        console.log("");
        console.log("=== NEXT STEPS ===");
        console.log("1. Grant MINTER_ROLE and BURNER_ROLE to the TokenPool on the stablecoin");
        console.log("2. Register the TokenPool with CCIP TokenAdminRegistry");
        console.log("3. Configure cross-chain routes between pools");
    }
}
