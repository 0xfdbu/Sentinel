// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicy.sol";

/**
 * @title VolumePolicyRBAC
 * @notice ACE Policy: Enforces transaction value limits with Role-Based Access Control
 * @dev Upgraded version using AccessControl instead of Ownable for better flexibility
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles, emergency functions
 * - SENTINEL_ROLE: Can update limits (for autonomous policy adjustment)
 * - POLICY_MANAGER_ROLE: Can update limits and exemptions
 */
contract VolumePolicyRBAC is IPolicy, AccessControl {
    // Role definitions
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant POLICY_MANAGER_ROLE = keccak256("POLICY_MANAGER_ROLE");
    
    // Policy metadata
    string public override name;
    string public override version;
    bool public override isActive;
    
    // Transaction value limits
    uint256 public minValue;
    uint256 public maxValue;
    
    // Daily volume tracking per address
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public lastVolumeReset;
    uint256 public dailyVolumeLimit;
    
    // Exempt addresses
    mapping(address => bool) public exempt;
    
    // Severity constants
    uint8 constant SEVERITY_OK = 0;
    uint8 constant SEVERITY_LOW = 1;
    uint8 constant SEVERITY_MEDIUM = 2;
    uint8 constant SEVERITY_HIGH = 3;
    uint8 constant SEVERITY_CRITICAL = 4;
    
    // Events
    event LimitsUpdated(uint256 minValue, uint256 maxValue, string reason);
    event DailyLimitUpdated(uint256 newLimit, string reason);
    event ExemptionStatusChanged(address indexed addr, bool exempt);
    event VolumeViolation(address indexed addr, uint256 value, string reason);
    event PolicyStatusChanged(bool active);
    
    // Custom errors
    error ValueBelowMinimum(uint256 value, uint256 min);
    error ValueAboveMaximum(uint256 value, uint256 max);
    error DailyLimitExceeded(uint256 dailyVolume, uint256 limit);
    
    modifier onlyActive() {
        require(isActive, "Policy: not active");
        _;
    }
    
    /**
     * @notice Constructor
     * @param admin Address to grant DEFAULT_ADMIN_ROLE
     * @param _minValue Minimum transaction value
     * @param _maxValue Maximum transaction value  
     * @param _dailyLimit Daily aggregate limit
     */
    constructor(
        address admin,
        uint256 _minValue,
        uint256 _maxValue,
        uint256 _dailyLimit
    ) {
        name = "VolumePolicyRBAC";
        version = "2.0.0";
        isActive = true;
        
        minValue = _minValue;
        maxValue = _maxValue;
        dailyVolumeLimit = _dailyLimit;
        
        // Grant admin role
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // Grant policy manager role to admin initially
        _grantRole(POLICY_MANAGER_ROLE, admin);
        
        // Admin is exempt by default
        exempt[admin] = true;
    }
    
    /**
     * @notice Evaluate transaction against volume policy
     */
    function evaluate(
        address from,
        address to,
        uint256 value,
        bytes calldata
    ) external override onlyActive returns (bool, string memory, uint8) {
        // Skip checks for exempt addresses
        if (exempt[from] || exempt[to]) {
            return (true, "", SEVERITY_OK);
        }
        
        // Check minimum value
        if (value < minValue && value > 0) {
            return (
                false, 
                string(abi.encodePacked("Value below minimum: ", _uintToString(value), " < ", _uintToString(minValue))),
                SEVERITY_LOW
            );
        }
        
        // Check maximum value
        if (value > maxValue) {
            emit VolumeViolation(from, value, "Above maximum");
            return (
                false,
                string(abi.encodePacked("Value above maximum: ", _uintToString(value), " > ", _uintToString(maxValue))),
                SEVERITY_HIGH
            );
        }
        
        // Check daily volume
        _resetDailyVolumeIfNeeded(from);
        uint256 newDailyVolume = dailyVolume[from] + value;
        
        if (newDailyVolume > dailyVolumeLimit) {
            emit VolumeViolation(from, value, "Daily limit exceeded");
            return (
                false,
                string(abi.encodePacked("Daily volume exceeded: ", _uintToString(newDailyVolume), " > ", _uintToString(dailyVolumeLimit))),
                SEVERITY_MEDIUM
            );
        }
        
        dailyVolume[from] = newDailyVolume;
        return (true, "", SEVERITY_OK);
    }
    
    /**
     * @notice Update transaction value limits
     * @param _minValue New minimum value
     * @param _maxValue New maximum value
     * @param reason Reason for the update (for audit)
     */
    function setLimits(
        uint256 _minValue, 
        uint256 _maxValue,
        string calldata reason
    ) external onlyRole(POLICY_MANAGER_ROLE) {
        require(_maxValue == 0 || _maxValue > _minValue, "Max must be > min or 0");
        minValue = _minValue;
        maxValue = _maxValue;
        emit LimitsUpdated(_minValue, _maxValue, reason);
    }
    
    /**
     * @notice Update daily volume limit
     * @param _dailyLimit New daily limit
     * @param reason Reason for the update
     */
    function setDailyLimit(
        uint256 _dailyLimit,
        string calldata reason
    ) external onlyRole(POLICY_MANAGER_ROLE) {
        dailyVolumeLimit = _dailyLimit;
        emit DailyLimitUpdated(_dailyLimit, reason);
    }
    
    /**
     * @notice Set exemption status for an address
     */
    function setExemption(address addr, bool _exempt) external onlyRole(POLICY_MANAGER_ROLE) {
        exempt[addr] = _exempt;
        emit ExemptionStatusChanged(addr, _exempt);
    }
    
    /**
     * @notice Activate or deactivate the policy
     */
    function setActive(bool _active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isActive = _active;
        emit PolicyStatusChanged(_active);
    }
    
    /**
     * @notice Grant SENTINEL_ROLE to an address (for autonomous policy adjustment)
     */
    function grantSentinelRole(address sentinel) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(SENTINEL_ROLE, sentinel);
        // Also grant POLICY_MANAGER_ROLE so sentinel can update limits
        _grantRole(POLICY_MANAGER_ROLE, sentinel);
    }
    
    /**
     * @notice Revoke SENTINEL_ROLE
     */
    function revokeSentinelRole(address sentinel) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(SENTINEL_ROLE, sentinel);
        _revokeRole(POLICY_MANAGER_ROLE, sentinel);
    }
    
    /**
     * @notice Check if an address has SENTINEL_ROLE
     */
    function isSentinel(address addr) external view returns (bool) {
        return hasRole(SENTINEL_ROLE, addr);
    }
    
    /**
     * @notice Check if an address is exempt
     */
    function isExempt(address addr) external view returns (bool) {
        return exempt[addr];
    }
    
    /**
     * @notice Get daily volume for an address
     */
    function getDailyVolume(address addr) external view returns (uint256) {
        if (block.timestamp >= lastVolumeReset[addr] + 1 days) {
            return 0;
        }
        return dailyVolume[addr];
    }
    
    /**
     * @notice Reset daily volume if needed
     */
    function _resetDailyVolumeIfNeeded(address addr) internal {
        if (block.timestamp >= lastVolumeReset[addr] + 1 days) {
            dailyVolume[addr] = 0;
            lastVolumeReset[addr] = block.timestamp;
        }
    }
    
    /**
     * @notice Utility: Convert uint to string
     */
    function _uintToString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (v != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(v - v / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            v /= 10;
        }
        return string(bstr);
    }
}
