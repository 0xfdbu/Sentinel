// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// TokenPool interface
interface IBurnMintTokenPool {
    function lockOrBurn(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external returns (bytes32);
    
    function isSupportedChain(uint64 chainSelector) external view returns (bool);
}

// USDA interface
interface IUSDAStablecoin {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract TestBridge is Script {
    // Configuration - USING USDA V4
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant TOKEN_POOL_SEPOLIA = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== BRIDGE TEST (Sepolia -> Arbitrum Sepolia) ===");
        console.log("Tester:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("TokenPool:", TOKEN_POOL_SEPOLIA);
        
        IBurnMintTokenPool pool = IBurnMintTokenPool(TOKEN_POOL_SEPOLIA);
        IUSDAStablecoin usda = IUSDAStablecoin(USDA_V4_SEPOLIA);
        IERC20 link = IERC20(LINK_SEPOLIA);
        
        // Check if chain is supported
        bool supported = pool.isSupportedChain(ARBITRUM_CHAIN_SELECTOR);
        console.log("Arbitrum chain supported:", supported);
        if (!supported) {
            console.log("ERROR: Chain not supported!");
            return;
        }
        
        // Amount to bridge
        uint256 amount = 10 * 1e6; // 10 USDA
        console.log("Amount to bridge:", amount / 1e6, "USDA");
        
        // Check USDA balance
        uint256 usdaBalance = usda.balanceOf(deployer);
        console.log("USDA Balance:", usdaBalance / 1e6, "USDA");
        
        if (usdaBalance < amount) {
            console.log("ERROR: Insufficient USDA balance!");
            console.log("Need:", amount / 1e6, "USDA");
            console.log("Have:", usdaBalance / 1e6, "USDA");
            return;
        }
        
        // Use fixed LINK approval amount (2 LINK should be enough)
        uint256 linkApproval = 2 * 1e18;
        console.log("LINK approval for fees:", linkApproval / 1e18, "LINK");
        
        // Check LINK balance
        uint256 linkBalance = link.balanceOf(deployer);
        console.log("LINK Balance:", linkBalance / 1e18, "LINK");
        
        if (linkBalance < linkApproval) {
            console.log("ERROR: Insufficient LINK balance for fees!");
            console.log("Need:", linkApproval / 1e18, "LINK");
            return;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Approve USDA to TokenPool
        console.log("Step 1: Approving USDA to TokenPool...");
        usda.approve(TOKEN_POOL_SEPOLIA, amount);
        console.log("Approved:", amount / 1e6, "USDA");
        
        // Step 2: Approve LINK for CCIP fees
        console.log("Step 2: Approving LINK for CCIP fees...");
        link.approve(TOKEN_POOL_SEPOLIA, linkApproval);
        console.log("Approved:", linkApproval / 1e18, "LINK");
        
        // Step 3: Bridge via TokenPool
        console.log("Step 3: Bridging tokens...");
        bytes32 messageId = pool.lockOrBurn(
            ARBITRUM_CHAIN_SELECTOR,
            deployer, // receiver (same address on destination)
            amount
        );
        
        vm.stopBroadcast();
        
        console.log("BRIDGE TRANSACTION SUBMITTED!");
        console.log("Message ID:", vm.toString(messageId));
        console.log("Amount:", amount / 1e6, "USDA burned on Sepolia");
        console.log("Destination:", deployer, "on Arbitrum Sepolia");
        
        console.log("Bridge Status:");
        console.log("- Tokens burned on Sepolia");
        console.log("- CCIP message in transit");
        console.log("- Tokens will be minted on Arbitrum Sepolia");
        console.log("- Check status at: https://ccip.chain.link/");
        
        // Check balance after
        uint256 afterBalance = usda.balanceOf(deployer);
        console.log("USDA Balance after bridge:", afterBalance / 1e6, "USDA");
        console.log("Burned:", (usdaBalance - afterBalance) / 1e6, "USDA");
    }
}
