// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// CCIP interfaces (manual definitions to avoid path issues)
interface IRouterClient {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        EVMTokenAmount[] tokenAmounts;
        address feeToken;
        bytes extraArgs;
    }
    
    struct EVMTokenAmount {
        address token;
        uint256 amount;
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

/**
 * @title TestBridgeCCIP
 * @notice Tests CCIP bridge using the proper Router interface
 * @dev Based on CRE template CCIPTransferConsumer pattern
 */
contract TestBridgeCCIP is Script {
    // Configuration
    address constant USDA_V4_SEPOLIA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    address constant ROUTER_SEPOLIA = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;
    address constant LINK_SEPOLIA = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    
    uint64 constant ARBITRUM_CHAIN_SELECTOR = 3478487238524512106;
    
    // CCIP extraArgs version tag
    bytes4 constant EVM_EXTRA_ARGS_V1_TAG = 0x97a657c9;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("CCIP BRIDGE TEST (Sepolia -> Arbitrum)");
        console.log("===========================================");
        console.log("Sender:", deployer);
        console.log("USDA V4:", USDA_V4_SEPOLIA);
        console.log("Router:", ROUTER_SEPOLIA);
        
        IRouterClient router = IRouterClient(ROUTER_SEPOLIA);
        IERC20 usda = IERC20(USDA_V4_SEPOLIA);
        IERC20 link = IERC20(LINK_SEPOLIA);
        
        // Amount to bridge
        uint256 amount = 10 * 1e6; // 10 USDA (6 decimals)
        console.log("\nAmount to bridge:", amount / 1e6, "USDA");
        
        // Check balances
        uint256 usdaBalance = usda.balanceOf(deployer);
        console.log("USDA Balance:", usdaBalance / 1e6, "USDA");
        
        if (usdaBalance < amount) {
            console.log("ERROR: Insufficient USDA balance!");
            return;
        }
        
        // Build CCIP message
        IRouterClient.EVMTokenAmount[] memory tokenAmounts = new IRouterClient.EVMTokenAmount[](1);
        tokenAmounts[0] = IRouterClient.EVMTokenAmount({
            token: USDA_V4_SEPOLIA,
            amount: amount
        });
        
        // extraArgs: EVMExtraArgsV1 format with version tag
        // gasLimit = 0 means use default
        bytes memory extraArgs = abi.encodePacked(
            EVM_EXTRA_ARGS_V1_TAG,
            abi.encode(uint256(0)) // gasLimit
        );
        
        IRouterClient.EVM2AnyMessage memory message = IRouterClient.EVM2AnyMessage({
            receiver: abi.encode(deployer),
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: LINK_SEPOLIA,
            extraArgs: extraArgs
        });
        
        // Get fee estimate
        uint256 fees = router.getFee(ARBITRUM_CHAIN_SELECTOR, message);
        console.log("CCIP Fee:", fees / 1e18, "LINK");
        
        // Check LINK balance
        uint256 linkBalance = link.balanceOf(deployer);
        console.log("LINK Balance:", linkBalance / 1e18, "LINK");
        
        if (linkBalance < fees) {
            console.log("ERROR: Insufficient LINK balance!");
            console.log("Need:", fees / 1e18, "LINK");
            return;
        }
        
        console.log("\n--- Executing Bridge ---");
        
        vm.startBroadcast(deployerKey);
        
        // Step 1: Approve Router to spend USDA
        console.log("1. Approving Router to spend USDA...");
        usda.approve(ROUTER_SEPOLIA, amount);
        
        // Step 2: Approve Router to spend LINK for fees
        console.log("2. Approving Router to spend LINK...");
        link.approve(ROUTER_SEPOLIA, fees);
        
        // Step 3: Send CCIP message
        console.log("3. Sending CCIP message...");
        bytes32 messageId = router.ccipSend(ARBITRUM_CHAIN_SELECTOR, message);
        
        vm.stopBroadcast();
        
        console.log("\n===========================================");
        console.log("BRIDGE SUBMITTED SUCCESSFULLY!");
        console.log("===========================================");
        console.log("Message ID:", vm.toString(messageId));
        console.log("Amount:", amount / 1e6, "USDA");
        console.log("Fee:", fees / 1e18, "LINK");
        console.log("From:", deployer, "(Sepolia)");
        console.log("To:", deployer, "(Arbitrum Sepolia)");
        console.log("\nTrack at: https://ccip.chain.link/");
        
        // Check final balance
        uint256 finalBalance = usda.balanceOf(deployer);
        console.log("\nUSDA Balance after bridge:", finalBalance / 1e6, "USDA");
        console.log("Burned:", (usdaBalance - finalBalance) / 1e6, "USDA");
    }
}
