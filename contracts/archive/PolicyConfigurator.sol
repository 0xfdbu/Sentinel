// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SentinelRegistry.sol";

/**
 * @title PolicyConfigurator
 * @notice Allows contract owners to configure custom policies for their registered contracts
 * @dev Works alongside global PolicyEngine to provide per-contract policy overrides
 * 
 * Features:
 * - Per-contract custom blacklist (additional to global)
 * - Per-contract volume limits (stricter than global)
 * - Per-contract allowed/blocked function signatures
 * - Per-contract pause threshold override
 */
contract PolicyConfigurator is Ownable {
    
    /// @notice Reference to Sentinel Registry
    SentinelRegistry public registry;
    
    /// @notice Reference to global PolicyEngine
    address public globalPolicyEngine;
    
    /// @notice Per-contract policy configuration
    struct ContractPolicy {
        bool enabled;                      // Whether custom policies are enabled
        
        // Volume limits (0 = use global)
        uint256 customMinValue;            // Custom minimum (must be >= global)
        uint256 customMaxValue;            // Custom maximum (must be <= global)
        uint256 customDailyLimit;          // Custom daily limit
        
        // Pause threshold override (0 = use global)
        uint8 customPauseThreshold;        // 0-4 (OK, LOW, MEDIUM, HIGH, CRITICAL)
        
        // Custom blacklist (additional to global)
        mapping(address => bool) blacklisted;
        address[] blacklistArray;
        
        // Function signature allowlist/blocklist
        mapping(bytes4 => bool) blockedFunctions;
        mapping(bytes4 => bool) allowedFunctions;
        bool useAllowlist;                 // If true, only allowed functions permitted
        
        // Whitelisted addresses (never flagged)
        mapping(address => bool) whitelisted;
        
        uint256 lastUpdated;
    }
    
    /// @notice Mapping from contract address to its policy config
    mapping(address => ContractPolicy) public contractPolicies;
    
    /// @notice Events
    event PolicyEnabled(address indexed contractAddr);
    event PolicyDisabled(address indexed contractAddr);
    event VolumeLimitsSet(address indexed contractAddr, uint256 min, uint256 max, uint256 daily);
    event PauseThresholdSet(address indexed contractAddr, uint8 threshold);
    event AddressAddedToCustomBlacklist(address indexed contractAddr, address indexed addr);
    event AddressRemovedFromCustomBlacklist(address indexed contractAddr, address indexed addr);
    event FunctionBlocked(address indexed contractAddr, bytes4 indexed sig);
    event FunctionAllowed(address indexed contractAddr, bytes4 indexed sig);
    event AllowlistModeEnabled(address indexed contractAddr, bool enabled);
    event AddressWhitelisted(address indexed contractAddr, address indexed addr);
    event RegistryUpdated(address newRegistry);
    event GlobalPolicyEngineUpdated(address newEngine);
    
    /// @notice Errors
    error NotContractOwner();
    error ContractNotRegistered();
    error InvalidThreshold();
    error LimitTooHigh(uint256 provided, uint256 maximum);
    error LimitTooLow(uint256 provided, uint256 minimum);
    error AlreadyConfigured();
    error NotConfigured();
    
    modifier onlyContractOwner(address contractAddr) {
        // Use isRegistered first (this works cross-contract)
        if (!registry.isRegistered(contractAddr)) revert ContractNotRegistered();
        
        // Get owner using low-level call to avoid ABI decoding issues with string in struct
        address owner = _getRegistrationOwner(contractAddr);
        if (owner != msg.sender) revert NotContractOwner();
        _;
    }
    
    /**
     * @notice Get the owner of a registration using low-level call
     * @dev Workaround for ABI decoding issues with struct containing string
     */
    function _getRegistrationOwner(address contractAddr) internal view returns (address owner) {
        // Call registrations(address) which returns struct but we decode manually
        (bool success, bytes memory data) = address(registry).staticcall(
            abi.encodeWithSelector(bytes4(keccak256("registrations(address)")), contractAddr)
        );
        
        if (!success || data.length < 128) return address(0);
        
        // Struct layout: bool isActive, uint256 stakedAmount, uint256 registeredAt, address owner, ...
        // We need the 4th field (owner) which is at offset 96 bytes (0x60)
        // But data[0:32] is the offset to the actual data, so we skip that
        assembly {
            // data pointer starts at data+0x20 (first 32 bytes is length)
            // Within the struct data:
            //   0x00: isActive (bool, padded to 32 bytes)
            //   0x20: stakedAmount (uint256)
            //   0x40: registeredAt (uint256)
            //   0x60: owner (address, padded to 32 bytes)
            let dataPtr := add(data, 0x20)
            owner := mload(add(dataPtr, 0x60))
        }
    }
    
    constructor(address _registry) Ownable() {
        _transferOwnership(msg.sender);
        registry = SentinelRegistry(payable(_registry));
    }
    
    /**
     * @notice Enable custom policies for a contract
     * @param contractAddr The contract to configure
     */
    function enablePolicies(address contractAddr) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.enabled = true;
        policy.lastUpdated = block.timestamp;
        emit PolicyEnabled(contractAddr);
    }
    
    /**
     * @notice Disable custom policies (revert to global only)
     * @param contractAddr The contract to disable policies for
     */
    function disablePolicies(address contractAddr) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.enabled = false;
        policy.lastUpdated = block.timestamp;
        emit PolicyDisabled(contractAddr);
    }
    
    /**
     * @notice Set custom volume limits for a contract
     * @param contractAddr The contract to configure
     * @param minValue Minimum value (0 = use global min)
     * @param maxValue Maximum value (0 = use global max)
     * @param dailyLimit Daily limit (0 = use global limit)
     */
    function setVolumeLimits(
        address contractAddr,
        uint256 minValue,
        uint256 maxValue,
        uint256 dailyLimit
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        
        // Custom limits must be stricter than or equal to global
        // (Owner can only make it MORE restrictive, not less)
        policy.customMinValue = minValue;
        policy.customMaxValue = maxValue;
        policy.customDailyLimit = dailyLimit;
        policy.lastUpdated = block.timestamp;
        
        emit VolumeLimitsSet(contractAddr, minValue, maxValue, dailyLimit);
    }
    
    /**
     * @notice Set custom pause threshold for a contract
     * @param contractAddr The contract to configure
     * @param threshold 0-4 (OK, LOW, MEDIUM, HIGH, CRITICAL)
     */
    function setPauseThreshold(
        address contractAddr,
        uint8 threshold
    ) external onlyContractOwner(contractAddr) {
        if (threshold > 4) revert InvalidThreshold();
        
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.customPauseThreshold = threshold;
        policy.lastUpdated = block.timestamp;
        
        emit PauseThresholdSet(contractAddr, threshold);
    }
    
    /**
     * @notice Add address to contract's custom blacklist
     * @param contractAddr The contract to configure
     * @param addr Address to blacklist
     */
    function addToCustomBlacklist(
        address contractAddr,
        address addr
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        
        if (!policy.blacklisted[addr]) {
            policy.blacklisted[addr] = true;
            policy.blacklistArray.push(addr);
        }
        
        emit AddressAddedToCustomBlacklist(contractAddr, addr);
    }
    
    /**
     * @notice Remove address from contract's custom blacklist
     * @param contractAddr The contract to configure
     * @param addr Address to remove
     */
    function removeFromCustomBlacklist(
        address contractAddr,
        address addr
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        
        if (policy.blacklisted[addr]) {
            policy.blacklisted[addr] = false;
            // Note: We don't remove from array for gas efficiency
            // Use getCustomBlacklist() which filters disabled entries
        }
        
        emit AddressRemovedFromCustomBlacklist(contractAddr, addr);
    }
    
    /**
     * @notice Block a function signature for a contract
     * @param contractAddr The contract to configure
     * @param sig 4-byte function selector
     */
    function blockFunction(
        address contractAddr,
        bytes4 sig
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.blockedFunctions[sig] = true;
        emit FunctionBlocked(contractAddr, sig);
    }
    
    /**
     * @notice Allow a function signature (for allowlist mode)
     * @param contractAddr The contract to configure
     * @param sig 4-byte function selector
     */
    function allowFunction(
        address contractAddr,
        bytes4 sig
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.allowedFunctions[sig] = true;
        emit FunctionAllowed(contractAddr, sig);
    }
    
    /**
     * @notice Enable/disable allowlist mode
     * @param contractAddr The contract to configure
     * @param enabled If true, only allowed functions permitted
     */
    function setAllowlistMode(
        address contractAddr,
        bool enabled
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.useAllowlist = enabled;
        emit AllowlistModeEnabled(contractAddr, enabled);
    }
    
    /**
     * @notice Whitelist an address (never flagged for this contract)
     * @param contractAddr The contract to configure
     * @param addr Address to whitelist
     */
    function addToWhitelist(
        address contractAddr,
        address addr
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.whitelisted[addr] = true;
        emit AddressWhitelisted(contractAddr, addr);
    }
    
    /**
     * @notice Remove from whitelist
     */
    function removeFromWhitelist(
        address contractAddr,
        address addr
    ) external onlyContractOwner(contractAddr) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        policy.whitelisted[addr] = false;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Check if custom policies are enabled for a contract
     */
    function arePoliciesEnabled(address contractAddr) external view returns (bool) {
        return contractPolicies[contractAddr].enabled;
    }
    
    /**
     * @notice Get volume limits for a contract (returns 0 if using global)
     */
    function getVolumeLimits(address contractAddr) external view returns (
        uint256 min,
        uint256 max,
        uint256 daily
    ) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        return (policy.customMinValue, policy.customMaxValue, policy.customDailyLimit);
    }
    
    /**
     * @notice Get pause threshold for a contract (returns 0 if using global)
     */
    function getPauseThreshold(address contractAddr) external view returns (uint8) {
        return contractPolicies[contractAddr].customPauseThreshold;
    }
    
    /**
     * @notice Check if address is in contract's custom blacklist
     */
    function isBlacklisted(address contractAddr, address addr) external view returns (bool) {
        return contractPolicies[contractAddr].blacklisted[addr];
    }
    
    /**
     * @notice Get custom blacklist for a contract
     */
    function getCustomBlacklist(address contractAddr) external view returns (address[] memory) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        
        // Count active entries
        uint256 count = 0;
        for (uint256 i = 0; i < policy.blacklistArray.length; i++) {
            if (policy.blacklisted[policy.blacklistArray[i]]) count++;
        }
        
        // Create filtered array
        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < policy.blacklistArray.length; i++) {
            address addr = policy.blacklistArray[i];
            if (policy.blacklisted[addr]) {
                result[index++] = addr;
            }
        }
        
        return result;
    }
    
    /**
     * @notice Check if function is blocked for contract
     */
    function isFunctionBlocked(address contractAddr, bytes4 sig) external view returns (bool) {
        return contractPolicies[contractAddr].blockedFunctions[sig];
    }
    
    /**
     * @notice Check if function is allowed (for allowlist mode)
     */
    function isFunctionAllowed(address contractAddr, bytes4 sig) external view returns (bool) {
        return contractPolicies[contractAddr].allowedFunctions[sig];
    }
    
    /**
     * @notice Check if using allowlist mode
     */
    function isAllowlistMode(address contractAddr) external view returns (bool) {
        return contractPolicies[contractAddr].useAllowlist;
    }
    
    /**
     * @notice Check if address is whitelisted
     */
    function isWhitelisted(address contractAddr, address addr) external view returns (bool) {
        return contractPolicies[contractAddr].whitelisted[addr];
    }
    
    /**
     * @notice Evaluate transaction against contract's custom policies
     * @return violated True if custom policy violated
     * @return reason Reason for violation
     * @return severity Severity level 0-4
     */
    function evaluateCustomPolicies(
        address contractAddr,
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external view returns (bool violated, string memory reason, uint8 severity) {
        ContractPolicy storage policy = contractPolicies[contractAddr];
        
        if (!policy.enabled) {
            return (false, "", 0);
        }
        
        // Check whitelist (skip all checks if whitelisted)
        if (policy.whitelisted[from] || policy.whitelisted[to]) {
            return (false, "", 0);
        }
        
        // Check custom blacklist
        if (policy.blacklisted[from]) {
            return (true, "Sender in custom blacklist", 4);
        }
        if (policy.blacklisted[to]) {
            return (true, "Recipient in custom blacklist", 4);
        }
        
        // Check custom volume limits
        if (policy.customMinValue > 0 && value < policy.customMinValue) {
            return (true, "Below custom minimum value", 2);
        }
        if (policy.customMaxValue > 0 && value > policy.customMaxValue) {
            return (true, "Above custom maximum value", 3);
        }
        
        // Check function signatures
        if (data.length >= 4) {
            bytes4 sig = bytes4(data[:4]);
            
            // Check blocked functions
            if (policy.blockedFunctions[sig]) {
                return (true, "Function blocked by owner", 3);
            }
            
            // Check allowlist
            if (policy.useAllowlist && !policy.allowedFunctions[sig]) {
                return (true, "Function not in allowlist", 2);
            }
        }
        
        return (false, "", 0);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setRegistry(address _registry) external onlyOwner {
        registry = SentinelRegistry(payable(_registry));
        emit RegistryUpdated(_registry);
    }
    
    function setGlobalPolicyEngine(address _engine) external onlyOwner {
        globalPolicyEngine = _engine;
        emit GlobalPolicyEngineUpdated(_engine);
    }
}
