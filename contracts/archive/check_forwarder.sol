// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Interface to check what the Forwarder does
 */
interface IForwarder {
    // The function that workflows call
    function writeReport(
        address receiver,
        bytes calldata report,
        bytes calldata reportContext,
        bytes calldata signatures
    ) external;
    
    // Check if there's a different function
    function transmit(
        address receiver,
        bytes calldata report,
        bytes calldata reportContext,
        bytes calldata signatures
    ) external;
}

contract ForwarderChecker {
    // Try to understand what the Forwarder does
    function getExpectedReportFormat() external pure returns (string memory) {
        // The official template says report format is:
        // (uint64 destChainSelector, address sender, address beneficiary, uint256 amount, bytes32 bankRef)
        return "(uint64,address,address,uint256,bytes32)";
    }
}
