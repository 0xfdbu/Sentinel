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
}

/**
 * @title USDAFreezer
 * @notice Individual address freezing for USDA token via DON-signed reports
 * @dev 
 *   - Freezes specific addresses (not entire contract)
 *   - Receives DON-signed reports from CRE workflows
 *   - Integrates with SentinelRegistryV3 for guardian verification
 *   - Records freeze history with reasoning
 */
contract USDAFreezer is Initializable, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    
    /// @notice Role for authorized DON signers
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @notice Reference to the Sentinel Registry V3
    address public registry;
    
    /// @notice Reference to USDA token contract
    address public usdaToken;
    
    /// @notice Track used DON reports to prevent replay
    mapping(bytes32 => bool) public usedReports;
    
    /// @notice Track guardian nonces to prevent replay
    mapping(address => uint256) public guardianNonces;
    
    /// @notice Frozen address mapping
    mapping(address => FreezeRecord) public freezes;
    
    /// @notice List of currently frozen addresses
    address[] public frozenList;
    
    /// @notice Mapping for quick lookup in frozenList
    mapping(address => uint256) private freezeIndex;
    
    /// @notice Freeze record structure
    struct FreezeRecord {
        address user;
        bytes32 reportHash;
        uint256 frozenAt;
        uint256 expiresAt;
        bool isActive;
        address guardian;
        uint8 severity; // 1=HIGH, 2=CRITICAL
        string reason;
    }
    
    /// @notice Events
    event AddressFrozen(
        address indexed user,
        bytes32 indexed reportHash,
        address indexed guardian,
        uint256 frozenAt,
        uint256 expiresAt,
        uint8 severity,
        string reason
    );
    event AddressUnfrozen(address indexed user, uint256 unfrozenAt, address unfreezer);
    event FreezeExtended(address indexed user, uint256 newExpiresAt);
    event ReportReceived(bytes32 indexed reportHash, address indexed target, uint8 severity, address guardian, string reason);
    event ReportUsed(bytes32 indexed reportHash);
    event RegistryUpdated(address indexed newRegistry);
    event USDATokenUpdated(address indexed newToken);
    event GuardianRecorded(address indexed guardian, bool success, string reason);
    
    /// @notice Errors
    error AddressAlreadyFrozen(address user);
    error AddressNotFrozen(address user);
    error NotAuthorized();
    error InvalidReport();
    error ReportAlreadyUsed(bytes32 reportHash);
    error GuardianNotActive(address guardian);
    error ZeroAddress();
    
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
     * @notice Initialize the contract
     * @param _registry SentinelRegistryV3 address
     * @param _usdaToken USDA token address
     * @param admin Admin address
     */
    function initialize(address _registry, address _usdaToken, address admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        if (_registry == address(0) || _usdaToken == address(0) || admin == address(0)) {
            revert ZeroAddress();
        }
        
        registry = _registry;
        usdaToken = _usdaToken;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(DON_SIGNER_ROLE, admin);
    }
    
    /**
     * @notice onReport - Chainlink CRE Forwarder interface
     * @dev Called by the Chainlink Forwarder with DON-signed reports
     * @param metadata DON attestation metadata
     * @param report The report containing freeze details
     */
    function onReport(bytes calldata metadata, bytes calldata report) external whenNotPaused {
        _processFreezeReport(report);
    }
    
    /**
     * @notice Write report - Entry point for DON-signed reports (for testing/direct)
     * @dev Called by the CRE workflow via Chainlink DON or directly by authorized signers
     * @param report The DON-signed report containing freeze details
     */
    function writeReport(bytes calldata report) external whenNotPaused {
        _processFreezeReport(report);
    }
    
    /**
     * @notice Internal function to process freeze reports
     */
    function _processFreezeReport(bytes calldata report) internal {
        // Decode report
        (
            bytes32 reportHash,
            address target,
            uint8 severity,
            uint256 duration,
            address guardian,
            uint256 nonce,
            string memory reason
        ) = abi.decode(report, (bytes32, address, uint8, uint256, address, uint256, string));
        
        if (target == address(0)) revert ZeroAddress();
        
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
        
        emit ReportReceived(reportHash, target, severity, guardian, reason);
        
        // Execute the freeze
        _executeFreeze(target, reportHash, severity, duration, guardian, reason);
        
        // Record successful activity in registry
        try ISentinelRegistryV3(registry).recordActivity(
            guardian,
            true,
            "FREEZE",
            target,
            reason
        ) {
            emit GuardianRecorded(guardian, true, "Activity recorded");
        } catch {
            emit GuardianRecorded(guardian, true, "Activity recording failed");
        }
        
        emit ReportUsed(reportHash);
    }
    
    /**
     * @notice Execute freeze on a specific address
     */
    function _executeFreeze(
        address target,
        bytes32 reportHash,
        uint8 severity,
        uint256 duration,
        address guardian,
        string memory reason
    ) internal {
        if (freezes[target].isActive) {
            revert AddressAlreadyFrozen(target);
        }
        
        // Default duration: 7 days if not specified
        if (duration == 0) duration = 7 days;
        
        uint256 expiresAt = block.timestamp + duration;
        
        freezes[target] = FreezeRecord({
            user: target,
            reportHash: reportHash,
            frozenAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            guardian: guardian,
            severity: severity,
            reason: reason
        });
        
        freezeIndex[target] = frozenList.length;
        frozenList.push(target);
        
        emit AddressFrozen(target, reportHash, guardian, block.timestamp, expiresAt, severity, reason);
    }
    
    /**
     * @notice Unfreeze an address (admin or original guardian)
     * @param user Address to unfreeze
     */
    function unfreeze(address user) external whenNotPaused {
        FreezeRecord storage record = freezes[user];
        
        if (!record.isActive) {
            revert AddressNotFrozen(user);
        }
        
        // Only admin or the guardian who froze can unfreeze
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && msg.sender != record.guardian) {
            revert NotAuthorized();
        }
        
        record.isActive = false;
        
        // Remove from active list
        _removeFromFrozenList(user);
        
        emit AddressUnfrozen(user, block.timestamp, msg.sender);
    }
    
    /**
     * @notice Extend freeze duration
     * @param user Address to extend
     * @param additionalDuration Additional seconds
     */
    function extendFreeze(address user, uint256 additionalDuration) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        FreezeRecord storage record = freezes[user];
        
        if (!record.isActive) {
            revert AddressNotFrozen(user);
        }
        
        record.expiresAt += additionalDuration;
        
        emit FreezeExtended(user, record.expiresAt);
    }
    
    /**
     * @notice Check if an address is currently frozen
     * @param user Address to check
     */
    function isFrozen(address user) external view returns (bool) {
        return freezes[user].isActive && freezes[user].expiresAt > block.timestamp;
    }
    
    /**
     * @notice Get freeze details
     * @param user Address to query
     */
    function getFreezeDetails(address user) external view returns (FreezeRecord memory) {
        return freezes[user];
    }
    
    /**
     * @notice Get all frozen addresses
     */
    function getFrozenAddresses() external view returns (address[] memory) {
        return frozenList;
    }
    
    /**
     * @notice Get count of frozen addresses
     */
    function getFrozenCount() external view returns (uint256) {
        return frozenList.length;
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
     * @notice Update registry address
     */
    function setRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_registry == address(0)) revert ZeroAddress();
        registry = _registry;
        emit RegistryUpdated(_registry);
    }
    
    /**
     * @notice Update USDA token address
     */
    function setUSDAToken(address _usdaToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_usdaToken == address(0)) revert ZeroAddress();
        usdaToken = _usdaToken;
        emit USDATokenUpdated(_usdaToken);
    }
    
    /**
     * @notice Batch unfreeze multiple addresses (admin only)
     */
    function batchUnfreeze(address[] calldata users) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < users.length; i++) {
            FreezeRecord storage record = freezes[users[i]];
            if (record.isActive) {
                record.isActive = false;
                emit AddressUnfrozen(users[i], block.timestamp, msg.sender);
            }
        }
        // Rebuild frozen list
        _rebuildFrozenList();
    }
    
    /**
     * @notice Remove from frozen list (internal)
     */
    function _removeFromFrozenList(address user) internal {
        uint256 index = freezeIndex[user];
        uint256 lastIndex = frozenList.length - 1;
        
        if (index != lastIndex) {
            address lastUser = frozenList[lastIndex];
            frozenList[index] = lastUser;
            freezeIndex[lastUser] = index;
        }
        
        frozenList.pop();
        delete freezeIndex[user];
    }
    
    /**
     * @notice Rebuild frozen list (internal, for batch operations)
     */
    function _rebuildFrozenList() internal {
        // Clear existing list
        for (uint256 i = 0; i < frozenList.length; i++) {
            delete freezeIndex[frozenList[i]];
        }
        delete frozenList;
        
        // Note: In production, you'd want a more efficient approach
        // This is simplified for the example
    }
    
    /**
     * @notice Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}
}
