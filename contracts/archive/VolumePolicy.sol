// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BasePolicy.sol";

/**
 * @title VolumePolicy
 * @notice ACE Policy: Enforces transaction value limits
 * @dev Similar to Chainlink CRE stablecoin-ace-ccip VolumePolicy
 * Configurable: minValue, maxValue, dailyVolumeLimit
 */
contract VolumePolicy is BasePolicy {
    // Transaction value limits
    uint256 public minValue;
    uint256 public maxValue;
    
    // Daily volume tracking per address
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public lastVolumeReset;
    uint256 public dailyVolumeLimit;
    
    // Exempt addresses (e.g., owner, trusted contracts)
    mapping(address => bool) public exempt;
    
    // Events
    event LimitsUpdated(uint256 minValue, uint256 maxValue);
    event DailyLimitUpdated(uint256 newLimit);
    event ExemptionStatusChanged(address indexed addr, bool exempt);
    event VolumeViolation(address indexed addr, uint256 value, string reason);

    // Custom errors
    error ValueBelowMinimum(uint256 value, uint256 min);
    error ValueAboveMaximum(uint256 value, uint256 max);
    error DailyLimitExceeded(uint256 dailyVolume, uint256 limit);
    
    // Constants for severity levels
    uint8 constant SEVERITY_OK = 0;
    uint8 constant SEVERITY_LOW = 1;
    uint8 constant SEVERITY_MEDIUM = 2;
    uint8 constant SEVERITY_HIGH = 3;
    uint8 constant SEVERITY_CRITICAL = 4;

    constructor(
        uint256 _minValue,
        uint256 _maxValue,
        uint256 _dailyLimit
    ) BasePolicy("VolumePolicy", "1.0.0") {
        minValue = _minValue;
        maxValue = _maxValue;
        dailyVolumeLimit = _dailyLimit;
        
        // Owner is exempt by default
        exempt[msg.sender] = true;
    }

    /**
     * @notice Evaluate transaction against volume policy
     * @param from Transaction sender
     * @param to Transaction recipient
     * @param value Transaction value in wei
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
                string(abi.encodePacked("Value ", _uintToString(value), " below minimum ", _uintToString(minValue))),
                SEVERITY_LOW
            );
        }

        // Check maximum value
        if (value > maxValue) {
            emit VolumeViolation(from, value, "Above maximum");
            return (
                false,
                string(abi.encodePacked("Value ", _uintToString(value), " above maximum ", _uintToString(maxValue))),
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
                string(abi.encodePacked("Daily volume limit exceeded: ", _uintToString(newDailyVolume), " > ", _uintToString(dailyVolumeLimit))),
                SEVERITY_MEDIUM
            );
        }

        // Update daily volume
        dailyVolume[from] = newDailyVolume;

        return (true, "", SEVERITY_OK);
    }

    /**
     * @notice Update transaction value limits
     * @param _minValue New minimum value (0 for no minimum)
     * @param _maxValue New maximum value (0 for no maximum)
     */
    function setLimits(uint256 _minValue, uint256 _maxValue) external onlyOwner {
        require(_maxValue == 0 || _maxValue > _minValue, "Max must be > min or 0");
        minValue = _minValue;
        maxValue = _maxValue;
        emit LimitsUpdated(_minValue, _maxValue);
    }

    /**
     * @notice Update daily volume limit
     * @param _dailyLimit New daily limit (0 for no limit)
     */
    function setDailyLimit(uint256 _dailyLimit) external onlyOwner {
        dailyVolumeLimit = _dailyLimit;
        emit DailyLimitUpdated(_dailyLimit);
    }

    /**
     * @notice Set exemption status for an address
     * @param addr Address to set exemption for
     * @param _exempt True to exempt, false to remove exemption
     */
    function setExemption(address addr, bool _exempt) external onlyOwner {
        exempt[addr] = _exempt;
        emit ExemptionStatusChanged(addr, _exempt);
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
     * @notice Get remaining daily volume for an address
     */
    function getRemainingDailyVolume(address addr) external view returns (uint256) {
        if (dailyVolumeLimit == 0) return type(uint256).max;
        
        uint256 used = block.timestamp >= lastVolumeReset[addr] + 1 days 
            ? 0 
            : dailyVolume[addr];
            
        return dailyVolumeLimit > used ? dailyVolumeLimit - used : 0;
    }

    /**
     * @notice Reset daily volume if 24 hours have passed
     */
    function _resetDailyVolumeIfNeeded(address addr) internal {
        if (block.timestamp >= lastVolumeReset[addr] + 1 days) {
            dailyVolume[addr] = 0;
            lastVolumeReset[addr] = block.timestamp;
        }
    }

    /**
     * @notice Convert uint to string for error messages
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
