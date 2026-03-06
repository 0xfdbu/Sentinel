// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../policies/IPolicyEngine.sol";

/**
 * @title IACECompliant
 * @notice Interface for Sentinel ACE-compliant contracts
 * @dev Contracts that want ACE enforcement must implement this interface
 * 
 * Opt-in model:
 * - User can choose Guardian-only (hack protection) 
 * - Or Guardian + ACE (hack protection + compliance rules)
 */
interface IACECompliant {
    
    /// @notice Emitted when ACE enforcement is enabled/disabled
    event ACEEnforcementSet(bool enabled, address policyEngine);
    
    /// @notice Emitted when a transaction is blocked by ACE
    event ACEBlock(address indexed caller, bytes4 indexed selector, string reason);
    
    /// @notice Emitted when ACE validation passes
    event ACEPass(address indexed caller, bytes4 indexed selector);
    
    /**
     * @notice Check if this contract has ACE enforcement enabled
     */
    function aceEnforcementEnabled() external view returns (bool);
    
    /**
     * @notice Get the PolicyEngine address being used
     */
    function policyEngine() external view returns (IPolicyEngine);
    
    /**
     * @notice Enable/disable ACE enforcement (owner only)
     * @param enabled True to enable ACE checks, false to disable
     */
    function setACEEnforcement(bool enabled) external;
    
    /**
     * @notice Update the PolicyEngine address (owner only)
     * @param newPolicyEngine Address of the new PolicyEngine
     */
    function setPolicyEngine(address newPolicyEngine) external;
}
