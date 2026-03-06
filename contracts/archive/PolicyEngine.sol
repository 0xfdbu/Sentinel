// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPolicy.sol";

/**
 * @title PolicyEngine
 * @notice Main ACE (Autonomous Compliance Engine) policy orchestrator
 * @dev Similar to Chainlink CRE stablecoin-ace-ccip PolicyEngine
 * 
 * This contract:
 * - Manages multiple compliance policies
 * - Evaluates transactions against all active policies
 * - Aggregates policy results and determines final compliance
 * - Provides policy registration and management
 */
contract PolicyEngine is Ownable {
    
    // Policy structure
    struct PolicyInfo {
        IPolicy policy;
        uint256 priority; // Higher = evaluated first
        bool isActive;
        string name;
    }
    
    // Registered policies
    PolicyInfo[] public policies;
    mapping(address => uint256) public policyIndex;
    
    // Sentinel nodes authorized to evaluate policies
    mapping(address => bool) public authorizedSentinels;
    
    // Evaluation result structure
    struct EvaluationResult {
        bool compliant;
        string failedPolicy;
        string reason;
        uint8 highestSeverity;
        uint256 evaluatedAt;
    }
    
    // Evaluation history (for audit)
    mapping(bytes32 => EvaluationResult) public evaluations;
    
    // Pause thresholds
    uint8 public constant SEVERITY_OK = 0;
    uint8 public constant SEVERITY_LOW = 1;
    uint8 public constant SEVERITY_MEDIUM = 2;
    uint8 public constant SEVERITY_HIGH = 3;
    uint8 public constant SEVERITY_CRITICAL = 4;
    
    uint8 public pauseThreshold = SEVERITY_HIGH; // Pause if severity >= this
    
    // Events
    event PolicyAdded(address indexed policy, string name, uint256 priority);
    event PolicyRemoved(address indexed policy);
    event PolicyStatusChanged(address indexed policy, bool active);
    event PolicyPriorityUpdated(address indexed policy, uint256 newPriority);
    event SentinelAuthorized(address indexed sentinel);
    event SentinelRevoked(address indexed sentinel);
    event EvaluationPerformed(
        bytes32 indexed txHash,
        bool compliant,
        uint8 severity,
        string reason
    );
    event PauseThresholdUpdated(uint8 newThreshold);
    
    // Errors
    error PolicyAlreadyRegistered();
    error PolicyNotFound();
    error NotAuthorizedSentinel();
    error InvalidPolicyAddress();
    error InvalidThreshold();
    
    modifier onlySentinel() {
        if (!authorizedSentinels[msg.sender]) revert NotAuthorizedSentinel();
        _;
    }
    
    constructor() Ownable() {
        _transferOwnership(msg.sender);
    }
    
    /**
     * @notice Add a new policy to the engine
     * @param policy Address of the policy contract
     * @param priority Priority level (higher = evaluated first)
     */
    function addPolicy(address policy, uint256 priority) external onlyOwner {
        if (policy == address(0)) revert InvalidPolicyAddress();
        if (policyIndex[policy] != 0) revert PolicyAlreadyRegistered();
        
        IPolicy policyContract = IPolicy(policy);
        
        PolicyInfo memory info = PolicyInfo({
            policy: policyContract,
            priority: priority,
            isActive: policyContract.isActive(),
            name: policyContract.name()
        });
        
        policies.push(info);
        policyIndex[policy] = policies.length;
        
        // Re-sort by priority
        _sortPoliciesByPriority();
        
        emit PolicyAdded(policy, info.name, priority);
    }
    
    /**
     * @notice Remove a policy from the engine
     * @param policy Address of the policy to remove
     */
    function removePolicy(address policy) external onlyOwner {
        uint256 index = policyIndex[policy];
        if (index == 0) revert PolicyNotFound();
        
        uint256 arrayIndex = index - 1;
        uint256 lastIndex = policies.length - 1;
        
        // Swap and pop
        if (arrayIndex != lastIndex) {
            PolicyInfo memory lastPolicy = policies[lastIndex];
            policies[arrayIndex] = lastPolicy;
            policyIndex[address(lastPolicy.policy)] = index;
        }
        
        policies.pop();
        delete policyIndex[policy];
        
        emit PolicyRemoved(policy);
    }
    
    /**
     * @notice Set policy active/inactive
     */
    function setPolicyStatus(address policy, bool active) external onlyOwner {
        uint256 index = policyIndex[policy];
        if (index == 0) revert PolicyNotFound();
        
        policies[index - 1].isActive = active;
        emit PolicyStatusChanged(policy, active);
    }
    
    /**
     * @notice Update policy priority
     */
    function setPolicyPriority(address policy, uint256 newPriority) external onlyOwner {
        uint256 index = policyIndex[policy];
        if (index == 0) revert PolicyNotFound();
        
        policies[index - 1].priority = newPriority;
        _sortPoliciesByPriority();
        
        emit PolicyPriorityUpdated(policy, newPriority);
    }
    
    /**
     * @notice Authorize a sentinel node to evaluate policies
     */
    function authorizeSentinel(address sentinel) external onlyOwner {
        authorizedSentinels[sentinel] = true;
        emit SentinelAuthorized(sentinel);
    }
    
    /**
     * @notice Revoke sentinel authorization
     */
    function revokeSentinel(address sentinel) external onlyOwner {
        authorizedSentinels[sentinel] = false;
        emit SentinelRevoked(sentinel);
    }
    
    /**
     * @notice Set pause threshold (severity level that triggers pause)
     * @param threshold 0-4 (OK, LOW, MEDIUM, HIGH, CRITICAL)
     */
    function setPauseThreshold(uint8 threshold) external onlyOwner {
        if (threshold > SEVERITY_CRITICAL) revert InvalidThreshold();
        pauseThreshold = threshold;
        emit PauseThresholdUpdated(threshold);
    }
    
    /**
     * @notice Evaluate a transaction against all active policies
     * @param from Transaction sender
     * @param to Transaction recipient
     * @param value Transaction value
     * @param data Transaction calldata
     * @param txHash Transaction hash for audit
     * @return result Evaluation result with compliance status
     */
    function evaluateTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes32 txHash
    ) external onlySentinel returns (EvaluationResult memory result) {
        bool compliant = true;
        string memory failedPolicy = "";
        string memory reason = "";
        uint8 highestSeverity = SEVERITY_OK;
        
        // Evaluate against all active policies
        for (uint256 i = 0; i < policies.length; i++) {
            PolicyInfo storage info = policies[i];
            
            if (!info.isActive) continue;
            
            try info.policy.evaluate(from, to, value, data) returns (
                bool policyCompliant,
                string memory policyReason,
                uint8 severity
            ) {
                if (!policyCompliant) {
                    compliant = false;
                    failedPolicy = info.name;
                    reason = policyReason;
                    
                    if (severity > highestSeverity) {
                        highestSeverity = severity;
                    }
                    
                    // Early exit on critical violation
                    if (severity == SEVERITY_CRITICAL) {
                        break;
                    }
                }
            } catch {
                // Policy evaluation failed - treat as non-compliant for safety
                compliant = false;
                failedPolicy = info.name;
                reason = "Policy evaluation failed";
                highestSeverity = SEVERITY_HIGH;
            }
        }
        
        result = EvaluationResult({
            compliant: compliant,
            failedPolicy: failedPolicy,
            reason: reason,
            highestSeverity: highestSeverity,
            evaluatedAt: block.timestamp
        });
        
        evaluations[txHash] = result;
        
        emit EvaluationPerformed(txHash, compliant, highestSeverity, reason);
        
        return result;
    }
    
    /**
     * @notice Quick check if a transaction should be paused
     * @return shouldPause True if severity >= pauseThreshold
     * @return severity The highest severity found
     */
    function shouldPauseTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool shouldPause, uint8 severity) {
        for (uint256 i = 0; i < policies.length; i++) {
            PolicyInfo storage info = policies[i];
            
            if (!info.isActive) continue;
            
            try info.policy.evaluate(from, to, value, data) returns (
                bool policyCompliant,
                string memory,
                uint8 policySeverity
            ) {
                if (!policyCompliant && policySeverity > severity) {
                    severity = policySeverity;
                    
                    // Early exit if we've hit the threshold
                    if (severity >= pauseThreshold) {
                        return (true, severity);
                    }
                }
            } catch {
                // Policy failed - assume HIGH severity
                if (SEVERITY_HIGH > severity) {
                    severity = SEVERITY_HIGH;
                }
            }
        }
        
        return (severity >= pauseThreshold, severity);
    }
    
    /**
     * @notice Get all registered policies
     */
    function getAllPolicies() external view returns (PolicyInfo[] memory) {
        return policies;
    }
    
    /**
     * @notice Get active policies count
     */
    function getActivePolicyCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < policies.length; i++) {
            if (policies[i].isActive) count++;
        }
        return count;
    }
    
    /**
     * @notice Get evaluation result for a transaction
     */
    function getEvaluation(bytes32 txHash) external view returns (EvaluationResult memory) {
        return evaluations[txHash];
    }
    
    /**
     * @notice Check if an address is authorized sentinel
     */
    function isAuthorizedSentinel(address addr) external view returns (bool) {
        return authorizedSentinels[addr];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ACE COMPLIANT CONTRACT INTERFACE
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Evaluate transaction from an ACE-compliant contract
     * @dev Called by contracts inheriting from ACECompliant to check compliance
     * @param from Transaction sender (tx.origin or msg.sender from calling contract)
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
    ) external returns (bool shouldBlock, string memory reason) {
        uint8 highestSeverity = SEVERITY_OK;
        
        // Evaluate against all active policies
        for (uint256 i = 0; i < policies.length; i++) {
            PolicyInfo storage info = policies[i];
            
            if (!info.isActive) continue;
            
            try info.policy.evaluate(from, to, value, data) returns (
                bool policyCompliant,
                string memory policyReason,
                uint8 severity
            ) {
                if (!policyCompliant) {
                    if (severity > highestSeverity) {
                        highestSeverity = severity;
                        reason = string.concat(info.name, ": ", policyReason);
                    }
                    
                    // Early exit on critical violation
                    if (severity == SEVERITY_CRITICAL) {
                        return (true, reason);
                    }
                }
            } catch {
                // Policy evaluation failed - treat as violation
                if (SEVERITY_HIGH > highestSeverity) {
                    highestSeverity = SEVERITY_HIGH;
                    reason = string.concat(info.name, ": Evaluation failed");
                }
            }
        }
        
        // Block if severity is HIGH or above
        shouldBlock = highestSeverity >= SEVERITY_HIGH;
        return (shouldBlock, reason);
    }
    
    /**
     * @notice Quick compliance check for ACE contracts (lighter version)
     * @param from Transaction sender
     * @param to The ACE-compliant contract
     * @param value Transaction value
     * @return compliant True if passes all policies
     */
    function isCompliant(
        address from,
        address to,
        uint256 value
    ) external returns (bool compliant) {
        (bool shouldBlock, ) = this.evaluateFromContract(from, to, value, "");
        return !shouldBlock;
    }
    
    /**
     * @notice Sort policies by priority (highest first) using simple bubble sort
     */
    function _sortPoliciesByPriority() internal {
        uint256 n = policies.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (policies[j].priority < policies[j + 1].priority) {
                    // Swap
                    PolicyInfo memory temp = policies[j];
                    policies[j] = policies[j + 1];
                    policies[j + 1] = temp;
                    
                    // Update indices
                    policyIndex[address(policies[j].policy)] = j + 1;
                    policyIndex[address(policies[j + 1].policy)] = j + 2;
                }
            }
        }
    }
}
