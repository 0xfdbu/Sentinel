// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title SentinelRegistryV2
 * @notice Registry for Sentinel Guardian nodes with RBAC
 * @dev 
 *   - Manages authorized Sentinel nodes
 *   - Tracks Sentinel performance metrics
 *   - Coordinates multi-sentinel consensus (optional)
 *   - Integrates with PolicyEngine for ACE enforcement
 */
contract SentinelRegistryV2 is AccessControl, Pausable {
    using Address for address;
    
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE"); // Primary sentinel
    
    // ============ Structs ============
    struct SentinelInfo {
        address sentinel;
        string name;
        uint256 registeredAt;
        uint256 lastActivity;
        uint256 actionsTaken;
        bool isActive;
        uint256 reputation; // 0-10000 (100.00%)
    }
    
    struct EmergencyAction {
        address sentinel;
        string actionType;
        address target;
        uint256 timestamp;
        string reason;
        bool executed;
    }
    
    // ============ State Variables ============
    // Sentinel tracking
    mapping(address => SentinelInfo) public sentinels;
    address[] public sentinelList;
    
    // Emergency action history
    EmergencyAction[] public emergencyActions;
    mapping(bytes32 => bool) public actionExecuted;
    
    // Policy targets
    address public policyEngine;
    address public volumePolicy;
    address public blacklistPolicy;
    address public usdaToken;
    
    // Consensus settings
    uint256 public minSentinelsForConsensus = 1; // Set to 1 for single sentinel, 2+ for multi
    uint256 public actionCooldown = 5 minutes; // Cooldown between actions
    mapping(address => uint256) public lastActionTime;
    
    // ============ Events ============
    event SentinelRegistered(address indexed sentinel, string name, address indexed registrar);
    event SentinelActivated(address indexed sentinel);
    event SentinelDeactivated(address indexed sentinel);
    event EmergencyPauseTriggered(address indexed sentinel, address indexed target, string reason);
    event EmergencyUnpauseTriggered(address indexed sentinel, address indexed target, string reason);
    event PolicyAdjusted(address indexed sentinel, address indexed policy, string adjustmentType);
    event ReputationUpdated(address indexed sentinel, uint256 newReputation);
    event PolicyTargetsUpdated(address policyEngine, address volumePolicy, address blacklistPolicy, address usdaToken);
    
    // ============ Errors ============
    error SentinelAlreadyRegistered();
    error SentinelNotRegistered();
    error SentinelNotActive();
    error CooldownNotMet(uint256 remaining);
    error UnauthorizedAction();
    error InvalidTarget();
    error PolicyAdjustmentFailed();
    
    // ============ Modifiers ============
    modifier onlySentinel() {
        if (!hasRole(SENTINEL_ROLE, msg.sender)) revert UnauthorizedAction();
        _;
    }
    
    modifier onlyGuardian() {
        if (!hasRole(GUARDIAN_ROLE, msg.sender)) revert UnauthorizedAction();
        _;
    }
    
    modifier cooldownMet() {
        uint256 timeSinceLastAction = block.timestamp - lastActionTime[msg.sender];
        if (timeSinceLastAction < actionCooldown) {
            revert CooldownNotMet(actionCooldown - timeSinceLastAction);
        }
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address admin,
        address initialGuardian,
        address _policyEngine,
        address _volumePolicy,
        address _blacklistPolicy,
        address _usdaToken
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        
        // Set initial guardian
        _grantRole(SENTINEL_ROLE, initialGuardian);
        _grantRole(GUARDIAN_ROLE, initialGuardian);
        
        // Register initial guardian
        sentinels[initialGuardian] = SentinelInfo({
            sentinel: initialGuardian,
            name: "Primary Guardian",
            registeredAt: block.timestamp,
            lastActivity: block.timestamp,
            actionsTaken: 0,
            isActive: true,
            reputation: 10000
        });
        sentinelList.push(initialGuardian);
        
        // Set policy targets
        policyEngine = _policyEngine;
        volumePolicy = _volumePolicy;
        blacklistPolicy = _blacklistPolicy;
        usdaToken = _usdaToken;
        
        emit SentinelRegistered(initialGuardian, "Primary Guardian", admin);
        emit PolicyTargetsUpdated(_policyEngine, _volumePolicy, _blacklistPolicy, _usdaToken);
    }
    
    // ============ Sentinel Management ============
    
    /**
     * @notice Register a new sentinel node
     * @param sentinel Address of the sentinel
     * @param name Human-readable name
     */
    function registerSentinel(address sentinel, string calldata name) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (sentinels[sentinel].registeredAt != 0) revert SentinelAlreadyRegistered();
        
        _grantRole(SENTINEL_ROLE, sentinel);
        
        sentinels[sentinel] = SentinelInfo({
            sentinel: sentinel,
            name: name,
            registeredAt: block.timestamp,
            lastActivity: block.timestamp,
            actionsTaken: 0,
            isActive: true,
            reputation: 5000 // Start with 50% reputation
        });
        sentinelList.push(sentinel);
        
        emit SentinelRegistered(sentinel, name, msg.sender);
    }
    
    /**
     * @notice Activate a deactivated sentinel
     */
    function activateSentinel(address sentinel) external onlyRole(ADMIN_ROLE) {
        if (sentinels[sentinel].registeredAt == 0) revert SentinelNotRegistered();
        
        sentinels[sentinel].isActive = true;
        _grantRole(SENTINEL_ROLE, sentinel);
        
        emit SentinelActivated(sentinel);
    }
    
    /**
     * @notice Deactivate a sentinel (emergency)
     */
    function deactivateSentinel(address sentinel) external onlyRole(ADMIN_ROLE) {
        if (sentinels[sentinel].registeredAt == 0) revert SentinelNotRegistered();
        
        sentinels[sentinel].isActive = false;
        _revokeRole(SENTINEL_ROLE, sentinel);
        
        emit SentinelDeactivated(sentinel);
    }
    
    /**
     * @notice Update sentinel reputation
     */
    function updateReputation(address sentinel, uint256 newReputation) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (sentinels[sentinel].registeredAt == 0) revert SentinelNotRegistered();
        if (newReputation > 10000) newReputation = 10000;
        
        sentinels[sentinel].reputation = newReputation;
        emit ReputationUpdated(sentinel, newReputation);
    }
    
    // ============ Emergency Actions ============
    
    /**
     * @notice Trigger emergency pause on a target contract
     * @param target Contract to pause
     * @param reason Reason for pause
     */
    function emergencyPause(address target, string calldata reason) 
        external 
        onlyGuardian
        cooldownMet
        whenNotPaused
    {
        if (target == address(0)) revert InvalidTarget();
        
        // Update sentinel activity
        _updateActivity();
        
        // Call pause on target
        (bool success, ) = target.call(abi.encodeWithSelector(bytes4(keccak256("pause()"))));
        if (!success) revert PolicyAdjustmentFailed();
        
        // Record action
        emergencyActions.push(EmergencyAction({
            sentinel: msg.sender,
            actionType: "PAUSE",
            target: target,
            timestamp: block.timestamp,
            reason: reason,
            executed: true
        }));
        
        emit EmergencyPauseTriggered(msg.sender, target, reason);
    }
    
    /**
     * @notice Trigger emergency unpause
     */
    function emergencyUnpause(address target, string calldata reason) 
        external 
        onlyGuardian
        cooldownMet
    {
        if (target == address(0)) revert InvalidTarget();
        
        _updateActivity();
        
        (bool success, ) = target.call(abi.encodeWithSelector(bytes4(keccak256("unpause()"))));
        if (!success) revert PolicyAdjustmentFailed();
        
        emergencyActions.push(EmergencyAction({
            sentinel: msg.sender,
            actionType: "UNPAUSE",
            target: target,
            timestamp: block.timestamp,
            reason: reason,
            executed: true
        }));
        
        emit EmergencyUnpauseTriggered(msg.sender, target, reason);
    }
    
    // ============ ACE Policy Adjustments ============
    
    /**
     * @notice Adjust volume policy limits
     * @param newMaxValue New maximum value
     * @param reason Reason for adjustment
     */
    function adjustVolumeLimit(uint256 newMaxValue, string calldata reason) 
        external 
        onlyGuardian
        cooldownMet
    {
        if (volumePolicy == address(0)) revert InvalidTarget();
        
        _updateActivity();
        
        // Call setLimits on VolumePolicyRBAC
        (bool success, ) = volumePolicy.call(
            abi.encodeWithSelector(
                bytes4(keccak256("setLimits(uint256,uint256,string)")),
                1 ether, // min value
                newMaxValue,
                string(abi.encodePacked("Sentinel: ", reason))
            )
        );
        
        if (!success) revert PolicyAdjustmentFailed();
        
        emit PolicyAdjusted(msg.sender, volumePolicy, "VOLUME_LIMIT");
    }
    
    /**
     * @notice Adjust daily volume limit
     */
    function adjustDailyVolumeLimit(uint256 newDailyLimit, string calldata reason) 
        external 
        onlyGuardian
        cooldownMet
    {
        if (volumePolicy == address(0)) revert InvalidTarget();
        
        _updateActivity();
        
        (bool success, ) = volumePolicy.call(
            abi.encodeWithSelector(
                bytes4(keccak256("setDailyLimit(uint256,string)")),
                newDailyLimit,
                string(abi.encodePacked("Sentinel: ", reason))
            )
        );
        
        if (!success) revert PolicyAdjustmentFailed();
        
        emit PolicyAdjusted(msg.sender, volumePolicy, "DAILY_LIMIT");
    }
    
    /**
     * @notice Add address to blacklist
     */
    function blacklistAddress(address addr, string calldata reason) 
        external 
        onlyGuardian
        cooldownMet
    {
        if (blacklistPolicy == address(0)) revert InvalidTarget();
        if (addr == address(0)) revert InvalidTarget();
        
        _updateActivity();
        
        (bool success, ) = blacklistPolicy.call(
            abi.encodeWithSelector(
                bytes4(keccak256("addToBlacklist(address,string)")),
                addr,
                string(abi.encodePacked("Sentinel: ", reason))
            )
        );
        
        if (!success) revert PolicyAdjustmentFailed();
        
        emit PolicyAdjusted(msg.sender, blacklistPolicy, "BLACKLIST_ADD");
    }
    
    /**
     * @notice Remove address from blacklist
     */
    function unblacklistAddress(address addr, string calldata reason) 
        external 
        onlyGuardian
        cooldownMet
    {
        if (blacklistPolicy == address(0)) revert InvalidTarget();
        
        _updateActivity();
        
        (bool success, ) = blacklistPolicy.call(
            abi.encodeWithSelector(
                bytes4(keccak256("removeFromBlacklist(address)")),
                addr
            )
        );
        
        if (!success) revert PolicyAdjustmentFailed();
        
        emit PolicyAdjusted(msg.sender, blacklistPolicy, "BLACKLIST_REMOVE");
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update policy target addresses
     */
    function updatePolicyTargets(
        address _policyEngine,
        address _volumePolicy,
        address _blacklistPolicy,
        address _usdaToken
    ) external onlyRole(ADMIN_ROLE) {
        policyEngine = _policyEngine;
        volumePolicy = _volumePolicy;
        blacklistPolicy = _blacklistPolicy;
        usdaToken = _usdaToken;
        
        emit PolicyTargetsUpdated(_policyEngine, _volumePolicy, _blacklistPolicy, _usdaToken);
    }
    
    /**
     * @notice Update cooldown period
     */
    function setActionCooldown(uint256 newCooldown) external onlyRole(ADMIN_ROLE) {
        actionCooldown = newCooldown;
    }
    
    /**
     * @notice Update consensus threshold
     */
    function setMinSentinels(uint256 minSentinels) external onlyRole(ADMIN_ROLE) {
        minSentinelsForConsensus = minSentinels;
    }
    
    /**
     * @notice Pause the registry itself
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the registry
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ View Functions ============
    
    function getSentinelInfo(address sentinel) external view returns (SentinelInfo memory) {
        return sentinels[sentinel];
    }
    
    function getSentinelCount() external view returns (uint256) {
        return sentinelList.length;
    }
    
    function getActiveSentinelCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < sentinelList.length; i++) {
            if (sentinels[sentinelList[i]].isActive) count++;
        }
        return count;
    }
    
    function getEmergencyActionCount() external view returns (uint256) {
        return emergencyActions.length;
    }
    
    function getEmergencyActions(uint256 start, uint256 limit) 
        external 
        view 
        returns (EmergencyAction[] memory) 
    {
        uint256 end = start + limit;
        if (end > emergencyActions.length) end = emergencyActions.length;
        
        EmergencyAction[] memory result = new EmergencyAction[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = emergencyActions[i];
        }
        return result;
    }
    
    // ============ Internal Functions ============
    
    function _updateActivity() internal {
        sentinels[msg.sender].lastActivity = block.timestamp;
        sentinels[msg.sender].actionsTaken++;
        lastActionTime[msg.sender] = block.timestamp;
    }
}
