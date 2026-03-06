// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicy.sol";

/**
 * @title VolumePolicyDON
 * @notice ACE Policy with DON-signed report support for autonomous adjustments
 * @dev Supports writeReport() from Chainlink CRE workflows
 */
contract VolumePolicyDON is IPolicy, AccessControl {
    
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant POLICY_MANAGER_ROLE = keccak256("POLICY_MANAGER_ROLE");
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    
    // DON report tracking
    mapping(bytes32 => bool) public usedReports;
    
    string public override name;
    string public override version;
    bool public override isActive;
    
    uint256 public minValue;
    uint256 public maxValue;
    uint256 public dailyVolumeLimit;
    
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public lastVolumeReset;
    mapping(address => bool) public exempt;
    
    uint8 constant SEVERITY_OK = 0;
    uint8 constant SEVERITY_CRITICAL = 4;
    
    // Instruction types
    uint8 constant INSTRUCTION_SET_LIMITS = 1;
    uint8 constant INSTRUCTION_SET_DAILY_LIMIT = 2;
    uint8 constant INSTRUCTION_SET_EXEMPTION = 3;
    
    event LimitsUpdated(uint256 minValue, uint256 maxValue, string reason, bytes32 reportHash);
    event DailyLimitUpdated(uint256 newLimit, string reason, bytes32 reportHash);
    event ExemptionChanged(address indexed addr, bool exempt, bytes32 reportHash);
    event ReportProcessed(bytes32 indexed reportHash, uint8 instruction);
    
    error InvalidReport();
    error ReportAlreadyUsed(bytes32 reportHash);
    error InvalidInstruction(uint8 instruction);
    
    modifier onlyActive() {
        require(isActive, "Policy: not active");
        _;
    }
    
    constructor(
        address admin,
        uint256 _minValue,
        uint256 _maxValue,
        uint256 _dailyLimit
    ) {
        name = "VolumePolicyDON";
        version = "1.0.0";
        isActive = true;
        
        minValue = _minValue;
        maxValue = _maxValue;
        dailyVolumeLimit = _dailyLimit;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_MANAGER_ROLE, admin);
    }
    
    /**
     * @notice Process DON-signed report from CRE workflow
     * @param report ABI-encoded report with instruction and parameters
     * 
     * Report format:
     * - bytes32 reportHash: Unique report identifier
     * - uint8 instruction: 1=setLimits, 2=setDailyLimit, 3=setExemption
     * - uint256 param1: minValue/newLimit/exemptAddress
     * - uint256 param2: maxValue/exemptStatus
     * - string reason: Reason for adjustment
     */
    function writeReport(bytes calldata report) external onlyRole(DON_SIGNER_ROLE) {
        (
            bytes32 reportHash,
            uint8 instruction,
            uint256 param1,
            uint256 param2,
            string memory reason
        ) = abi.decode(report, (bytes32, uint8, uint256, uint256, string));
        
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        if (instruction == INSTRUCTION_SET_LIMITS) {
            _setLimits(param1, param2, reason, reportHash);
        } else if (instruction == INSTRUCTION_SET_DAILY_LIMIT) {
            _setDailyLimit(param1, reason, reportHash);
        } else if (instruction == INSTRUCTION_SET_EXEMPTION) {
            _setExemption(address(uint160(param1)), param2 > 0, reportHash);
        } else {
            revert InvalidInstruction(instruction);
        }
        
        emit ReportProcessed(reportHash, instruction);
    }
    
    function _setLimits(uint256 _min, uint256 _max, string memory reason, bytes32 reportHash) internal {
        minValue = _min;
        maxValue = _max;
        emit LimitsUpdated(_min, _max, reason, reportHash);
    }
    
    function _setDailyLimit(uint256 limit, string memory reason, bytes32 reportHash) internal {
        dailyVolumeLimit = limit;
        emit DailyLimitUpdated(limit, reason, reportHash);
    }
    
    function _setExemption(address addr, bool isExempt, bytes32 reportHash) internal {
        exempt[addr] = isExempt;
        emit ExemptionChanged(addr, isExempt, reportHash);
    }
    
    // Legacy role-based functions (still supported)
    function setLimits(uint256 _min, uint256 _max, string calldata reason) 
        external 
        onlyRole(POLICY_MANAGER_ROLE) 
    {
        _setLimits(_min, _max, reason, bytes32(0));
    }
    
    function setDailyLimit(uint256 limit, string calldata reason) 
        external 
        onlyRole(POLICY_MANAGER_ROLE) 
    {
        _setDailyLimit(limit, reason, bytes32(0));
    }
    
    function setExemption(address addr, bool isExempt) 
        external 
        onlyRole(POLICY_MANAGER_ROLE) 
    {
        _setExemption(addr, isExempt, bytes32(0));
    }
    
    /// @notice 24-hour window in seconds
    uint256 public constant DAILY_WINDOW = 24 hours;
    
    /// @notice Track total daily volume across all users
    uint256 public globalDailyVolume;
    uint256 public globalLastVolumeReset;
    
    event VolumeViolation(address indexed addr, uint256 value, uint256 dailyVolume, string reason);
    event DailyVolumeReset(uint256 timestamp);
    
    error DailyLimitExceeded(uint256 limit, uint256 current);
    
    /**
     * @notice Check and reset daily volume if 24h window passed
     */
    function _checkAndResetDailyVolume() internal {
        if (block.timestamp >= globalLastVolumeReset + DAILY_WINDOW) {
            globalDailyVolume = 0;
            globalLastVolumeReset = block.timestamp;
            emit DailyVolumeReset(block.timestamp);
        }
    }
    
    /**
     * @notice Check and reset user's daily volume if 24h window passed
     */
    function _checkAndResetUserVolume(address user) internal {
        if (block.timestamp >= lastVolumeReset[user] + DAILY_WINDOW) {
            dailyVolume[user] = 0;
            lastVolumeReset[user] = block.timestamp;
        }
    }
    
    // Required IPolicy interface
    function evaluate(
        address from,
        address to,
        uint256 value,
        bytes calldata
    ) external override onlyActive returns (bool, string memory, uint8) {
        // Check and reset daily volumes
        _checkAndResetDailyVolume();
        _checkAndResetUserVolume(from);
        _checkAndResetUserVolume(to);
        
        if (exempt[from] || exempt[to]) {
            return (true, "", SEVERITY_OK);
        }
        
        if (value < minValue) {
            return (false, "Value below minimum", SEVERITY_CRITICAL);
        }
        if (value > maxValue) {
            return (false, "Value above maximum", SEVERITY_CRITICAL);
        }
        
        // Check daily volume limit
        uint256 newUserVolume = dailyVolume[from] + value;
        if (newUserVolume > dailyVolumeLimit) {
            emit VolumeViolation(from, value, dailyVolume[from], "User daily limit exceeded");
            return (false, "User daily volume limit exceeded", SEVERITY_CRITICAL);
        }
        
        uint256 newGlobalVolume = globalDailyVolume + value;
        if (newGlobalVolume > dailyVolumeLimit * 10) { // Global limit = 10x user limit
            emit VolumeViolation(from, value, globalDailyVolume, "Global daily limit exceeded");
            return (false, "Global daily volume limit exceeded", SEVERITY_CRITICAL);
        }
        
        // Record the volume
        dailyVolume[from] = newUserVolume;
        globalDailyVolume = newGlobalVolume;
        
        return (true, "", SEVERITY_OK);
    }
    
    /**
     * @notice Get user's remaining daily volume
     */
    function getRemainingDailyVolume(address user) external view returns (uint256) {
        uint256 userVolume = dailyVolume[user];
        uint256 userReset = lastVolumeReset[user];
        
        // Check if window expired
        if (block.timestamp >= userReset + DAILY_WINDOW) {
            return dailyVolumeLimit;
        }
        
        if (userVolume >= dailyVolumeLimit) {
            return 0;
        }
        return dailyVolumeLimit - userVolume;
    }
    
    function isReportUsed(bytes32 reportHash) external view returns (bool) {
        return usedReports[reportHash];
    }
}
