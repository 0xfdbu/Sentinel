// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPolicyEngine
 * @notice Interface for the Sentinel PolicyEngine
 * @dev ACE-compliant contracts interact with this interface
 */
interface IPolicyEngine {
    
    /// @notice Severity levels
    function SEVERITY_OK() external pure returns (uint8);
    function SEVERITY_LOW() external pure returns (uint8);
    function SEVERITY_MEDIUM() external pure returns (uint8);
    function SEVERITY_HIGH() external pure returns (uint8);
    function SEVERITY_CRITICAL() external pure returns (uint8);
    
    /**
     * @notice Evaluate transaction from an ACE-compliant contract
     * @param from Transaction sender
     * @param to The ACE-compliant contract address
     * @param value Transaction value
     * @param data Transaction calldata
     * @return shouldBlock True if transaction violates policies
     * @return reason Reason for blocking
     */
    function evaluateFromContract(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool shouldBlock, string memory reason);
    
    /**
     * @notice Quick compliance check for ACE contracts
     * @param from Transaction sender
     * @param to The ACE-compliant contract
     * @param value Transaction value
     * @return compliant True if passes all policies
     */
    function isCompliant(
        address from,
        address to,
        uint256 value
    ) external returns (bool compliant);
    
    /**
     * @notice Quick check if a transaction should be paused
     * @param from Transaction sender
     * @param to Transaction recipient
     * @param value Transaction value
     * @param data Transaction calldata
     * @return shouldPause True if severity >= pauseThreshold
     * @return severity The highest severity found
     */
    function shouldPauseTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool shouldPause, uint8 severity);
    
    /**
     * @notice Get current pause threshold
     */
    function pauseThreshold() external view returns (uint8);
}
