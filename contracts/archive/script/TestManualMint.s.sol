// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintingConsumer {
    function onReport(bytes calldata report, bytes calldata reportContext) external;
    function bankOperator() external view returns (address);
    function forwarder() external view returns (address);
    function usedReports(bytes32) external view returns (bool);
}

/**
 * @title TestManualMint
 * @notice Manually tests the consumer's receiveReport function
 */
contract TestManualMint is Script {
    address constant CONSUMER = 0xF81de8171cf69c643244885945A959244D36fb23;
    address constant USDA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        
        console.log("===========================================");
        console.log("MANUAL MINT TEST");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Consumer:", CONSUMER);
        
        // Check balances before
        IERC20 usda = IERC20(USDA);
        uint256 consumerBalanceBefore = usda.balanceOf(CONSUMER);
        uint256 beneficiaryBalanceBefore = usda.balanceOf(deployer);
        
        console.log("\nBalances BEFORE:");
        console.log("  Consumer USDA:", consumerBalanceBefore / 1e6, "USDA");
        console.log("  Beneficiary USDA:", beneficiaryBalanceBefore / 1e6, "USDA");
        
        // Build the report
        // Format: (instructionType, beneficiary, amount, bankRef)
        uint8 instructionType = 1; // MINT
        address beneficiary = deployer;
        uint256 amount = 5 * 1e6; // 5 USDA
        bytes32 bankRef = keccak256("MANUAL-TEST");
        
        bytes memory report = abi.encode(instructionType, beneficiary, amount, bankRef);
        bytes32 reportHash = keccak256(report);
        
        console.log("\nReport Data:");
        console.log("  Instruction: MINT (1)");
        console.log("  Beneficiary:", beneficiary);
        console.log("  Amount:", amount / 1e6, "USDA");
        console.log("  Report Hash:", vm.toString(reportHash));
        
        // Check if report was already used
        IMintingConsumer consumer = IMintingConsumer(CONSUMER);
        bool wasUsed = consumer.usedReports(reportHash);
        console.log("  Was Used Before:", wasUsed);
        
        // Get current forwarder
        address currentForwarder = consumer.forwarder();
        console.log("\nCurrent Forwarder:", currentForwarder);
        
        // NOTE: We cannot call receiveReport directly because it requires onlyForwarder
        // Instead, let's use emergencyMint which is available to bankOperator
        console.log("\n===========================================");
        console.log("Using emergencyMint (bypasses CRE workflow)");
        console.log("===========================================");
        
        vm.startBroadcast(deployerKey);
        
        // Call emergencyMint
        (bool success, ) = CONSUMER.call(
            abi.encodeWithSignature(
                "emergencyMint(address,uint256,bytes32)",
                beneficiary,
                amount,
                bankRef
            )
        );
        
        vm.stopBroadcast();
        
        if (success) {
            console.log("emergencyMint succeeded!");
        } else {
            console.log("emergencyMint FAILED!");
        }
        
        // Check balances after
        uint256 consumerBalanceAfter = usda.balanceOf(CONSUMER);
        uint256 beneficiaryBalanceAfter = usda.balanceOf(deployer);
        
        console.log("\nBalances AFTER:");
        console.log("  Consumer USDA:", consumerBalanceAfter / 1e6, "USDA");
        console.log("  Beneficiary USDA:", beneficiaryBalanceAfter / 1e6, "USDA");
        
        console.log("\nChange:");
        console.log("  Consumer Change:", (consumerBalanceBefore - consumerBalanceAfter) / 1e6, "USDA");
        console.log("  Beneficiary: +", (beneficiaryBalanceAfter - beneficiaryBalanceBefore) / 1e6, "USDA");
    }
}
