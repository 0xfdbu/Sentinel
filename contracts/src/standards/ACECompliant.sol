// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IACECompliant.sol";
import "../policies/IPolicyEngine.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ACECompliant
 * @notice Abstract base contract for Sentinel ACE compliance
 * @dev Inherit from this to make your contract ACE-compliant
 * 
 * Example usage:
 * ```solidity
 * contract MyVault is ACECompliant {
 *     function deposit() external payable whenACECompliant {
 *         // Only executes if ACE validation passes
 *     }
 * }
 * ```
 */
abstract contract ACECompliant is IACECompliant, Ownable {
    
    /// @notice Whether ACE enforcement is active
    bool public override aceEnforcementEnabled;
    
    /// @notice The PolicyEngine that evaluates compliance
    IPolicyEngine public override policyEngine;
    
    /// @notice Optional: linked Guardian for security layer
    address public guardian;
    
    constructor(address _policyEngine, address _guardian) Ownable() {
        _transferOwnership(msg.sender);
        if (_policyEngine != address(0)) {
            policyEngine = IPolicyEngine(_policyEngine);
            aceEnforcementEnabled = true;
            emit ACEEnforcementSet(true, _policyEngine);
        }
        guardian = _guardian;
    }
    
    /**
     * @notice Modifier: Only proceed if ACE validation passes (or ACE is disabled)
     * @dev Use this on functions that need compliance checks
     */
    modifier whenACECompliant() {
        _checkACECompliance();
        _;
    }
    
    /**
     * @notice Modifier: Block if ACE would reject this transaction
     * @dev Reverts with ACE reason if blocked
     */
    modifier requireACECompliant() {
        _requireACECompliance();
        _;
    }
    
    /**
     * @notice Internal function to check ACE compliance
     * @return allowed True if transaction passes ACE or ACE is disabled
     * @return reason Reason for blocking (empty if allowed)
     */
    function _checkACECompliance() internal returns (bool allowed, string memory reason) {
        if (!aceEnforcementEnabled || address(policyEngine) == address(0)) {
            return (true, ""); // ACE disabled = allow
        }
        
        // Call PolicyEngine to evaluate this transaction
        (bool shouldBlock, string memory blockReason) = policyEngine.evaluateFromContract(
            msg.sender,
            address(this),
            msg.value,
            msg.data
        );
        
        return (!shouldBlock, blockReason);
    }
    
    /**
     * @notice Internal function that reverts if ACE blocks
     */
    function _requireACECompliance() internal {
        (bool allowed, string memory reason) = _checkACECompliance();
        if (!allowed) {
            revert(string.concat("ACE_BLOCKED: ", reason));
        }
    }
    
    /**
     * @notice Enable or disable ACE enforcement
     */
    function setACEEnforcement(bool enabled) external override onlyOwner {
        require(address(policyEngine) != address(0) || !enabled, "ACE: No policy engine set");
        aceEnforcementEnabled = enabled;
        emit ACEEnforcementSet(enabled, address(policyEngine));
    }
    
    /**
     * @notice Update the PolicyEngine address
     */
    function setPolicyEngine(address newPolicyEngine) external override onlyOwner {
        require(newPolicyEngine != address(0), "ACE: Invalid address");
        policyEngine = IPolicyEngine(newPolicyEngine);
        emit ACEEnforcementSet(aceEnforcementEnabled, newPolicyEngine);
    }
    
    /**
     * @notice Set the Guardian address (for security layer integration)
     */
    function setGuardian(address newGuardian) external onlyOwner {
        guardian = newGuardian;
    }
}
