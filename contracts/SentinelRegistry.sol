// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SentinelRegistry
 * @notice Opt-in registry for smart contracts wanting Sentinel protection
 * @dev Part of the Sentinel autonomous security oracle system
 * @author Sentinel Team
 * @track Chainlink Convergence Hackathon 2026
 */

contract SentinelRegistry {
    
    /// @notice Registration details for a protected contract
    struct Registration {
        bool isActive;
        uint256 stakedAmount;
        uint256 registeredAt;
        address owner;
        string metadata; // Optional: contract name, version, etc.
    }
    
    /// @notice Minimum stake required for registration (0.01 ETH)
    uint256 public constant MIN_STAKE = 0.01 ether;
    
    /// @notice Maximum time a pause can be active (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
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
    
    // Events
    event ContractRegistered(
        address indexed contractAddr, 
        address indexed owner, 
        uint256 stake,
        string metadata
    );
    
    event ContractDeregistered(
        address indexed contractAddr,
        uint256 stakeReturned
    );
    
    event SentinelAuthorized(address indexed sentinel);
    event SentinelRevoked(address indexed sentinel);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Errors
    error InsufficientStake();
    error AlreadyRegistered();
    error NotRegistered();
    error NotOwner();
    error NotAuthorized();
    error InvalidAddress();
    error TransferFailed();
    
    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    modifier onlySentinel() {
        if (!authorizedSentinels[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Register a contract for Sentinel protection
     * @param contractAddr The contract address to protect
     * @param metadata Optional metadata (name, version, etc.)
     */
    function register(address contractAddr, string calldata metadata) external payable {
        if (contractAddr == address(0)) revert InvalidAddress();
        if (msg.value < MIN_STAKE) revert InsufficientStake();
        if (registrations[contractAddr].isActive) revert AlreadyRegistered();
        
        registrations[contractAddr] = Registration({
            isActive: true,
            stakedAmount: msg.value,
            registeredAt: block.timestamp,
            owner: msg.sender,
            metadata: metadata
        });
        
        contractIndex[contractAddr] = protectedContracts.length;
        protectedContracts.push(contractAddr);
        
        emit ContractRegistered(contractAddr, msg.sender, msg.value, metadata);
    }
    
    /**
     * @notice Simplified registration with empty metadata
     */
    function register(address contractAddr) external payable {
        register(contractAddr, "");
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
    
    // Allow contract to receive ETH (for potential future features)
    receive() external payable {}
    fallback() external payable {}
}
