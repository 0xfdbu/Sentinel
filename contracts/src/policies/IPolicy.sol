// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPolicy
 * @notice Interface for ACE (Autonomous Compliance Engine) policies
 * @dev Based on Chainlink CRE stablecoin-ace-ccip template
 */
interface IPolicy {
    /**
     * @notice Evaluate if a transaction complies with the policy
     * @param from Transaction sender
     * @param to Transaction recipient (can be address(0) for contract creation)
     * @param value Transaction value in wei
     * @param data Transaction calldata
     * @return compliant True if transaction complies with policy
     * @return reason Reason string if non-compliant (empty if compliant)
     * @return severity Severity level: 0=OK, 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL
     */
    function evaluate(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool compliant, string memory reason, uint8 severity);

    /**
     * @notice Get policy name
     */
    function name() external view returns (string memory);

    /**
     * @notice Get policy version
     */
    function version() external view returns (string memory);

    /**
     * @notice Check if policy is active
     */
    function isActive() external view returns (bool);
}
