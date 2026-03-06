// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VerifySig {
    // Get the selector for onReport(bytes,bytes)
    function getOnReportSelector() external pure returns (bytes4) {
        return this.onReport.selector;
    }
    
    function onReport(bytes calldata report, bytes calldata reportContext) external {}
}
