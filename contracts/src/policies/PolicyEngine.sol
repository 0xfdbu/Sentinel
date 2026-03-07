// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicy.sol";

/**
 * @title IReceiver
 * @notice Interface for contracts receiving DON-signed reports from Chainlink Forwarder
 */
interface IReceiver {
    /**
     * @notice Called by Chainlink Forwarder to deliver DON-signed report
     * @param metadata Additional metadata about the report (workflow ID, etc.)
     * @param report The ABI-encoded report data
     */
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/**
 * @title PolicyEngine
 * @notice Main ACE (Autonomous Compliance Engine) policy orchestrator with IReceiver support
 * @dev Supports DON-signed blacklist updates via Chainlink CRE workflows
 * 
 * This contract:
 * - Manages multiple compliance policies
 * - Evaluates transactions against all active policies
 * - Aggregates policy results and determines final compliance
 * - Provides policy registration and management
 * - Receives DON-signed blacklist updates via IReceiver interface
 */
contract PolicyEngine is Ownable, AccessControl, IReceiver {
    
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    
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
    
    // Blacklist management
    mapping(address => bool) public blacklisted;
    mapping(bytes32 => bool) public usedReports;
    bytes32 public blacklistMerkleRoot;
    uint256 public blacklistUpdatedAt;
    
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
    event BlacklistUpdated(bytes32 merkleRoot, uint256 addressCount, string reason);
    event AddressBlacklisted(address indexed addr, bytes32 reportHash);
    event AddressUnblacklisted(address indexed addr);
    event ReportReceived(address indexed forwarder, bytes metadata, uint256 timestamp);
    event ReportProcessed(bytes32 indexed reportHash, uint8 instruction);
    
    // Errors
    error PolicyAlreadyRegistered();
    error PolicyNotFound();
    error NotAuthorizedSentinel();
    error InvalidPolicyAddress();
    error InvalidThreshold();
    error InvalidReport();
    error ReportAlreadyUsed(bytes32 reportHash);
    
    modifier onlySentinel() {
        if (!authorizedSentinels[msg.sender]) revert NotAuthorizedSentinel();
        _;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // IReceiver INTERFACE - Chainlink Forwarder Integration
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Called by Chainlink Forwarder to deliver DON-signed report
     * @param metadata Workflow metadata (workflow ID, execution ID, etc.)
     * @param report The ABI-encoded report data
     * @dev The forwarder must have DON_SIGNER_ROLE
     */
    function onReport(bytes calldata metadata, bytes calldata report) external override {
        if (!hasRole(DON_SIGNER_ROLE, msg.sender)) {
            revert InvalidReport();
        }
        
        _processReport(report);
        
        emit ReportReceived(msg.sender, metadata, block.timestamp);
    }
    
    /**
     * @notice Process DON-signed report (can be called directly by authorized signers)
     * @param report ABI-encoded report data
     */
    function writeReport(bytes calldata report) external onlyRole(DON_SIGNER_ROLE) {
        _processReport(report);
    }
    
    /**
     * @notice Internal function to process report data
     * @param report ABI-encoded report containing blacklist updates
     * 
     * Report format for blacklist update:
     * - bytes32 reportHash: Unique report identifier
     * - bytes32 merkleRoot: New Merkle root of blacklist
     * - uint256 addressCount: Number of addresses in blacklist
     * - string reason: Reason for update
     */
    function _processReport(bytes calldata report) internal {
        (
            bytes32 reportHash,
            bytes32 newMerkleRoot,
            uint256 addressCount,
            string memory reason
        ) = abi.decode(report, (bytes32, bytes32, uint256, string));
        
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        // Update blacklist
        blacklistMerkleRoot = newMerkleRoot;
        blacklistUpdatedAt = block.timestamp;
        
        emit BlacklistUpdated(newMerkleRoot, addressCount, reason);
        emit ReportProcessed(reportHash, 1); // Instruction type 1 = blacklist update
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // POLICY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
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
    
    // ═══════════════════════════════════════════════════════════════════════
    // BLACKLIST MANAGEMENT (Manual - for admin use)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Manually blacklist an address
     */
    function blacklistAddress(address addr, bytes32 reportHash) external onlyOwner {
        blacklisted[addr] = true;
        emit AddressBlacklisted(addr, reportHash);
    }
    
    /**
     * @notice Manually unblacklist an address
     */
    function unblacklistAddress(address addr) external onlyOwner {
        blacklisted[addr] = false;
        emit AddressUnblacklisted(addr);
    }
    
    /**
     * @notice Check if an address is blacklisted
     */
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklisted[addr];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // EVALUATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Evaluate a transaction against all active policies
     */
    function evaluateTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes32 txHash
    ) external onlySentinel returns (EvaluationResult memory result) {
        // First check blacklist
        if (blacklisted[from] || blacklisted[to]) {
            result = EvaluationResult({
                compliant: false,
                failedPolicy: "BlacklistPolicy",
                reason: "Address is blacklisted",
                highestSeverity: SEVERITY_CRITICAL,
                evaluatedAt: block.timestamp
            });
            evaluations[txHash] = result;
            emit EvaluationPerformed(txHash, false, SEVERITY_CRITICAL, "Address is blacklisted");
            return result;
        }
        
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
     */
    function shouldPauseTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool shouldPause, uint8 severity) {
        // Check blacklist first
        if (blacklisted[from] || blacklisted[to]) {
            return (true, SEVERITY_CRITICAL);
        }
        
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
                    
                    if (severity >= pauseThreshold) {
                        return (true, severity);
                    }
                }
            } catch {
                if (SEVERITY_HIGH > severity) {
                    severity = SEVERITY_HIGH;
                }
            }
        }
        
        return (severity >= pauseThreshold, severity);
    }
    
    /**
     * @notice Evaluate transaction from an ACE-compliant contract
     */
    function evaluateFromContract(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool shouldBlock, string memory reason) {
        // Check blacklist first
        if (blacklisted[from] || blacklisted[to]) {
            return (true, "Address is blacklisted");
        }
        
        uint8 highestSeverity = SEVERITY_OK;
        
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
                    
                    if (severity == SEVERITY_CRITICAL) {
                        return (true, reason);
                    }
                }
            } catch {
                if (SEVERITY_HIGH > highestSeverity) {
                    highestSeverity = SEVERITY_HIGH;
                    reason = string.concat(info.name, ": Evaluation failed");
                }
            }
        }
        
        shouldBlock = highestSeverity >= SEVERITY_HIGH;
        return (shouldBlock, reason);
    }
    
    /**
     * @notice Quick compliance check for ACE contracts
     */
    function isCompliant(
        address from,
        address to,
        uint256 value
    ) external returns (bool compliant) {
        (bool shouldBlock, ) = this.evaluateFromContract(from, to, value, "");
        return !shouldBlock;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function getAllPolicies() external view returns (PolicyInfo[] memory) {
        return policies;
    }
    
    function getActivePolicyCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < policies.length; i++) {
            if (policies[i].isActive) count++;
        }
        return count;
    }
    
    function getEvaluation(bytes32 txHash) external view returns (EvaluationResult memory) {
        return evaluations[txHash];
    }
    
    function isAuthorizedSentinel(address addr) external view returns (bool) {
        return authorizedSentinels[addr];
    }
    
    function isReportUsed(bytes32 reportHash) external view returns (bool) {
        return usedReports[reportHash];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function _sortPoliciesByPriority() internal {
        uint256 n = policies.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (policies[j].priority < policies[j + 1].priority) {
                    PolicyInfo memory temp = policies[j];
                    policies[j] = policies[j + 1];
                    policies[j + 1] = temp;
                    
                    policyIndex[address(policies[j].policy)] = j + 1;
                    policyIndex[address(policies[j + 1].policy)] = j + 2;
                }
            }
        }
    }
}
