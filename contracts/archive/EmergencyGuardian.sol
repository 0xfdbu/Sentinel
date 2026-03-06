// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SentinelRegistry.sol";
import "../policies/IPolicyEngine.sol";

/**
 * @title EmergencyGuardian
 * @notice Executes emergency pauses on vulnerable contracts via Confidential Compute
 * @dev Part of the Sentinel autonomous security oracle system
 * @author Sentinel Team
 * @custom:track Chainlink Convergence Hackathon 2026
 */

interface IPausable {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    function owner() external view returns (address);
}

contract EmergencyGuardian is Ownable {
    
    /// @notice Reference to the Sentinel Registry
    SentinelRegistry public registry;
    
    /// @notice Reference to the Policy Engine
    IPolicyEngine public policyEngine;
    
    /// @notice Whether policy validation is required before pause
    bool public policyValidationEnabled;
    
    /// @notice Pause record structure
    struct PauseRecord {
        address pausedContract;
        bytes32 vulnerabilityHash; // Hashed description for privacy
        uint256 pausedAt;
        uint256 expiresAt;
        bool isActive;
        address pausedBy; // Sentinel that triggered the pause
        uint8 severity; // Severity level of the threat
        bool policyValidated; // Whether pause was validated via PolicyEngine
    }
    
    /// @notice Default pause duration (24 hours)
    uint256 public defaultPauseDuration = 24 hours;
    
    /// @notice Maximum pause duration (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
    /// @notice Mapping from contract address to pause record
    mapping(address => PauseRecord) public pauses;
    
    /// @notice List of currently active pauses
    address[] public activePauseList;
    
    /// @notice Mapping for quick lookup in activePauseList
    mapping(address => uint256) private pauseIndex;
    
    /// @notice Historical pause count per contract
    mapping(address => uint256) public pauseHistoryCount;
    
    /// @notice Total pauses executed
    uint256 public totalPausesExecuted;
    
    /// @notice Total pauses lifted
    uint256 public totalPausesLifted;
    
    /// @notice Total policy-validated pauses
    uint256 public totalPolicyValidatedPauses;
    
    /// @notice Events
    event EmergencyPauseTriggered(
        address indexed target, 
        bytes32 indexed vulnHash, 
        uint256 expiresAt,
        address indexed sentinel,
        uint8 severity,
        bool policyValidated
    );
    
    event EmergencyPauseLifted(
        address indexed target, 
        address indexed liftedBy,
        string reason
    );
    
    event PauseDurationUpdated(uint256 newDuration);
    event RegistryUpdated(address newRegistry);
    
    /// @notice Policy Engine events
    event PolicyEngineSet(address indexed policyEngine);
    event PolicyValidationEnabled(bool enabled);
    event PausePolicyValidated(address indexed target, bool shouldPause, uint8 severity);
    event PausePolicyRejected(address indexed target, string reason);
    event PauseBypassed(address indexed target, string reason);
    
    /// @notice Errors
    error ContractNotRegistered();
    error AlreadyPaused();
    error NotPaused();
    error Unauthorized();
    error PauseNotExpired();
    error InvalidDuration();
    error PauseFailed();
    error UnpauseFailed();
    error NotPausableContract();
    error PolicyValidationRequired();
    error PolicyViolationNotSevereEnough(uint8 severity, uint8 threshold);
    error InvalidAddress();
    
    /// @notice Modifiers
    modifier onlySentinel() {
        if (!registry.isAuthorizedSentinel(msg.sender)) revert Unauthorized();
        _;
    }
    
    modifier onlyWhenPaused(address target) {
        if (!pauses[target].isActive) revert NotPaused();
        _;
    }
    
    constructor(address _registry) Ownable() {
        _transferOwnership(msg.sender);
        if (_registry == address(0)) revert InvalidDuration();
        registry = SentinelRegistry(payable(_registry));
        policyValidationEnabled = false; // Disabled by default
    }
    
    /**
     * @notice Execute emergency pause on a vulnerable contract
     * @dev Only callable by authorized Sentinels (CRE workflow via Confidential Compute)
     * @param target Contract address to pause
     * @param vulnerabilityHash SHA256 hash of vulnerability description (for audit trail)
     */
    function emergencyPause(address target, bytes32 vulnerabilityHash) external onlySentinel {
        _executeEmergencyPause(target, vulnerabilityHash, false);
    }
    
    /**
     * @notice Execute emergency pause with policy validation
     * @dev Validates against PolicyEngine before pausing
     * @param target Contract address to pause
     * @param vulnerabilityHash SHA256 hash of vulnerability description
     * @param transactionData Optional transaction data to validate (empty for general threat)
     */
    function emergencyPauseWithValidation(
        address target, 
        bytes32 vulnerabilityHash,
        bytes calldata transactionData
    ) external onlySentinel {
        // Validate against PolicyEngine
        (bool shouldPause, uint8 severity) = _validatePause(target, msg.sender, transactionData);
        
        if (!shouldPause && policyValidationEnabled) {
            revert PolicyViolationNotSevereEnough(severity, policyEngine.pauseThreshold());
        }
        
        _executeEmergencyPause(target, vulnerabilityHash, true, severity);
    }
    
    /**
     * @notice Execute emergency pause bypassing policy validation (owner only)
     * @dev Use only in extreme emergencies when policy engine is unavailable
     * @param target Contract address to pause
     * @param vulnerabilityHash SHA256 hash of vulnerability description
     * @param reason Reason for bypassing policy validation
     */
    function emergencyPauseBypassPolicy(
        address target, 
        bytes32 vulnerabilityHash,
        string calldata reason
    ) external onlyOwner {
        emit PauseBypassed(target, reason);
        _executeEmergencyPause(target, vulnerabilityHash, false);
    }
    
    /**
     * @notice Internal function to execute the pause
     */
    function _executeEmergencyPause(
        address target, 
        bytes32 vulnerabilityHash,
        bool policyValidated
    ) internal {
        _executeEmergencyPause(target, vulnerabilityHash, policyValidated, 0);
    }
    
    /**
     * @notice Internal function to execute the pause with severity
     */
    function _executeEmergencyPause(
        address target, 
        bytes32 vulnerabilityHash,
        bool policyValidated,
        uint8 severity
    ) internal {
        // Validate target is registered
        if (!registry.isRegistered(target)) revert ContractNotRegistered();
        
        // Check not already paused
        if (pauses[target].isActive) revert AlreadyPaused();
        
        // Verify contract is pausable
        try IPausable(target).paused() returns (bool) {
            // Contract has pause functionality
        } catch {
            revert NotPausableContract();
        }
        
        // Execute the pause
        try IPausable(target).pause() {
            // Success
        } catch {
            revert PauseFailed();
        }
        
        // Record the pause
        uint256 expiry = block.timestamp + defaultPauseDuration;
        pauses[target] = PauseRecord({
            pausedContract: target,
            vulnerabilityHash: vulnerabilityHash,
            pausedAt: block.timestamp,
            expiresAt: expiry,
            isActive: true,
            pausedBy: msg.sender,
            severity: severity,
            policyValidated: policyValidated
        });
        
        // Add to active list
        pauseIndex[target] = activePauseList.length;
        activePauseList.push(target);
        
        // Update stats
        pauseHistoryCount[target]++;
        totalPausesExecuted++;
        if (policyValidated) {
            totalPolicyValidatedPauses++;
        }
        
        emit EmergencyPauseTriggered(target, vulnerabilityHash, expiry, msg.sender, severity, policyValidated);
    }
    
    /**
     * @notice Validate pause against PolicyEngine
     */
    function _validatePause(
        address target,
        address sentinel,
        bytes calldata data
    ) internal returns (bool shouldPause, uint8 severity) {
        if (address(policyEngine) == address(0)) {
            return (true, 0); // Allow if no policy engine set
        }
        
        try policyEngine.shouldPauseTransaction(sentinel, target, 0, data) 
            returns (bool _shouldPause, uint8 _severity) {
            
            emit PausePolicyValidated(target, _shouldPause, _severity);
            return (_shouldPause, _severity);
        } catch {
            // If validation fails, allow pause but don't mark as validated
            emit PausePolicyRejected(target, "Policy validation failed");
            return (true, 0);
        }
    }
    
    /**
     * @notice Lift emergency pause from a contract
     * @dev Can be called by: contract owner, guardian owner, or anyone after expiry
     * @param target Contract address to unpause
     */
    function liftPause(address target) external onlyWhenPaused(target) {
        PauseRecord storage record = pauses[target];
        
        // Check authorization
        bool isContractOwner = false;
        try IPausable(target).owner() returns (address contractOwner) {
            isContractOwner = (contractOwner == msg.sender);
        } catch {
            // If owner() doesn't exist, only guardian owner can lift
        }
        
        bool isGuardianOwner = (msg.sender == owner());
        bool isExpired = block.timestamp > record.expiresAt;
        
        if (!isContractOwner && !isGuardianOwner && !isExpired) {
            revert Unauthorized();
        }
        
        // Execute unpause
        try IPausable(target).unpause() {
            // Success
        } catch {
            revert UnpauseFailed();
        }
        
        // Mark as inactive
        record.isActive = false;
        
        // Remove from active list (swap and pop for O(1) removal)
        uint256 index = pauseIndex[target];
        uint256 lastIndex = activePauseList.length - 1;
        
        if (index != lastIndex) {
            address lastContract = activePauseList[lastIndex];
            activePauseList[index] = lastContract;
            pauseIndex[lastContract] = index;
        }
        
        activePauseList.pop();
        delete pauseIndex[target];
        
        totalPausesLifted++;
        
        string memory reason = isContractOwner ? "Contract owner override" : 
                              isGuardianOwner ? "Guardian owner override" : 
                              "Auto-expired";
        
        emit EmergencyPauseLifted(target, msg.sender, reason);
    }
    
    /**
     * @notice Batch lift multiple expired pauses (gas optimization)
     */
    function batchLiftExpiredPauses(address[] calldata targets) external {
        for (uint256 i = 0; i < targets.length; i++) {
            address target = targets[i];
            PauseRecord storage record = pauses[target];
            
            if (record.isActive && block.timestamp > record.expiresAt) {
                try IPausable(target).unpause() {
                    record.isActive = false;
                    emit EmergencyPauseLifted(target, msg.sender, "Batch auto-expired");
                } catch {
                    // Continue with next if this one fails
                }
            }
        }
    }
    
    /**
     * @notice Check if a contract is currently paused by Sentinel
     */
    function isPaused(address target) external view returns (bool) {
        PauseRecord memory record = pauses[target];
        return record.isActive && block.timestamp <= record.expiresAt;
    }
    
    /**
     * @notice Get pause details for a contract
     */
    function getPauseDetails(address target) external view returns (PauseRecord memory) {
        return pauses[target];
    }
    
    /**
     * @notice Get all active pauses
     */
    function getActivePauses() external view returns (address[] memory) {
        return activePauseList;
    }
    
    /**
     * @notice Get active pause count
     */
    function getActivePauseCount() external view returns (uint256) {
        return activePauseList.length;
    }
    
    /**
     * @notice Update default pause duration
     */
    function setPauseDuration(uint256 newDuration) external onlyOwner {
        if (newDuration == 0 || newDuration > MAX_PAUSE_DURATION) revert InvalidDuration();
        defaultPauseDuration = newDuration;
        emit PauseDurationUpdated(newDuration);
    }
    
    /**
     * @notice Update registry reference
     */
    function setRegistry(address newRegistry) external onlyOwner {
        if (newRegistry == address(0)) revert InvalidAddress();
        registry = SentinelRegistry(payable(newRegistry));
        emit RegistryUpdated(newRegistry);
    }
    
    // ============ Policy Engine Integration ============
    
    /**
     * @notice Set the Policy Engine address
     * @param _policyEngine Address of the PolicyEngine contract
     */
    function setPolicyEngine(address _policyEngine) external onlyOwner {
        if (_policyEngine == address(0)) revert InvalidAddress();
        policyEngine = IPolicyEngine(_policyEngine);
        emit PolicyEngineSet(_policyEngine);
    }
    
    /**
     * @notice Enable or disable policy validation for pauses
     * @param enabled Whether to require policy validation before pause
     */
    function setPolicyValidationEnabled(bool enabled) external onlyOwner {
        policyValidationEnabled = enabled;
        emit PolicyValidationEnabled(enabled);
    }
    
    /**
     * @notice Check if a pause should be triggered based on policy evaluation
     * @param from Transaction sender (typically sentinel)
     * @param to Target contract
     * @param data Transaction data
     * @return shouldPause Whether the transaction warrants a pause
     * @return severity The severity level detected
     */
    function shouldPauseViaPolicy(
        address from,
        address to,
        bytes calldata data
    ) external returns (bool shouldPause, uint8 severity) {
        if (address(policyEngine) == address(0)) {
            return (false, 0);
        }
        
        try policyEngine.shouldPauseTransaction(from, to, 0, data) 
            returns (bool _shouldPause, uint8 _severity) {
            return (_shouldPause, _severity);
        } catch {
            return (false, 0);
        }
    }
    
    /**
     * @notice Emergency function to pause contracts that don't implement IPausable
     * @dev This is a last resort for contracts without pause functionality
     */
    function emergencyPauseWithoutInterface(address target, bytes32 vulnerabilityHash) 
        external 
        onlyOwner 
    {
        if (!registry.isRegistered(target)) revert ContractNotRegistered();
        if (pauses[target].isActive) revert AlreadyPaused();
        
        // Record the pause even if contract doesn't support it
        uint256 expiry = block.timestamp + defaultPauseDuration;
        pauses[target] = PauseRecord({
            pausedContract: target,
            vulnerabilityHash: vulnerabilityHash,
            pausedAt: block.timestamp,
            expiresAt: expiry,
            isActive: true,
            pausedBy: msg.sender,
            severity: 0,
            policyValidated: false
        });
        
        pauseIndex[target] = activePauseList.length;
        activePauseList.push(target);
        pauseHistoryCount[target]++;
        totalPausesExecuted++;
        
        emit EmergencyPauseTriggered(target, vulnerabilityHash, expiry, msg.sender, 0, false);
    }
    
    // Allow receiving ETH
    receive() external payable {}
    fallback() external payable {}
}
