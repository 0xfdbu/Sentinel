// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./SentinelRegistry.sol";

/**
 * @title RiskProfileRegistry
 * @notice Per-contract risk configuration and compliance controls
 * @dev Part of Sentinel Risk & Compliance module
 * @author Sentinel Team
 * @track Chainlink Convergence Hackathon 2026 - Risk & Compliance
 * 
 * Features:
 * - Risk profiles per contract (conservative, moderate, aggressive)
 * - Transaction limits (max daily volume, max single tx)
 * - Compliance hooks (KYC/AML checks)
 * - Counterparty whitelisting/blacklisting
 * - Circuit breakers for unusual activity
 * - Multi-sig guardian configuration
 */

contract RiskProfileRegistry is Ownable, AccessControl {
    
    /// @notice Sentinel Registry reference
    SentinelRegistry public registry;
    
    /// @notice Risk level enumeration
    enum RiskLevel { CONSERVATIVE, MODERATE, AGGRESSIVE, CUSTOM }
    
    /// @notice Action types for tiered authority
    enum ActionType { 
        PAUSE,              // 1-of-N guardians
        UNPAUSE,            // 2-of-N guardians
        EMERGENCY_WITHDRAW, // 3-of-N guardians or timelock
        UPDATE_RISK_PROFILE,// Contract owner only
        ADD_GUARDIAN,       // Contract owner + 1 guardian
        REMOVE_GUARDIAN     // Contract owner + 2 guardians
    }
    
    /// @notice Risk profile for a contract
    struct RiskProfile {
        RiskLevel level;
        uint256 maxDailyVolume;         // Max daily transaction volume
        uint256 maxSingleTxValue;       // Max single transaction value
        uint256 maxTxPerHour;           // Rate limiting
        uint256 volatilityThreshold;    // Price volatility tolerance (100 = 1%)
        bool requireKYC;                // KYC requirement flag
        bool requireWhitelist;          // Whitelist-only mode
        uint256 circuitBreakerThreshold; // Auto-pause threshold
        uint256 timelockDelay;          // Delay for sensitive operations
        bool isActive;
    }
    
    /// @notice Guardian configuration (multi-sig)
    struct GuardianConfig {
        address[] guardians;
        mapping(address => bool) isGuardian;
        mapping(uint8 => uint256) thresholdForAction; // ActionType => required signatures
        uint256 totalGuardians;
        bool isMultiSig;
    }
    
    /// @notice Compliance check (KYC/AML)
    struct ComplianceCheck {
        bool hasKYC;
        uint256 kycExpiry;
        uint256 riskRating;     // 1-10 (10 = highest risk)
        bool isSanctioned;
        bytes32 jurisdiction;
    }
    
    /// @notice Circuit breaker state
    struct CircuitBreaker {
        uint256 triggeredAt;
        uint256 volumeLastHour;
        uint256 txCountLastHour;
        uint256 lastResetBlock;
        bool isTriggered;
        string reason;
    }
    
    /// @notice Risk profiles per contract
    mapping(address => RiskProfile) public riskProfiles;
    
    /// @notice Guardian configs per contract
    mapping(address => GuardianConfig) public guardianConfigs;
    
    /// @notice Compliance data per address
    mapping(address => ComplianceCheck) public complianceData;
    
    /// @notice Whitelist per contract (contract => user => isWhitelisted)
    mapping(address => mapping(address => bool)) public whitelists;
    
    /// @notice Blacklist per contract
    mapping(address => mapping(address => bool)) public blacklists;
    
    /// @notice Circuit breaker state per contract
    mapping(address => CircuitBreaker) public circuitBreakers;
    
    /// @notice Authorized compliance oracles
    mapping(address => bool) public complianceOracles;
    
    /// @notice Transaction volume tracking (contract => day => volume)
    mapping(address => mapping(uint256 => uint256)) public dailyVolumes;
    
    /// @notice Default risk profiles
    RiskProfile public defaultConservative;
    RiskProfile public defaultModerate;
    RiskProfile public defaultAggressive;
    
    /// @notice Role for compliance oracles
    bytes32 public constant COMPLIANCE_ORACLE_ROLE = keccak256("COMPLIANCE_ORACLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN");
    
    /// @notice Events
    event RiskProfileSet(
        address indexed contractAddr,
        RiskLevel level,
        uint256 maxDailyVolume,
        uint256 maxSingleTxValue
    );
    
    event GuardianAdded(address indexed contractAddr, address indexed guardian);
    event GuardianRemoved(address indexed contractAddr, address indexed guardian);
    event ThresholdSet(address indexed contractAddr, ActionType action, uint256 threshold);
    
    event ComplianceUpdated(
        address indexed user,
        bool hasKYC,
        uint256 riskRating,
        bool isSanctioned
    );
    
    event WhitelistUpdated(address indexed contractAddr, address indexed user, bool status);
    event BlacklistUpdated(address indexed contractAddr, address indexed user, bool status);
    
    event CircuitBreakerTriggered(
        address indexed contractAddr,
        string reason,
        uint256 volume,
        uint256 txCount
    );
    
    event TransactionValidated(
        address indexed contractAddr,
        address indexed user,
        uint256 value,
        bool passed
    );
    
    event MultiSigActionProposed(
        bytes32 indexed actionHash,
        address indexed contractAddr,
        ActionType action,
        address proposer
    );
    
    event MultiSigActionExecuted(
        bytes32 indexed actionHash,
        address indexed contractAddr,
        ActionType action
    );
    
    /// @notice Errors
    error ContractNotRegistered();
    error NotContractOwner();
    error InvalidRiskLevel();
    error InvalidThreshold();
    error AlreadyGuardian();
    error NotGuardian();
    error UnauthorizedAction();
    error KYCRequired();
    error NotWhitelisted();
    error IsBlacklisted();
    error IsSanctioned();
    error DailyVolumeExceeded();
    error SingleTxLimitExceeded();
    error RateLimitExceeded();
    error CircuitBreakerActive();
    error ComplianceOracleRequired();
    error InsufficientSignatures();
    error ActionAlreadyExecuted();
    
    /// @notice Multi-sig action tracking
    mapping(bytes32 => mapping(address => bool)) public actionSignatures;
    mapping(bytes32 => uint256) public actionSignatureCount;
    mapping(bytes32 => bool) public actionExecuted;
    
    /// @notice Modifiers
    modifier onlyRegistered(address contractAddr) {
        if (!registry.isRegistered(contractAddr)) revert ContractNotRegistered();
        _;
    }
    
    modifier onlyContractOwner(address contractAddr) {
        (, , , address owner, ) = registry.registrations(contractAddr);
        if (owner != msg.sender && msg.sender != owner()) revert NotContractOwner();
        _;
    }
    
    modifier onlyComplianceOracle() {
        if (!complianceOracles[msg.sender] && !hasRole(COMPLIANCE_ORACLE_ROLE, msg.sender)) {
            revert ComplianceOracleRequired();
        }
        _;
    }
    
    modifier onlyGuardian(address contractAddr) {
        if (!guardianConfigs[contractAddr].isGuardian[msg.sender]) revert NotGuardian();
        _;
    }
    
    modifier circuitBreakerCheck(address contractAddr) {
        if (circuitBreakers[contractAddr].isTriggered) revert CircuitBreakerActive();
        _;
    }
    
    constructor(address _registry) Ownable(msg.sender) {
        registry = SentinelRegistry(_registry);
        
        // Setup default profiles
        defaultConservative = RiskProfile({
            level: RiskLevel.CONSERVATIVE,
            maxDailyVolume: 100 ether,
            maxSingleTxValue: 10 ether,
            maxTxPerHour: 10,
            volatilityThreshold: 200,  // 2%
            requireKYC: true,
            requireWhitelist: true,
            circuitBreakerThreshold: 50000, // 50% volume spike
            timelockDelay: 2 days,
            isActive: true
        });
        
        defaultModerate = RiskProfile({
            level: RiskLevel.MODERATE,
            maxDailyVolume: 1000 ether,
            maxSingleTxValue: 100 ether,
            maxTxPerHour: 100,
            volatilityThreshold: 500,  // 5%
            requireKYC: false,
            requireWhitelist: false,
            circuitBreakerThreshold: 100000, // 100% volume spike
            timelockDelay: 1 days,
            isActive: true
        });
        
        defaultAggressive = RiskProfile({
            level: RiskLevel.AGGRESSIVE,
            maxDailyVolume: type(uint256).max,
            maxSingleTxValue: type(uint256).max,
            maxTxPerHour: type(uint256).max,
            volatilityThreshold: 1000,  // 10%
            requireKYC: false,
            requireWhitelist: false,
            circuitBreakerThreshold: 200000, // 200% volume spike
            timelockDelay: 1 hours,
            isActive: true
        });
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Set risk profile for a contract using preset
     */
    function setRiskProfilePreset(
        address contractAddr,
        RiskLevel level
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        RiskProfile storage profile = riskProfiles[contractAddr];
        
        if (level == RiskLevel.CONSERVATIVE) {
            profile = defaultConservative;
        } else if (level == RiskLevel.MODERATE) {
            profile = defaultModerate;
        } else if (level == RiskLevel.AGGRESSIVE) {
            profile = defaultAggressive;
        } else {
            revert InvalidRiskLevel();
        }
        
        profile.level = level;
        profile.isActive = true;
        
        emit RiskProfileSet(
            contractAddr,
            level,
            profile.maxDailyVolume,
            profile.maxSingleTxValue
        );
    }
    
    /**
     * @notice Set custom risk profile for a contract
     */
    function setCustomRiskProfile(
        address contractAddr,
        RiskProfile calldata customProfile
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        if (customProfile.maxDailyVolume == 0) revert InvalidThreshold();
        
        riskProfiles[contractAddr] = customProfile;
        riskProfiles[contractAddr].level = RiskLevel.CUSTOM;
        riskProfiles[contractAddr].isActive = true;
        
        emit RiskProfileSet(
            contractAddr,
            RiskLevel.CUSTOM,
            customProfile.maxDailyVolume,
            customProfile.maxSingleTxValue
        );
    }
    
    /**
     * @notice Add a guardian to a contract (multi-sig)
     */
    function addGuardian(
        address contractAddr,
        address guardian
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        GuardianConfig storage config = guardianConfigs[contractAddr];
        
        if (config.isGuardian[guardian]) revert AlreadyGuardian();
        
        config.guardians.push(guardian);
        config.isGuardian[guardian] = true;
        config.totalGuardians++;
        config.isMultiSig = config.totalGuardians > 1;
        
        // Set default thresholds
        if (config.totalGuardians == 1) {
            config.thresholdForAction[uint8(ActionType.PAUSE)] = 1;
            config.thresholdForAction[uint8(ActionType.UNPAUSE)] = 1;
        } else {
            config.thresholdForAction[uint8(ActionType.PAUSE)] = 1;
            config.thresholdForAction[uint8(ActionType.UNPAUSE)] = 2;
            config.thresholdForAction[uint8(ActionType.EMERGENCY_WITHDRAW)] = config.totalGuardians;
        }
        
        _grantRole(GUARDIAN_ROLE, guardian);
        
        emit GuardianAdded(contractAddr, guardian);
    }
    
    /**
     * @notice Remove a guardian from a contract
     */
    function removeGuardian(
        address contractAddr,
        address guardian
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        GuardianConfig storage config = guardianConfigs[contractAddr];
        
        if (!config.isGuardian[guardian]) revert NotGuardian();
        
        config.isGuardian[guardian] = false;
        config.totalGuardians--;
        config.isMultiSig = config.totalGuardians > 1;
        
        // Remove from array
        for (uint256 i = 0; i < config.guardians.length; i++) {
            if (config.guardians[i] == guardian) {
                config.guardians[i] = config.guardians[config.guardians.length - 1];
                config.guardians.pop();
                break;
            }
        }
        
        _revokeRole(GUARDIAN_ROLE, guardian);
        
        emit GuardianRemoved(contractAddr, guardian);
    }
    
    /**
     * @notice Set threshold for an action type
     */
    function setActionThreshold(
        address contractAddr,
        ActionType action,
        uint256 threshold
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        GuardianConfig storage config = guardianConfigs[contractAddr];
        
        if (threshold == 0 || threshold > config.totalGuardians) revert InvalidThreshold();
        
        config.thresholdForAction[uint8(action)] = threshold;
        
        emit ThresholdSet(contractAddr, action, threshold);
    }
    
    /**
     * @notice Validate transaction against risk profile
     */
    function validateTransaction(
        address contractAddr,
        address user,
        uint256 value
    ) external onlyRegistered(contractAddr) circuitBreakerCheck(contractAddr) returns (bool) {
        RiskProfile storage profile = riskProfiles[contractAddr];
        
        if (!profile.isActive) return true; // No restrictions if no profile set
        
        // Check compliance
        if (profile.requireKYC) {
            if (!complianceData[user].hasKYC || complianceData[user].kycExpiry < block.timestamp) {
                revert KYCRequired();
            }
        }
        
        // Check sanctions
        if (complianceData[user].isSanctioned) {
            revert IsSanctioned();
        }
        
        // Check whitelist
        if (profile.requireWhitelist && !whitelists[contractAddr][user]) {
            revert NotWhitelisted();
        }
        
        // Check blacklist
        if (blacklists[contractAddr][user]) {
            revert IsBlacklisted();
        }
        
        // Check single transaction limit
        if (value > profile.maxSingleTxValue) {
            revert SingleTxLimitExceeded();
        }
        
        // Check daily volume
        uint256 today = block.timestamp / 1 days;
        if (dailyVolumes[contractAddr][today] + value > profile.maxDailyVolume) {
            revert DailyVolumeExceeded();
        }
        
        // Update tracking
        dailyVolumes[contractAddr][today] += value;
        
        // Update circuit breaker metrics
        _updateCircuitBreakerMetrics(contractAddr, value);
        
        emit TransactionValidated(contractAddr, user, value, true);
        
        return true;
    }
    
    /**
     * @notice Update compliance data for a user (KYC/AML oracle)
     */
    function updateCompliance(
        address user,
        bool hasKYC,
        uint256 kycExpiry,
        uint256 riskRating,
        bool isSanctioned,
        bytes32 jurisdiction
    ) external onlyComplianceOracle {
        complianceData[user] = ComplianceCheck({
            hasKYC: hasKYC,
            kycExpiry: kycExpiry,
            riskRating: riskRating,
            isSanctioned: isSanctioned,
            jurisdiction: jurisdiction
        });
        
        emit ComplianceUpdated(user, hasKYC, riskRating, isSanctioned);
    }
    
    /**
     * @notice Batch update compliance data
     */
    function batchUpdateCompliance(
        address[] calldata users,
        bool[] calldata hasKYCs,
        uint256[] calldata kycExpiries,
        uint256[] calldata riskRatings,
        bool[] calldata isSanctionedList
    ) external onlyComplianceOracle {
        require(users.length == hasKYCs.length, "Length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            complianceData[users[i]] = ComplianceCheck({
                hasKYC: hasKYCs[i],
                kycExpiry: kycExpiries[i],
                riskRating: riskRatings[i],
                isSanctioned: isSanctionedList[i],
                jurisdiction: bytes32(0)
            });
            
            emit ComplianceUpdated(users[i], hasKYCs[i], riskRatings[i], isSanctionedList[i]);
        }
    }
    
    /**
     * @notice Update whitelist status
     */
    function setWhitelistStatus(
        address contractAddr,
        address user,
        bool status
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        whitelists[contractAddr][user] = status;
        emit WhitelistUpdated(contractAddr, user, status);
    }
    
    /**
     * @notice Update blacklist status
     */
    function setBlacklistStatus(
        address contractAddr,
        address user,
        bool status
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        blacklists[contractAddr][user] = status;
        emit BlacklistUpdated(contractAddr, user, status);
    }
    
    /**
     * @notice Batch whitelist update
     */
    function batchSetWhitelist(
        address contractAddr,
        address[] calldata users,
        bool[] calldata statuses
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        require(users.length == statuses.length, "Length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            whitelists[contractAddr][users[i]] = statuses[i];
            emit WhitelistUpdated(contractAddr, users[i], statuses[i]);
        }
    }
    
    /**
     * @notice Propose a multi-sig action
     */
    function proposeAction(
        address contractAddr,
        ActionType action,
        bytes calldata data
    ) external onlyGuardian(contractAddr) returns (bytes32 actionHash) {
        actionHash = keccak256(abi.encodePacked(contractAddr, action, data, block.timestamp));
        
        // First signer
        actionSignatures[actionHash][msg.sender] = true;
        actionSignatureCount[actionHash] = 1;
        
        emit MultiSigActionProposed(actionHash, contractAddr, action, msg.sender);
        
        return actionHash;
    }
    
    /**
     * @notice Sign a proposed action
     */
    function signAction(bytes32 actionHash) external onlyGuardian(address(0)) {
        if (actionExecuted[actionHash]) revert ActionAlreadyExecuted();
        if (actionSignatures[actionHash][msg.sender]) revert UnauthorizedAction();
        
        actionSignatures[actionHash][msg.sender] = true;
        actionSignatureCount[actionHash]++;
    }
    
    /**
     * @notice Execute a multi-sig action if threshold met
     */
    function executeAction(
        bytes32 actionHash,
        address contractAddr,
        ActionType action,
        bytes calldata data
    ) external {
        if (actionExecuted[actionHash]) revert ActionAlreadyExecuted();
        
        GuardianConfig storage config = guardianConfigs[contractAddr];
        uint256 required = config.thresholdForAction[uint8(action)];
        
        if (actionSignatureCount[actionHash] < required) {
            revert InsufficientSignatures();
        }
        
        actionExecuted[actionHash] = true;
        
        emit MultiSigActionExecuted(actionHash, contractAddr, action);
        
        // Action execution would be handled by external call
        // This contract just tracks signatures
    }
    
    /**
     * @notice Manually trigger circuit breaker
     */
    function triggerCircuitBreaker(
        address contractAddr,
        string calldata reason
    ) external onlyGuardian(contractAddr) {
        _triggerCircuitBreaker(contractAddr, reason);
    }
    
    /**
     * @notice Reset circuit breaker
     */
    function resetCircuitBreaker(address contractAddr) 
        external 
        onlyRegistered(contractAddr) 
        onlyContractOwner(contractAddr) 
    {
        CircuitBreaker storage cb = circuitBreakers[contractAddr];
        cb.isTriggered = false;
        cb.volumeLastHour = 0;
        cb.txCountLastHour = 0;
    }
    
    /**
     * @notice Get risk profile for a contract
     */
    function getRiskProfile(address contractAddr) 
        external 
        view 
        returns (RiskProfile memory) 
    {
        return riskProfiles[contractAddr];
    }
    
    /**
     * @notice Get guardians for a contract
     */
    function getGuardians(address contractAddr) 
        external 
        view 
        returns (address[] memory) 
    {
        return guardianConfigs[contractAddr].guardians;
    }
    
    /**
     * @notice Check if user can transact with contract
     */
    function canTransact(address contractAddr, address user, uint256 value) 
        external 
        view 
        returns (bool, string memory reason) 
    {
        RiskProfile storage profile = riskProfiles[contractAddr];
        
        if (circuitBreakers[contractAddr].isTriggered) {
            return (false, "Circuit breaker active");
        }
        
        if (profile.requireKYC && !complianceData[user].hasKYC) {
            return (false, "KYC required");
        }
        
        if (complianceData[user].isSanctioned) {
            return (false, "Address sanctioned");
        }
        
        if (profile.requireWhitelist && !whitelists[contractAddr][user]) {
            return (false, "Not whitelisted");
        }
        
        if (blacklists[contractAddr][user]) {
            return (false, "Blacklisted");
        }
        
        if (value > profile.maxSingleTxValue) {
            return (false, "Exceeds single tx limit");
        }
        
        uint256 today = block.timestamp / 1 days;
        if (dailyVolumes[contractAddr][today] + value > profile.maxDailyVolume) {
            return (false, "Daily volume exceeded");
        }
        
        return (true, "");
    }
    
    /**
     * @notice Authorize compliance oracle
     */
    function authorizeComplianceOracle(address oracle) external onlyOwner {
        complianceOracles[oracle] = true;
        _grantRole(COMPLIANCE_ORACLE_ROLE, oracle);
    }
    
    /**
     * @notice Revoke compliance oracle
     */
    function revokeComplianceOracle(address oracle) external onlyOwner {
        complianceOracles[oracle] = false;
        _revokeRole(COMPLIANCE_ORACLE_ROLE, oracle);
    }
    
    /**
     * @notice Update registry reference
     */
    function setRegistry(address _registry) external onlyOwner {
        registry = SentinelRegistry(_registry);
    }
    
    /**
     * @notice Update circuit breaker metrics
     */
    function _updateCircuitBreakerMetrics(address contractAddr, uint256 value) internal {
        CircuitBreaker storage cb = circuitBreakers[contractAddr];
        RiskProfile storage profile = riskProfiles[contractAddr];
        
        // Reset hourly metrics if needed
        if (block.number - cb.lastResetBlock > 300) { // ~1 hour
            cb.volumeLastHour = 0;
            cb.txCountLastHour = 0;
            cb.lastResetBlock = block.number;
        }
        
        cb.volumeLastHour += value;
        cb.txCountLastHour++;
        
        // Check thresholds
        if (cb.volumeLastHour > profile.maxDailyVolume / 24) {
            _triggerCircuitBreaker(contractAddr, "Hourly volume spike detected");
        }
        
        if (cb.txCountLastHour > profile.maxTxPerHour) {
            _triggerCircuitBreaker(contractAddr, "Transaction rate exceeded");
        }
    }
    
    /**
     * @notice Trigger circuit breaker
     */
    function _triggerCircuitBreaker(address contractAddr, string memory reason) internal {
        CircuitBreaker storage cb = circuitBreakers[contractAddr];
        
        cb.isTriggered = true;
        cb.triggeredAt = block.timestamp;
        cb.reason = reason;
        
        emit CircuitBreakerTriggered(contractAddr, reason, cb.volumeLastHour, cb.txCountLastHour);
    }
    
    receive() external payable {}
}
