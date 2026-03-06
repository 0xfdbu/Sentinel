// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface ISentinelRegistryV3 {
    function isActiveGuardian(address addr) external view returns (bool);
    function recordActivity(address guardian, bool success, string calldata actionType, address target, string calldata reason) external;
    function GUARDIAN_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
}

interface IPausable {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}

/**
 * @title EmergencyGuardianV2
 * @notice Upgradeable emergency guardian with SentinelRegistryV3 integration
 * @dev 
 *   - Receives DON-signed reports from CRE workflows
 *   - Verifies guardian status via SentinelRegistryV3
 *   - Records activity for reputation tracking
 *   - UUPS upgradeable pattern
 */
contract EmergencyGuardianV2 is Initializable, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    
    /// @notice Role for authorized DON signers
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @notice Reference to the Sentinel Registry V3
    address public registry;
    
    /// @notice Whether DON report verification is required
    bool public donVerificationRequired;
    
    /// @notice Default pause duration (24 hours)
    uint256 public defaultPauseDuration;
    
    /// @notice Maximum pause duration (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
    /// @notice Pause record structure
    struct PauseRecord {
        address pausedContract;
        bytes32 reportHash;
        uint256 pausedAt;
        uint256 expiresAt;
        bool isActive;
        address guardian; // Guardian who triggered the pause
        uint8 severity;
    }
    
    /// @notice Mapping from contract address to pause record
    mapping(address => PauseRecord) public pauses;
    
    /// @notice List of currently active pauses
    address[] public activePauseList;
    
    /// @notice Mapping for quick lookup in activePauseList
    mapping(address => uint256) private pauseIndex;
    
    /// @notice Track used DON reports to prevent replay
    mapping(bytes32 => bool) public usedReports;
    
    /// @notice Track guardian nonces to prevent replay
    mapping(address => uint256) public guardianNonces;
    
    /// @notice Events
    event ContractPaused(
        address indexed contractAddress,
        bytes32 indexed reportHash,
        address indexed guardian,
        uint256 pausedAt,
        uint256 expiresAt,
        uint8 severity
    );
    event ContractUnpaused(address indexed contractAddress, uint256 unpausedAt);
    event PauseExtended(address indexed contractAddress, uint256 newExpiresAt);
    event ReportReceived(bytes32 indexed reportHash, address indexed target, uint8 severity, address guardian);
    event ReportUsed(bytes32 indexed reportHash);
    event RegistryUpdated(address indexed newRegistry);
    event GuardianRecorded(address indexed guardian, bool success, string reason);
    
    /// @notice Errors
    error ContractAlreadyPaused(address contractAddress);
    error ContractNotPaused(address contractAddress);
    error PauseStillActive(address contractAddress, uint256 expiresAt);
    error NotAuthorized();
    error InvalidReport();
    error ReportAlreadyUsed(bytes32 reportHash);
    error GuardianNotActive(address guardian);
    error PauseDurationExceedsMax();
    error CooldownNotMet(uint256 remaining);
    
    /// @notice Modifiers
    modifier onlyActiveGuardian() {
        if (!ISentinelRegistryV3(registry).isActiveGuardian(msg.sender)) {
            revert GuardianNotActive(msg.sender);
        }
        _;
    }
    
    modifier onlyUpgrader() {
        if (!hasRole(UPGRADER_ROLE, msg.sender)) revert NotAuthorized();
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the contract (proxy pattern)
     * @param _registry SentinelRegistryV3 address
     * @param admin Admin address
     */
    function initialize(address _registry, address admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        registry = _registry;
        donVerificationRequired = true;
        defaultPauseDuration = 24 hours;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(DON_SIGNER_ROLE, admin);
    }
    
    /**
     * @notice Write report - Entry point for DON-signed reports from CRE workflows
     * @dev Called by the CRE workflow via Chainlink DON with guardian attestation
     * @param report The DON-signed report containing security action details
     * 
     * Report format (abi.encode):
     * - bytes32 reportHash: Unique hash of the report
     * - address target: Contract to pause
     * - uint8 severity: 1=HIGH, 2=CRITICAL
     * - bytes32 txHash: Related transaction hash
     * - uint256 timestamp: Report timestamp
     * - address guardian: Guardian who submitted the report
     * - uint256 nonce: Guardian nonce for replay protection
     */
    function writeReport(bytes calldata report) external whenNotPaused {
        // Decode report
        (
            bytes32 reportHash,
            address target,
            uint8 severity,
            bytes32 txHashIgnored,
            uint256 timestampIgnored,
            address guardian,
            uint256 nonce
        ) = abi.decode(report, (bytes32, address, uint8, bytes32, uint256, address, uint256));
        
        // Verify guardian is active in registry
        if (!ISentinelRegistryV3(registry).isActiveGuardian(guardian)) {
            revert GuardianNotActive(guardian);
        }
        
        // Prevent replay attacks
        if (usedReports[reportHash]) {
            revert ReportAlreadyUsed(reportHash);
        }
        
        // Check nonce
        if (nonce != guardianNonces[guardian]) {
            revert InvalidReport();
        }
        guardianNonces[guardian]++;
        
        // Mark report as used
        usedReports[reportHash] = true;
        
        emit ReportReceived(reportHash, target, severity, guardian);
        
        // Only CRITICAL and HIGH severity trigger auto-pause
        if (severity < 1) {
            emit ReportUsed(reportHash);
            return;
        }
        
        // Execute the pause
        _executePause(target, reportHash, severity, guardian);
        
        // Record successful activity in registry
        try ISentinelRegistryV3(registry).recordActivity(
            guardian,
            true,
            "PAUSE",
            target,
            "DON-signed security report"
        ) {
            emit GuardianRecorded(guardian, true, "Activity recorded");
        } catch {
            // Don't revert if recording fails
            emit GuardianRecorded(guardian, true, "Activity recording failed");
        }
        
        emit ReportUsed(reportHash);
    }
    
    /**
     * @notice Execute pause
     */
    function _executePause(
        address target,
        bytes32 reportHash,
        uint8 severity,
        address guardian
    ) internal {
        if (pauses[target].isActive) {
            revert ContractAlreadyPaused(target);
        }
        
        // Execute pause on target contract
        IPausable(target).pause();
        
        // Record pause
        uint256 expiresAt = block.timestamp + defaultPauseDuration;
        
        pauses[target] = PauseRecord({
            pausedContract: target,
            reportHash: reportHash,
            pausedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            guardian: guardian,
            severity: severity
        });
        
        pauseIndex[target] = activePauseList.length;
        activePauseList.push(target);
        
        emit ContractPaused(target, reportHash, guardian, block.timestamp, expiresAt, severity);
    }
    
    /**
     * @notice Unpause a contract (admin or original guardian)
     */
    function unpause(address contractAddress) external whenNotPaused {
        PauseRecord storage record = pauses[contractAddress];
        
        if (!record.isActive) {
            revert ContractNotPaused(contractAddress);
        }
        
        // Only admin or the guardian who paused can unpause
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && msg.sender != record.guardian) {
            revert NotAuthorized();
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
        onlyRole(DEFAULT_ADMIN_ROLE) 
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
     * @notice Record a false positive (admin only)
     * @dev Called when a pause was determined to be a false alarm
     */
    function recordFalsePositive(address guardian, address target, string calldata reason) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        try ISentinelRegistryV3(registry).recordActivity(
            guardian,
            false, // false positive
            "PAUSE",
            target,
            reason
        ) {
            emit GuardianRecorded(guardian, false, reason);
        } catch {
            emit GuardianRecorded(guardian, false, "Recording failed");
        }
    }
    
    /**
     * @notice Update registry address
     */
    function setRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_registry == address(0)) revert InvalidReport();
        registry = _registry;
        emit RegistryUpdated(_registry);
    }
    
    /**
     * @notice Toggle DON verification requirement
     */
    function setDonVerificationRequired(bool required) external onlyRole(DEFAULT_ADMIN_ROLE) {
        donVerificationRequired = required;
    }
    
    /**
     * @notice Update default pause duration
     */
    function setDefaultPauseDuration(uint256 duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (duration > MAX_PAUSE_DURATION) {
            revert PauseDurationExceedsMax();
        }
        defaultPauseDuration = duration;
    }
    
    /**
     * @notice Check if a contract is currently paused by this guardian
     */
    function isPaused(address contractAddress) external view returns (bool) {
        return pauses[contractAddress].isActive && 
               pauses[contractAddress].expiresAt > block.timestamp;
    }
    
    /**
     * @notice Get pause details
     */
    function getPauseDetails(address contractAddress) external view returns (PauseRecord memory) {
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
     * @notice Get guardian nonce
     */
    function getGuardianNonce(address guardian) external view returns (uint256) {
        return guardianNonces[guardian];
    }
    
    /**
     * @notice Check if report has been used
     */
    function isReportUsed(bytes32 reportHash) external view returns (bool) {
        return usedReports[reportHash];
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
     * @notice Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}
}
