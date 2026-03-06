// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// CCIP Router interface
interface IRouter {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        address[] tokenAmounts;
        address feeToken;
        bytes extraArgs;
    }
    
    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external payable returns (bytes32);
    
    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external view returns (uint256);
}

// TokenPool interface
interface ITokenPool {
    function getToken() external view returns (address);
}

// USDA interface
interface IUSDAStablecoin {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TestBridgeRouter is Script {
    // Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant TOKEN_POOL_SEPOLIA = 0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480;
    address constant ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== BRIDGE TEST VIA CCIP ROUTER ===");
        console.log("Tester:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("Router:", ROUTER_SEPOLIA);
        
        IRouter router = IRouter(ROUTER_SEPOLIA);
        IUSDAStablecoin usda = IUSDAStablecoin(USDA_V4_SEPOLIA);
        IERC20 link = IERC20(LINK_SEPOLIA);
        
        // Amount to bridge
        uint256 amount = 10 * 1e6; // 10 USDA
        console.log("Amount to bridge:", amount / 1e6, "USDA");
        
        // Check USDA balance
        uint256 usdaBalance = usda.balanceOf(deployer);
        console.log("USDA Balance:", usdaBalance / 1e6, "USDA");
        
        if (usdaBalance < amount) {
            console.log("ERROR: Insufficient USDA balance!");
            return;
        }
        
        // Build CCIP message
        address[] memory tokens = new address[](1);
        tokens[0] = TOKEN_POOL_SEPOLIA; // Token pool represents the token
        
        IRouter.EVM2AnyMessage memory message = IRouter.EVM2AnyMessage({
            receiver: abi.encode(deployer), // Same address on destination
            data: "", // No data
            tokenAmounts: tokens,
            feeToken: LINK_SEPOLIA, // Pay fees in LINK
            extraArgs: "" // No extra args
        });
        
        // Get fee estimate
        uint256 fee = router.getFee(ARBITRUM_CHAIN_SELECTOR, message);
        console.log("CCIP Fee:", fee / 1e18, "LINK");
        
        // Check LINK balance
        uint256 linkBalance = link.balanceOf(deployer);
        console.log("LINK Balance:", linkBalance / 1e18, "LINK");
        
        if (linkBalance < fee) {
            console.log("ERROR: Insufficient LINK balance!");
            console.log("Need:", fee / 1e18, "LINK");
            return;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Approve USDA to TokenPool
        console.log("Approving USDA to TokenPool...");
        usda.approve(TOKEN_POOL_SEPOLIA, amount);
        
        // Approve LINK for fees
        console.log("Approving LINK for fees...");
        link.approve(ROUTER_SEPOLIA, fee);
        
        // Send CCIP message
        console.log("Sending CCIP message...");
        bytes32 messageId = router.ccipSend(ARBITRUM_CHAIN_SELECTOR, message);
        
        vm.stopBroadcast();
        
        console.log("BRIDGE SUBMITTED!");
        console.log("Message ID:", vm.toString(messageId));
    }
}
