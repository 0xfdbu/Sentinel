// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SentinelRegistryV3
 * @notice Decentralized registry for Sentinel Guardian nodes with LINK staking
 * @dev 
 *   - Permissionless guardian registration with 5 LINK stake
 *   - Slashing mechanism for malicious behavior
 *   - Reputation tracking based on performance
 *   - Self-service deregistration with stake return
 *   - Integrates with EmergencyGuardianCRE for DON-signed reports
 */
contract SentinelRegistryV3 is AccessControl, Pausable, ReentrancyGuard {
    
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE"); // Can slash malicious guardians
    
    // ============ Constants ============
    /// @notice Minimum LINK stake to become a guardian (5 LINK)
    uint256 public constant GUARDIAN_STAKE = 5e18;
    
    /// @notice Minimum reputation to remain active (20%)
    uint256 public constant MIN_REPUTATION = 2000;
    
    /// @notice Reputation boost for successful action (+1%)
    uint256 public constant REP_SUCCESS_BOOST = 100;
    
    /// @notice Reputation penalty for false positive (-2%)
    uint256 public constant REP_FALSE_POSITIVE_PENALTY = 200;
    
    /// @notice Cooldown between guardian actions (5 minutes)
    uint256 public constant ACTION_COOLDOWN = 5 minutes;
    
    // ============ Enums ============
    enum GuardianStatus { 
        Inactive,      // Not registered
        Active,        // Registered and staked
        Suspended,     // Temporarily suspended (can be reinstated)
        Slashed        // Stake taken, removed permanently
    }
    
    // ============ Structs ============
    struct Guardian {
        GuardianStatus status;
        uint256 stakedAmount;      // LINK staked
        uint256 registeredAt;
        uint256 lastActivityAt;
        uint256 totalActions;      // Total pauses/actions taken
        uint256 successfulActions; // Verified successful pauses
        uint256 falsePositives;    // False alarms
        uint256 reputation;        // 0-10000 (100.00%)
        string metadata;           // Node info (name, endpoint, etc.)
    }
    
    struct GuardianAction {
        address guardian;
        string actionType;         // "PAUSE", "UNPAUSE", etc.
        address target;
        uint256 timestamp;
        string reason;
        bool verified;             // Whether action was valid
    }
    
    // ============ State Variables ============
    /// @notice LINK token address
    address public linkToken;
    
    /// @notice Guardian registrations
    mapping(address => Guardian) public guardians;
    
    /// @notice List of all guardian addresses
    address[] public guardianList;
    
    /// @notice Mapping to track index in guardianList
    mapping(address => uint256) private guardianIndex;
    
    /// @notice Action history
    GuardianAction[] public actions;
    
    /// @notice Last action timestamp per guardian
    mapping(address => uint256) public lastActionTime;
    
    /// @notice EmergencyGuardianCRE contract that can record activity
    address public emergencyGuardian;
    
    /// @notice Treasury address for slashed funds
    address public treasury;
    
    /// @notice Total LINK staked in contract
    uint256 public totalStaked;
    
    // ============ Events ============
    event GuardianRegistered(
        address indexed guardian,
        uint256 stake,
        string metadata
    );
    event GuardianDeregistered(
        address indexed guardian, 
        uint256 stakeReturned
    );
    event GuardianSuspended(
        address indexed guardian, 
        string reason
    );
    event GuardianReinstated(address indexed guardian);
    event GuardianSlashed(
        address indexed guardian, 
        uint256 amount, 
        string reason
    );
    event ReputationUpdated(
        address indexed guardian, 
        uint256 newReputation,
        string reason
    );
    event ActivityRecorded(
        address indexed guardian,
        bool success,
        uint256 newReputation
    );
    event ActionSubmitted(
        address indexed guardian,
        string actionType,
        address indexed target,
        string reason
    );
    event EmergencyGuardianSet(address indexed guardian);
    event TreasurySet(address indexed treasury);
    
    // ============ Errors ============
    error GuardianAlreadyRegistered();
    error GuardianNotRegistered();
    error GuardianNotActive();
    error InsufficientLINKStake();
    error LinkTokenNotSet();
    error TreasuryNotSet();
    error SlashingFailed();
    error AlreadySuspended();
    error CooldownNotMet(uint256 remaining);
    error UnauthorizedAction();
    error InvalidAddress();
    error TransferFailed();
    error ReputationTooLow();
    
    // ============ Modifiers ============
    modifier onlyGuardian() {
        if (!hasRole(GUARDIAN_ROLE, msg.sender)) revert UnauthorizedAction();
        _;
    }
    
    modifier cooldownMet() {
        uint256 timeSinceLastAction = block.timestamp - lastActionTime[msg.sender];
        if (timeSinceLastAction < ACTION_COOLDOWN) {
            revert CooldownNotMet(ACTION_COOLDOWN - timeSinceLastAction);
        }
        _;
    }
    
    modifier onlyEmergencyGuardian() {
        if (msg.sender != emergencyGuardian) revert UnauthorizedAction();
        _;
    }
    
    // ============ Constructor ============
    constructor(
        address _linkToken,
        address _treasury,
        address admin
    ) {
        if (_linkToken == address(0) || admin == address(0)) revert InvalidAddress();
        
        linkToken = _linkToken;
        treasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SLASHER_ROLE, admin);
    }
    
    // ============ Guardian Registration ============
    
    /**
     * @notice Register as a guardian node with 5 LINK stake
     * @param metadata Node metadata (name, endpoint, contact info)
     */
    function registerGuardian(string calldata metadata) external whenNotPaused nonReentrant {
        if (guardians[msg.sender].status != GuardianStatus.Inactive) 
            revert GuardianAlreadyRegistered();
        
        // Transfer 5 LINK from sender
        bool success = IERC20(linkToken).transferFrom(
            msg.sender, 
            address(this), 
            GUARDIAN_STAKE
        );
        if (!success) revert InsufficientLINKStake();
        
        // Register guardian
        guardians[msg.sender] = Guardian({
            status: GuardianStatus.Active,
            stakedAmount: GUARDIAN_STAKE,
            registeredAt: block.timestamp,
            lastActivityAt: block.timestamp,
            totalActions: 0,
            successfulActions: 0,
            falsePositives: 0,
            reputation: 5000, // Start at 50%
            metadata: metadata
        });
        
        guardianIndex[msg.sender] = guardianList.length;
        guardianList.push(msg.sender);
        totalStaked += GUARDIAN_STAKE;
        
        // Grant roles
        _grantRole(SENTINEL_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
        
        emit GuardianRegistered(msg.sender, GUARDIAN_STAKE, metadata);
    }
    
    /**
     * @notice Deregister as guardian and withdraw LINK stake
     * @dev Must not have pending actions or be under investigation
     */
    function deregisterGuardian() external nonReentrant {
        Guardian storage g = guardians[msg.sender];
        if (g.status != GuardianStatus.Active && g.status != GuardianStatus.Suspended) 
            revert GuardianNotRegistered();
        
        uint256 stake = g.stakedAmount;
        
        // Mark as inactive
        g.status = GuardianStatus.Inactive;
        g.stakedAmount = 0;
        
        // Remove from list (swap with last)
        uint256 index = guardianIndex[msg.sender];
        uint256 lastIndex = guardianList.length - 1;
        
        if (index != lastIndex) {
            address lastGuardian = guardianList[lastIndex];
            guardianList[index] = lastGuardian;
            guardianIndex[lastGuardian] = index;
        }
        
        guardianList.pop();
        delete guardianIndex[msg.sender];
        totalStaked -= stake;
        
        // Revoke roles
        _revokeRole(SENTINEL_ROLE, msg.sender);
        _revokeRole(GUARDIAN_ROLE, msg.sender);
        
        // Return LINK stake
        bool success = IERC20(linkToken).transfer(msg.sender, stake);
        if (!success) revert TransferFailed();
        
        emit GuardianDeregistered(msg.sender, stake);
    }
    
    // ============ Activity Recording ============
    
    /**
     * @notice Record guardian activity (called by EmergencyGuardianCRE)
     * @param guardian The guardian to record activity for
     * @param success Whether the action was valid (not a false positive)
     * @param actionType Type of action taken
     * @param target Target contract
     * @param reason Reason for action
     */
    function recordActivity(
        address guardian,
        bool success,
        string calldata actionType,
        address target,
        string calldata reason
    ) external onlyEmergencyGuardian {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Active) revert GuardianNotActive();
        
        g.lastActivityAt = block.timestamp;
        g.totalActions++;
        
        if (success) {
            g.successfulActions++;
            g.reputation = min(g.reputation + REP_SUCCESS_BOOST, 10000);
        } else {
            g.falsePositives++;
            g.reputation = g.reputation > REP_FALSE_POSITIVE_PENALTY 
                ? g.reputation - REP_FALSE_POSITIVE_PENALTY 
                : 0;
            
            // Auto-suspend if reputation too low
            if (g.reputation < MIN_REPUTATION) {
                _suspend(guardian, "Reputation fell below minimum threshold");
            }
        }
        
        // Record action
        actions.push(GuardianAction({
            guardian: guardian,
            actionType: actionType,
            target: target,
            timestamp: block.timestamp,
            reason: reason,
            verified: success
        }));
        
        emit ActivityRecorded(guardian, success, g.reputation);
    }
    
    /**
     * @notice Submit an action (called by guardian, recorded for tracking)
     */
    function submitAction(
        string calldata actionType,
        address target,
        string calldata reason
    ) external onlyGuardian cooldownMet {
        lastActionTime[msg.sender] = block.timestamp;
        emit ActionSubmitted(msg.sender, actionType, target, reason);
    }
    
    // ============ Slashing & Moderation ============
    
    /**
     * @notice Slash a guardian's stake for malicious behavior
     * @param guardian The guardian to slash
     * @param reason Reason for slashing
     */
    function slashGuardian(
        address guardian, 
        string calldata reason
    ) external onlyRole(SLASHER_ROLE) nonReentrant {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Active && g.status != GuardianStatus.Suspended) 
            revert GuardianNotActive();
        
        uint256 slashAmount = g.stakedAmount;
        g.stakedAmount = 0;
        g.status = GuardianStatus.Slashed;
        g.reputation = 0;
        totalStaked -= slashAmount;
        
        // Remove from list
        uint256 index = guardianIndex[guardian];
        uint256 lastIndex = guardianList.length - 1;
        
        if (index != lastIndex) {
            address lastGuardian = guardianList[lastIndex];
            guardianList[index] = lastGuardian;
            guardianIndex[lastGuardian] = index;
        }
        
        guardianList.pop();
        delete guardianIndex[guardian];
        
        // Revoke roles
        _revokeRole(SENTINEL_ROLE, guardian);
        _revokeRole(GUARDIAN_ROLE, guardian);
        
        // Send slashed LINK to treasury (or burn if no treasury)
        address destination = treasury != address(0) ? treasury : address(0xdead);
        bool success = IERC20(linkToken).transfer(destination, slashAmount);
        if (!success) revert SlashingFailed();
        
        emit GuardianSlashed(guardian, slashAmount, reason);
    }
    
    /**
     * @notice Suspend a guardian temporarily
     */
    function suspendGuardian(
        address guardian, 
        string calldata reason
    ) external onlyRole(SLASHER_ROLE) {
        _suspend(guardian, reason);
    }
    
    function _suspend(address guardian, string memory reason) internal {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Active) revert AlreadySuspended();
        
        g.status = GuardianStatus.Suspended;
        _revokeRole(GUARDIAN_ROLE, guardian);
        _revokeRole(SENTINEL_ROLE, guardian);
        
        emit GuardianSuspended(guardian, reason);
    }
    
    /**
     * @notice Reinstate a suspended guardian
     */
    function reinstateGuardian(address guardian) external onlyRole(ADMIN_ROLE) {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Suspended) revert GuardianNotRegistered();
        if (g.reputation < MIN_REPUTATION) revert ReputationTooLow();
        
        g.status = GuardianStatus.Active;
        _grantRole(SENTINEL_ROLE, guardian);
        _grantRole(GUARDIAN_ROLE, guardian);
        
        emit GuardianReinstated(guardian);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set EmergencyGuardianCRE contract address
     */
    function setEmergencyGuardian(address _emergencyGuardian) external onlyRole(ADMIN_ROLE) {
        emergencyGuardian = _emergencyGuardian;
        emit EmergencyGuardianSet(_emergencyGuardian);
    }
    
    /**
     * @notice Set treasury address for slashed funds
     */
    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }
    
    /**
     * @notice Update LINK token address (in case of migration)
     */
    function setLinkToken(address _linkToken) external onlyRole(ADMIN_ROLE) {
        if (_linkToken == address(0)) revert InvalidAddress();
        linkToken = _linkToken;
    }
    
    /**
     * @notice Grant slasher role to an address
     */
    function grantSlasherRole(address slasher) external onlyRole(ADMIN_ROLE) {
        _grantRole(SLASHER_ROLE, slasher);
    }
    
    /**
     * @notice Revoke slasher role
     */
    function revokeSlasherRole(address slasher) external onlyRole(ADMIN_ROLE) {
        _revokeRole(SLASHER_ROLE, slasher);
    }
    
    /**
     * @notice Pause the registry
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
    
    /**
     * @notice Check if address is an active guardian
     */
    function isActiveGuardian(address addr) external view returns (bool) {
        return guardians[addr].status == GuardianStatus.Active;
    }
    
    /**
     * @notice Get guardian details
     */
    function getGuardian(address addr) external view returns (Guardian memory) {
        return guardians[addr];
    }
    
    /**
     * @notice Get list of active guardians (paginated)
     */
    function getGuardians(
        uint256 offset, 
        uint256 limit
    ) external view returns (address[] memory) {
        uint256 total = guardianList.length;
        
        if (offset >= total) return new address[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = guardianList[offset + i];
        }
        
        return result;
    }
    
    /**
     * @notice Get only active guardians
     */
    function getActiveGuardians() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardians[guardianList[i]].status == GuardianStatus.Active) {
                activeCount++;
            }
        }
        
        address[] memory active = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardians[guardianList[i]].status == GuardianStatus.Active) {
                active[index++] = guardianList[i];
            }
        }
        
        return active;
    }
    
    /**
     * @notice Get total guardian count
     */
    function getGuardianCount() external view returns (uint256) {
        return guardianList.length;
    }
    
    /**
     * @notice Get active guardian count
     */
    function getActiveGuardianCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardians[guardianList[i]].status == GuardianStatus.Active) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @notice Get guardian action history
     */
    function getActions(
        uint256 start, 
        uint256 limit
    ) external view returns (GuardianAction[] memory) {
        uint256 end = start + limit;
        if (end > actions.length) end = actions.length;
        
        GuardianAction[] memory result = new GuardianAction[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = actions[i];
        }
        return result;
    }
    
    /**
     * @notice Get total action count
     */
    function getActionCount() external view returns (uint256) {
        return actions.length;
    }
    
    /**
     * @notice Get guardian's actions
     */
    function getGuardianActions(
        address guardian,
        uint256 start,
        uint256 limit
    ) external view returns (GuardianAction[] memory) {
        // First count guardian's actions
        uint256 guardianActionCount = 0;
        for (uint256 i = 0; i < actions.length; i++) {
            if (actions[i].guardian == guardian) {
                guardianActionCount++;
            }
        }
        
        // Apply pagination
        if (start >= guardianActionCount) return new GuardianAction[](0);
        
        uint256 end = start + limit;
        if (end > guardianActionCount) end = guardianActionCount;
        
        GuardianAction[] memory result = new GuardianAction[](end - start);
        uint256 resultIndex = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 0; i < actions.length && resultIndex < (end - start); i++) {
            if (actions[i].guardian == guardian) {
                if (skipped >= start) {
                    result[resultIndex] = actions[i];
                    resultIndex++;
                } else {
                    skipped++;
                }
            }
        }
        
        return result;
    }
    
    /**
     * @notice Check if guardian can perform action (not in cooldown)
     */
    function canAct(address guardian) external view returns (bool) {
        if (guardians[guardian].status != GuardianStatus.Active) return false;
        return (block.timestamp - lastActionTime[guardian]) >= ACTION_COOLDOWN;
    }
    
    /**
     * @notice Get time until guardian can act again
     */
    function timeUntilCanAct(address guardian) external view returns (uint256) {
        uint256 timeSinceLastAction = block.timestamp - lastActionTime[guardian];
        if (timeSinceLastAction >= ACTION_COOLDOWN) return 0;
        return ACTION_COOLDOWN - timeSinceLastAction;
    }
    
    // ============ Internal Functions ============
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
