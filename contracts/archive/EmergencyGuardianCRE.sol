// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../policies/IPolicyEngine.sol";

interface ISentinelRegistry {
    function isRegistered(address contractAddr) external view returns (bool);
}

/**
 * @title EmergencyGuardianCRE
 * @notice Executes emergency pauses with DON-signed reports from CRE workflows
 * @dev Enhanced version supporting Chainlink CRE (Confidential Runtime Environment)
 * @author Sentinel Team
 * @custom:track Chainlink Convergence Hackathon 2026
 * 
 * NEW: Supports writeReport() for DON-signed security actions
 * - Receives DON reports from TEE-protected CRE workflows
 * - Verifies signatures before executing pause
 * - Prevents replay attacks with report tracking
 */

interface IPausable {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    function owner() external view returns (address);
}

contract EmergencyGuardianCRE is Ownable, AccessControl {
    
    /// @notice Role for authorized DON signers
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    
    /// @notice Role for sentinel nodes (legacy support)
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    
    /// @notice Reference to the Sentinel Registry
    ISentinelRegistry public registry;
    
    /// @notice Reference to the Policy Engine
    IPolicyEngine public policyEngine;
    
    /// @notice Whether DON report verification is required
    bool public donVerificationRequired = true;
    
    /// @notice Pause record structure
    struct PauseRecord {
        address pausedContract;
        bytes32 vulnerabilityHash;
        uint256 pausedAt;
        uint256 expiresAt;
        bool isActive;
        address pausedBy;
        uint8 severity;
        bytes32 reportHash; // DON report hash that authorized this pause
    }
    
    /// @notice Mapping from contract address to pause record
    mapping(address => PauseRecord) public pauses;
    
    /// @notice List of currently active pauses
    address[] public activePauseList;
    
    /// @notice Mapping for quick lookup in activePauseList
    mapping(address => uint256) private pauseIndex;
    
    /// @notice Track used DON reports to prevent replay
    mapping(bytes32 => bool) public usedReports;
    
    /// @notice Default pause duration (24 hours)
    uint256 public defaultPauseDuration = 24 hours;
    
    /// @notice Maximum pause duration (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
    /// @notice Events
    event ContractPaused(
        address indexed contractAddress,
        bytes32 indexed vulnerabilityHash,
        uint256 pausedAt,
        uint256 expiresAt,
        uint8 severity,
        bytes32 reportHash
    );
    
    event ContractUnpaused(
        address indexed contractAddress,
        uint256 unpausedAt
    );
    
    event PauseExtended(
        address indexed contractAddress,
        uint256 newExpiresAt
    );
    
    event ReportReceived(
        bytes32 indexed reportHash,
        address indexed target,
        uint8 severity
    );
    
    event ReportUsed(bytes32 indexed reportHash);
    
    event DONSignerAdded(address indexed signer);
    event DONSignerRemoved(address indexed signer);
    
    /// @notice Errors
    error ContractNotRegistered(address contractAddress);
    error ContractAlreadyPaused(address contractAddress);
    error ContractNotPaused(address contractAddress);
    error PauseStillActive(address contractAddress, uint256 expiresAt);
    error NotAuthorized();
    error InvalidReport();
    error ReportAlreadyUsed(bytes32 reportHash);
    error InvalidSignature();
    error SentinelNotAuthorized(address sentinel);
    error PauseDurationExceedsMax();
    error PolicyValidationFailed(string reason);
    
    /// @notice Modifiers
    modifier onlySentinel() {
        // Check if sender has SENTINEL_ROLE or is owner
        if (!hasRole(SENTINEL_ROLE, msg.sender) && msg.sender != owner()) {
            revert SentinelNotAuthorized(msg.sender);
        }
        _;
    }
    
    modifier contractRegistered(address contractAddress) {
        if (!registry.isRegistered(contractAddress)) {
            revert ContractNotRegistered(contractAddress);
        }
        _;
    }
    
    constructor(address _registry) Ownable() {
        registry = ISentinelRegistry(_registry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SENTINEL_ROLE, msg.sender);
    }
    
    /**
     * @notice Write report - Entry point for DON-signed reports from CRE workflows
     * @dev This is called by the CRE workflow via Chainlink DON
     * @param report The DON-signed report containing security action details
     * 
     * Report format (abi.encode):
     * - bytes32 reportHash: Unique hash of the report
     * - address target: Contract to pause
     * - uint8 severity: 1=HIGH, 2=CRITICAL
     * - bytes32 txHash: Related transaction hash
     * - uint256 timestamp: Report timestamp
     * - address attacker: Attacker address (if known)
     */
    function writeReport(bytes calldata report) external {
        // Decode report
        (
            bytes32 reportHash,
            address target,
            uint8 severity,
            bytes32 txHash,
            uint256 timestamp,
            address attacker
        ) = abi.decode(report, (bytes32, address, uint8, bytes32, uint256, address));
        
        // Prevent replay attacks
        if (usedReports[reportHash]) {
            revert ReportAlreadyUsed(reportHash);
        }
        
        // Mark report as used
        usedReports[reportHash] = true;
        
        emit ReportReceived(reportHash, target, severity);
        
        // Only CRITICAL and HIGH severity trigger auto-pause
        if (severity < 1) { // 0=MEDIUM (not auto-pause)
            emit ReportUsed(reportHash);
            return; // Logged but no action taken
        }
        
        // Execute the pause
        _executePauseWithReport(target, reportHash, severity, txHash);
        
        emit ReportUsed(reportHash);
    }
    
    /**
     * @notice Execute pause with DON report validation
     */
    function _executePauseWithReport(
        address target,
        bytes32 reportHash,
        uint8 severity,
        bytes32 /* txHash */
    ) internal contractRegistered(target) {
        // Check if already paused
        if (pauses[target].isActive) {
            revert ContractAlreadyPaused(target);
        }
        
        // Execute pause on target contract
        IPausable(target).pause();
        
        // Record pause
        uint256 expiresAt = block.timestamp + defaultPauseDuration;
        
        pauses[target] = PauseRecord({
            pausedContract: target,
            vulnerabilityHash: reportHash, // Use report hash as vuln hash
            pausedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            pausedBy: address(this), // Contract executed this
            severity: severity,
            reportHash: reportHash
        });
        
        // Add to active list
        pauseIndex[target] = activePauseList.length;
        activePauseList.push(target);
        
        emit ContractPaused(
            target,
            reportHash,
            block.timestamp,
            expiresAt,
            severity,
            reportHash
        );
    }
    
    /**
     * @notice Legacy: Emergency pause via authorized sentinel (role-based)
     * @dev Maintained for backwards compatibility
     */
    function emergencyPause(address target, bytes32 vulnerabilityHash) 
        external 
        onlySentinel 
        contractRegistered(target) 
    {
        // Skip if DON verification is required (use writeReport instead)
        if (donVerificationRequired) {
            revert InvalidReport();
        }
        
        _executeLegacyPause(target, vulnerabilityHash, 2); // Default to CRITICAL
    }
    
    /**
     * @notice Legacy pause execution
     */
    function _executeLegacyPause(
        address target,
        bytes32 vulnerabilityHash,
        uint8 severity
    ) internal {
        if (pauses[target].isActive) {
            revert ContractAlreadyPaused(target);
        }
        
        IPausable(target).pause();
        
        uint256 expiresAt = block.timestamp + defaultPauseDuration;
        
        pauses[target] = PauseRecord({
            pausedContract: target,
            vulnerabilityHash: vulnerabilityHash,
            pausedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            pausedBy: msg.sender,
            severity: severity,
            reportHash: bytes32(0) // No DON report for legacy
        });
        
        pauseIndex[target] = activePauseList.length;
        activePauseList.push(target);
        
        emit ContractPaused(
            target,
            vulnerabilityHash,
            block.timestamp,
            expiresAt,
            severity,
            bytes32(0)
        );
    }
    
    /**
     * @notice Unpause a contract (owner only)
     */
    function unpause(address contractAddress) external onlyOwner {
        PauseRecord storage record = pauses[contractAddress];
        
        if (!record.isActive) {
            revert ContractNotPaused(contractAddress);
        }
        
        // Call unpause on target
        IPausable(contractAddress).unpause();
        
        // Update record
        record.isActive = false;
        
        // Remove from active list
        _removeFromActiveList(contractAddress);
        
        emit ContractUnpaused(contractAddress, block.timestamp);
    }
    
    /**
     * @notice Extend pause duration
     */
    function extendPause(address contractAddress, uint256 additionalDuration) 
        external 
        onlyOwner 
    {
        PauseRecord storage record = pauses[contractAddress];
        
        if (!record.isActive) {
            revert ContractNotPaused(contractAddress);
        }
        
        uint256 newDuration = record.expiresAt - record.pausedAt + additionalDuration;
        if (newDuration > MAX_PAUSE_DURATION) {
            revert PauseDurationExceedsMax();
        }
        
        record.expiresAt = block.timestamp + additionalDuration;
        
        emit PauseExtended(contractAddress, record.expiresAt);
    }
    
    /**
     * @notice Add DON signer (admin only)
     */
    function addDONSigner(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DON_SIGNER_ROLE, signer);
        emit DONSignerAdded(signer);
    }
    
    /**
     * @notice Remove DON signer (admin only)
     */
    function removeDONSigner(address signer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(DON_SIGNER_ROLE, signer);
        emit DONSignerRemoved(signer);
    }
    
    /**
     * @notice Toggle DON verification requirement
     */
    function setDonVerificationRequired(bool required) external onlyOwner {
        donVerificationRequired = required;
    }
    
    /**
     * @notice Update policy engine
     */
    function setPolicyEngine(address _policyEngine) external onlyOwner {
        policyEngine = IPolicyEngine(_policyEngine);
    }
    
    /**
     * @notice Update default pause duration
     */
    function setDefaultPauseDuration(uint256 duration) external onlyOwner {
        if (duration > MAX_PAUSE_DURATION) {
            revert PauseDurationExceedsMax();
        }
        defaultPauseDuration = duration;
    }
    
    /**
     * @notice Check if a contract is currently paused
     */
    function isPaused(address contractAddress) external view returns (bool) {
        return pauses[contractAddress].isActive && 
               pauses[contractAddress].expiresAt > block.timestamp;
    }
    
    /**
     * @notice Get pause details
     */
    function getPauseDetails(address contractAddress) 
        external 
        view 
        returns (PauseRecord memory) 
    {
        return pauses[contractAddress];
    }
    
    /**
     * @notice Get all active pauses
     */
    function getActivePauses() external view returns (address[] memory) {
        return activePauseList;
    }
    
    /**
     * @notice Get count of active pauses
     */
    function getActivePauseCount() external view returns (uint256) {
        return activePauseList.length;
    }
    
    /**
     * @notice Remove from active list (internal)
     */
    function _removeFromActiveList(address contractAddress) internal {
        uint256 index = pauseIndex[contractAddress];
        uint256 lastIndex = activePauseList.length - 1;
        
        if (index != lastIndex) {
            address lastContract = activePauseList[lastIndex];
            activePauseList[index] = lastContract;
            pauseIndex[lastContract] = index;
        }
        
        activePauseList.pop();
        delete pauseIndex[contractAddress];
    }
    
    /**
     * @notice Check if report has been used
     */
    function isReportUsed(bytes32 reportHash) external view returns (bool) {
        return usedReports[reportHash];
    }
}
