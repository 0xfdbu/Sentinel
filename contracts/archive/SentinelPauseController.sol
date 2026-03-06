// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ISentinelPauseController
 * @notice Interface for Sentinel pause controller
 */
interface ISentinelPauseController {
    function isPauser(address account) external view returns (bool);
    function isSentinelNode(address account) external view returns (bool);
    function isGuardian(address account) external view returns (bool);
    function getSentinelCount() external view returns (uint256);
    function isPaused(address target) external view returns (bool);
}

/**
 * @title SentinelPauseController
 * @notice Centralized pause controller for Sentinel-protected contracts
 * @dev Allows sentinel nodes, guardians, and admin to pause contracts
 * 
 * Roles:
 *   - DEFAULT_ADMIN_ROLE: Contract owner, can manage roles
 *   - GUARDIAN_ROLE: Can pause and unpause
 *   - SENTINEL_NODE_ROLE: Can only pause (emergency), cannot unpause
 * 
 * This contract is referenced by consumer contracts to check pausing permissions.
 * Sentinel nodes can trigger pauses via CRE workflows or direct calls.
 */
contract SentinelPauseController is AccessControl, ISentinelPauseController {
    
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant SENTINEL_NODE_ROLE = keccak256("SENTINEL_NODE_ROLE");
    
    // Pause tracking
    mapping(address => bool) public contractPaused;
    mapping(address => uint256) public pausedAt;
    mapping(address => address) public pausedBy;
    
    // Events
    event ContractPaused(address indexed target, address indexed triggeredBy, string reason);
    event ContractUnpaused(address indexed target, address indexed triggeredBy);
    event SentinelNodeAdded(address indexed node);
    event SentinelNodeRemoved(address indexed node);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    
    // Errors
    error NotAuthorizedPauser();
    error NotAuthorizedUnpauser();
    error ContractAlreadyPaused();
    error ContractNotPaused();
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }
    
    /**
     * @notice Pause a target contract
     * @param target The contract to pause
     * @param reason Reason for pausing
     */
    function pause(address target, string calldata reason) external {
        if (!isPauser(msg.sender)) revert NotAuthorizedPauser();
        if (contractPaused[target]) revert ContractAlreadyPaused();
        
        contractPaused[target] = true;
        pausedAt[target] = block.timestamp;
        pausedBy[target] = msg.sender;
        
        emit ContractPaused(target, msg.sender, reason);
    }
    
    /**
     * @notice Unpause a target contract
     * @param target The contract to unpause
     */
    function unpause(address target) external {
        // Only guardians and admin can unpause (not sentinel nodes)
        if (!hasRole(GUARDIAN_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorizedUnpauser();
        }
        if (!contractPaused[target]) revert ContractNotPaused();
        
        contractPaused[target] = false;
        pausedAt[target] = 0;
        pausedBy[target] = address(0);
        
        emit ContractUnpaused(target, msg.sender);
    }
    
    /**
     * @notice Batch pause multiple contracts (emergency response)
     * @param targets Array of contracts to pause
     * @param reason Reason for pausing
     */
    function batchPause(address[] calldata targets, string calldata reason) external {
        if (!isPauser(msg.sender)) revert NotAuthorizedPauser();
        
        for (uint256 i = 0; i < targets.length; i++) {
            if (!contractPaused[targets[i]]) {
                contractPaused[targets[i]] = true;
                pausedAt[targets[i]] = block.timestamp;
                pausedBy[targets[i]] = msg.sender;
                emit ContractPaused(targets[i], msg.sender, reason);
            }
        }
    }
    
    /**
     * @notice Check if an address can pause
     */
    function isPauser(address account) public view override returns (bool) {
        return hasRole(SENTINEL_NODE_ROLE, account) || 
               hasRole(GUARDIAN_ROLE, account) || 
               hasRole(DEFAULT_ADMIN_ROLE, account);
    }
    
    /**
     * @notice Check if address is a sentinel node
     */
    function isSentinelNode(address account) external view override returns (bool) {
        return hasRole(SENTINEL_NODE_ROLE, account);
    }
    
    /**
     * @notice Check if address is a guardian
     */
    function isGuardian(address account) external view override returns (bool) {
        return hasRole(GUARDIAN_ROLE, account);
    }
    
    /**
     * @notice Check if a contract is paused
     */
    function isPaused(address target) external view returns (bool) {
        return contractPaused[target];
    }
    
    /**
     * @notice Get pause details for a contract
     */
    function getPauseDetails(address target) external view returns (
        bool paused,
        uint256 timestamp,
        address triggeredBy
    ) {
        return (contractPaused[target], pausedAt[target], pausedBy[target]);
    }
    
    /**
     * @notice Get count of sentinel nodes
     */
    function getSentinelCount() external view override returns (uint256) {
        // Note: This is approximate as AccessControl doesn't expose role member count directly
        // In production, you might want to track this separately
        return 0; // Placeholder - would need custom tracking for accurate count
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add a sentinel node
     */
    function addSentinelNode(address node) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(SENTINEL_NODE_ROLE, node);
        emit SentinelNodeAdded(node);
    }
    
    /**
     * @notice Remove a sentinel node
     */
    function removeSentinelNode(address node) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(SENTINEL_NODE_ROLE, node);
        emit SentinelNodeRemoved(node);
    }
    
    /**
     * @notice Add a guardian
     */
    function addGuardian(address guardian) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(GUARDIAN_ROLE, guardian);
        emit GuardianAdded(guardian);
    }
    
    /**
     * @notice Remove a guardian
     */
    function removeGuardian(address guardian) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(GUARDIAN_ROLE, guardian);
        emit GuardianRemoved(guardian);
    }
    
    /**
     * @notice Renounce sentinel node role (for nodes to self-remove)
     */
    function renounceSentinelNode() external {
        renounceRole(SENTINEL_NODE_ROLE, msg.sender);
    }
}
