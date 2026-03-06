// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../policies/IPolicy.sol";
import "../policies/IPolicyEngine.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SentinelRegistry
 * @notice Opt-in registry for smart contracts wanting Sentinel protection
 * @dev Part of the Sentinel autonomous security oracle system
 * @author Sentinel Team
 * @custom:track Chainlink Convergence Hackathon 2026
 */

contract SentinelRegistry {
    
    /// @notice Registration details for a protected contract
    struct Registration {
        bool isActive;
        uint256 stakedAmount;
        uint256 registeredAt;
        address owner;
        string metadata; // Optional: contract name, version, etc.
        bool policyValidated; // Whether registration passed policy validation
    }
    
    /// @notice Minimum stake required for contract registration (0.01 ETH)
    uint256 public constant MIN_STAKE = 0.01 ether;
    
    /// @notice Maximum time a pause can be active (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
    // ============ Guardian Node Registry ============
    
    /// @notice LINK token address for staking
    address public linkToken;
    
    /// @notice Minimum LINK stake to become a guardian (5 LINK)
    uint256 public constant GUARDIAN_STAKE = 5e18; // 5 LINK (18 decimals)
    
    /// @notice Guardian status
    enum GuardianStatus { 
        Inactive,      // Not registered
        Active,        // Registered and staked
        Suspended,     // Temporarily suspended
        Slashed        // Stake slashed, removed
    }
    
    /// @notice Guardian node details
    struct Guardian {
        GuardianStatus status;
        uint256 stakedAmount;      // LINK staked
        uint256 registeredAt;
        uint256 lastActiveAt;
        uint256 totalPauses;       // Number of successful pauses
        uint256 falsePositives;    // Number of false positives
        uint256 reputationScore;   // 0-10000 (100 = 100%)
        string metadata;           // Node info (name, endpoint, etc.)
    }
    
    /// @notice Guardian registrations
    mapping(address => Guardian) public guardians;
    
    /// @notice List of active guardian addresses
    address[] public guardianList;
    
    /// @notice Mapping to track index in guardianList
    mapping(address => uint256) private guardianIndex;
    
    /// @notice Authorized guardian count
    uint256 public activeGuardianCount;
    
    /// @notice Mapping from contract address to registration details
    mapping(address => Registration) public registrations;
    
    /// @notice List of all protected contracts (for iteration)
    address[] public protectedContracts;
    
    /// @notice Mapping to track index in protectedContracts array
    mapping(address => uint256) private contractIndex;
    
    /// @notice Authorized Sentinel executors (CRE workflow addresses)
    mapping(address => bool) public authorizedSentinels;
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Policy Engine reference for validation
    address public policyEngine;
    
    /// @notice Whether policy validation is required for registration
    bool public policyValidationEnabled;
    
    // Events
    event ContractRegistered(
        address indexed contractAddr, 
        address indexed owner, 
        uint256 stake,
        string metadata,
        bool policyValidated
    );
    
    event ContractDeregistered(
        address indexed contractAddr,
        uint256 stakeReturned
    );
    
    event SentinelAuthorized(address indexed sentinel);
    event SentinelRevoked(address indexed sentinel);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============ Guardian Events ============
    event GuardianRegistered(
        address indexed guardian,
        uint256 stake,
        string metadata
    );
    event GuardianDeregistered(address indexed guardian, uint256 stakeReturned);
    event GuardianSuspended(address indexed guardian, string reason);
    event GuardianReinstated(address indexed guardian);
    event GuardianSlashed(address indexed guardian, uint256 amount, string reason);
    event GuardianReputationUpdated(address indexed guardian, uint256 newScore);
    event GuardianActivityRecorded(address indexed guardian, bool success);
    
    /// @notice Policy Engine related events
    event PolicyEngineSet(address indexed policyEngine);
    event PolicyValidationEnabled(bool enabled);
    event RegistrationValidated(address indexed contractAddr, bool compliant, string reason);
    event RegistrationRejected(address indexed contractAddr, string reason);
    
    // Errors
    error InsufficientStake();
    error AlreadyRegistered();
    error NotRegistered();
    error NotOwner();
    error NotAuthorized();
    error InvalidAddress();
    error TransferFailed();
    error PolicyValidationFailed(string reason);
    error PolicyEngineNotSet();
    error GuardianAlreadyRegistered();
    error GuardianNotRegistered();
    error GuardianNotActive();
    error InsufficientLINKStake();
    error LinkTokenNotSet();
    error SlashingFailed();
    error AlreadySuspended();
    
    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlySentinel() {
        if (!authorizedSentinels[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    constructor(address _linkToken) {
        owner = msg.sender;
        policyValidationEnabled = false; // Disabled by default
        linkToken = _linkToken;
    }
    
    /**
     * @notice Update LINK token address
     */
    function setLinkToken(address _linkToken) external onlyOwner {
        if (_linkToken == address(0)) revert InvalidAddress();
        linkToken = _linkToken;
    }
    
    /**
     * @notice Register a contract for Sentinel protection
     * @param contractAddr The contract address to protect
     * @param metadata Optional metadata (name, version, etc.)
     */
    function register(address contractAddr, string calldata metadata) external payable {
        _registerInternal(contractAddr, metadata);
    }
    
    /**
     * @notice Simplified registration with empty metadata
     */
    function registerSimple(address contractAddr) external payable {
        _registerInternal(contractAddr, "");
    }
    
    /**
     * @notice Internal registration implementation
     */
    function _registerInternal(address contractAddr, string memory metadata) internal {
        if (contractAddr == address(0)) revert InvalidAddress();
        if (msg.value < MIN_STAKE) revert InsufficientStake();
        if (registrations[contractAddr].isActive) revert AlreadyRegistered();
        
        // Policy validation if enabled
        bool validated = false;
        if (policyValidationEnabled && policyEngine != address(0)) {
            validated = _validateRegistration(contractAddr, msg.sender);
        }
        
        registrations[contractAddr] = Registration({
            isActive: true,
            stakedAmount: msg.value,
            registeredAt: block.timestamp,
            owner: msg.sender,
            metadata: metadata,
            policyValidated: validated
        });
        
        contractIndex[contractAddr] = protectedContracts.length;
        protectedContracts.push(contractAddr);
        
        emit ContractRegistered(contractAddr, msg.sender, msg.value, metadata, validated);
    }
    
    /**
     * @notice Deregister a contract and withdraw stake
     * @param contractAddr The contract address to deregister
     */
    function deregister(address contractAddr) external {
        Registration storage reg = registrations[contractAddr];
        
        if (!reg.isActive) revert NotRegistered();
        if (reg.owner != msg.sender) revert NotOwner();
        
        uint256 stakeAmount = reg.stakedAmount;
        
        // Mark as inactive
        reg.isActive = false;
        reg.stakedAmount = 0;
        
        // Remove from array (swap with last element for O(1) removal)
        uint256 index = contractIndex[contractAddr];
        uint256 lastIndex = protectedContracts.length - 1;
        
        if (index != lastIndex) {
            address lastContract = protectedContracts[lastIndex];
            protectedContracts[index] = lastContract;
            contractIndex[lastContract] = index;
        }
        
        protectedContracts.pop();
        delete contractIndex[contractAddr];
        
        // Transfer stake back to owner
        (bool success, ) = payable(msg.sender).call{value: stakeAmount}("");
        if (!success) revert TransferFailed();
        
        emit ContractDeregistered(contractAddr, stakeAmount);
    }
    
    /**
     * @notice Check if a contract is registered
     */
    function isRegistered(address contractAddr) external view returns (bool) {
        return registrations[contractAddr].isActive;
    }
    
    /**
     * @notice Check if a contract is registered and policy validated
     */
    function isRegisteredAndValid(address contractAddr) external view returns (bool) {
        Registration memory reg = registrations[contractAddr];
        return reg.isActive && (!policyValidationEnabled || reg.policyValidated);
    }
    
    /**
     * @notice Get registration details
     */
    function getRegistration(address contractAddr) external view returns (Registration memory) {
        return registrations[contractAddr];
    }
    
    /**
     * @notice Get total number of protected contracts
     */
    function getProtectedCount() external view returns (uint256) {
        return protectedContracts.length;
    }
    
    /**
     * @notice Get all protected contracts (paginated)
     */
    function getProtectedContracts(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = protectedContracts.length;
        
        if (offset >= total) return new address[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = protectedContracts[offset + i];
        }
        
        return result;
    }
    
    /**
     * @notice Authorize a new Sentinel executor
     */
    function authorizeSentinel(address sentinel) external onlyOwner {
        if (sentinel == address(0)) revert InvalidAddress();
        authorizedSentinels[sentinel] = true;
        emit SentinelAuthorized(sentinel);
    }
    
    /**
     * @notice Revoke a Sentinel executor
     */
    function revokeSentinel(address sentinel) external onlyOwner {
        authorizedSentinels[sentinel] = false;
        emit SentinelRevoked(sentinel);
    }
    
    /**
     * @notice Transfer contract ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * @notice Check if address is authorized Sentinel
     */
    function isAuthorizedSentinel(address addr) external view returns (bool) {
        return authorizedSentinels[addr] || addr == owner;
    }
    
    /**
     * @notice Update metadata for a registered contract
     */
    function updateMetadata(address contractAddr, string calldata newMetadata) external {
        Registration storage reg = registrations[contractAddr];
        if (!reg.isActive) revert NotRegistered();
        if (reg.owner != msg.sender) revert NotOwner();
        
        reg.metadata = newMetadata;
    }
    
    // ============ Policy Engine Integration ============
    
    /**
     * @notice Set the Policy Engine address
     * @param _policyEngine Address of the PolicyEngine contract
     */
    function setPolicyEngine(address _policyEngine) external onlyOwner {
        if (_policyEngine == address(0)) revert InvalidAddress();
        policyEngine = _policyEngine;
        emit PolicyEngineSet(_policyEngine);
    }
    
    /**
     * @notice Enable or disable policy validation for registrations
     * @param enabled Whether to require policy validation
     */
    function setPolicyValidationEnabled(bool enabled) external onlyOwner {
        policyValidationEnabled = enabled;
        emit PolicyValidationEnabled(enabled);
    }
    
    /**
     * @notice Validate a registration against policies
     * @param contractAddr The contract to validate
     * @param registrant The address attempting to register
     * @return compliant Whether the registration is compliant
     */
    function validateRegistration(address contractAddr, address registrant) external returns (bool compliant) {
        if (policyEngine == address(0)) revert PolicyEngineNotSet();
        return _validateRegistration(contractAddr, registrant);
    }
    
    /**
     * @notice Internal function to validate registration
     */
    function _validateRegistration(address contractAddr, address registrant) internal returns (bool) {
        // Call PolicyEngine to validate the registration transaction
        // This checks if the registrant or contract is blacklisted, etc.
        try IPolicyEngine(policyEngine).shouldPauseTransaction(
            registrant,
            contractAddr,
            0,
            ""
        ) returns (bool shouldPause, uint8 severity) {
            
            bool compliant = !shouldPause;
            
            if (compliant) {
                emit RegistrationValidated(contractAddr, true, "Registration compliant with policies");
            } else {
                string memory reason = string(abi.encodePacked("Policy violation, severity: ", _uintToString(severity)));
                emit RegistrationRejected(contractAddr, reason);
            }
            
            return compliant;
        } catch {
            // If validation fails, we allow registration but mark as not validated
            emit RegistrationValidated(contractAddr, false, "Validation check failed");
            return false;
        }
    }
    
    /**
     * @notice Re-validate an existing registration
     * @param contractAddr The contract to re-validate
     */
    function revalidateRegistration(address contractAddr) external onlySentinel {
        Registration storage reg = registrations[contractAddr];
        if (!reg.isActive) revert NotRegistered();
        
        if (policyEngine != address(0)) {
            bool validated = _validateRegistration(contractAddr, reg.owner);
            reg.policyValidated = validated;
        }
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Convert uint to string
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
    
    // ============ Guardian Node Functions ============
    
    /**
     * @notice Register as a guardian node with 5 LINK stake
     * @param metadata Node metadata (name, endpoint, contact info)
     */
    function registerGuardian(string calldata metadata) external {
        if (linkToken == address(0)) revert LinkTokenNotSet();
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
            lastActiveAt: block.timestamp,
            totalPauses: 0,
            falsePositives: 0,
            reputationScore: 5000, // Start at 50%
            metadata: metadata
        });
        
        guardianIndex[msg.sender] = guardianList.length;
        guardianList.push(msg.sender);
        activeGuardianCount++;
        
        // Auto-authorize as sentinel
        authorizedSentinels[msg.sender] = true;
        
        emit GuardianRegistered(msg.sender, GUARDIAN_STAKE, metadata);
        emit SentinelAuthorized(msg.sender);
    }
    
    /**
     * @notice Deregister as guardian and withdraw LINK stake
     */
    function deregisterGuardian() external {
        Guardian storage g = guardians[msg.sender];
        if (g.status != GuardianStatus.Active && g.status != GuardianStatus.Suspended) 
            revert GuardianNotRegistered();
        
        uint256 stake = g.stakedAmount;
        
        // Mark as inactive
        g.status = GuardianStatus.Inactive;
        g.stakedAmount = 0;
        
        // Remove from list
        uint256 index = guardianIndex[msg.sender];
        uint256 lastIndex = guardianList.length - 1;
        
        if (index != lastIndex) {
            address lastGuardian = guardianList[lastIndex];
            guardianList[index] = lastGuardian;
            guardianIndex[lastGuardian] = index;
        }
        
        guardianList.pop();
        delete guardianIndex[msg.sender];
        activeGuardianCount--;
        
        // Revoke sentinel authorization
        authorizedSentinels[msg.sender] = false;
        
        // Return LINK stake
        bool success = IERC20(linkToken).transfer(msg.sender, stake);
        if (!success) revert TransferFailed();
        
        emit GuardianDeregistered(msg.sender, stake);
        emit SentinelRevoked(msg.sender);
    }
    
    /**
     * @notice Record guardian activity (called by EmergencyGuardianCRE on successful pause)
     * @param guardian The guardian to record activity for
     * @param success Whether the pause was valid (not a false positive)
     */
    function recordGuardianActivity(address guardian, bool success) external {
        // Can be called by owner or authorized contracts (EmergencyGuardianCRE)
        if (msg.sender != owner && !authorizedSentinels[msg.sender]) revert NotAuthorized();
        
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Active) revert GuardianNotActive();
        
        g.lastActiveAt = block.timestamp;
        
        if (success) {
            g.totalPauses++;
            // Increase reputation (max 10000 = 100%)
            g.reputationScore = min(g.reputationScore + 100, 10000);
        } else {
            g.falsePositives++;
            // Decrease reputation
            g.reputationScore = g.reputationScore > 200 ? g.reputationScore - 200 : 0;
        }
        
        emit GuardianActivityRecorded(guardian, success);
        emit GuardianReputationUpdated(guardian, g.reputationScore);
    }
    
    /**
     * @notice Slash a guardian's stake for malicious behavior
     * @param guardian The guardian to slash
     * @param reason Reason for slashing
     */
    function slashGuardian(address guardian, string calldata reason) external onlyOwner {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Active) revert GuardianNotActive();
        
        uint256 slashAmount = g.stakedAmount;
        g.stakedAmount = 0;
        g.status = GuardianStatus.Slashed;
        g.reputationScore = 0;
        
        // Remove from active list
        uint256 index = guardianIndex[guardian];
        uint256 lastIndex = guardianList.length - 1;
        
        if (index != lastIndex) {
            address lastGuardian = guardianList[lastIndex];
            guardianList[index] = lastGuardian;
            guardianIndex[lastGuardian] = index;
        }
        
        guardianList.pop();
        delete guardianIndex[guardian];
        activeGuardianCount--;
        
        // Revoke sentinel authorization
        authorizedSentinels[guardian] = false;
        
        // Transfer slashed LINK to owner (could be treasury or burn)
        bool success = IERC20(linkToken).transfer(owner, slashAmount);
        if (!success) revert SlashingFailed();
        
        emit GuardianSlashed(guardian, slashAmount, reason);
        emit SentinelRevoked(guardian);
    }
    
    /**
     * @notice Suspend a guardian temporarily
     */
    function suspendGuardian(address guardian, string calldata reason) external onlyOwner {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Active) revert AlreadySuspended();
        
        g.status = GuardianStatus.Suspended;
        authorizedSentinels[guardian] = false;
        activeGuardianCount--;
        
        emit GuardianSuspended(guardian, reason);
        emit SentinelRevoked(guardian);
    }
    
    /**
     * @notice Reinstate a suspended guardian
     */
    function reinstateGuardian(address guardian) external onlyOwner {
        Guardian storage g = guardians[guardian];
        if (g.status != GuardianStatus.Suspended) revert GuardianNotRegistered();
        
        g.status = GuardianStatus.Active;
        authorizedSentinels[guardian] = true;
        activeGuardianCount++;
        
        emit GuardianReinstated(guardian);
        emit SentinelAuthorized(guardian);
    }
    
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
    function getGuardians(uint256 offset, uint256 limit) external view returns (address[] memory) {
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
     * @notice Get all active guardian count
     */
    function getGuardianCount() external view returns (uint256) {
        return guardianList.length;
    }
    
    /**
     * @notice Helper function for min
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    // Allow contract to receive ETH (for potential future features)
    receive() external payable {}
    fallback() external payable {}
}
