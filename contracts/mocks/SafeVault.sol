// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SafeVault
 * @notice SECURE VERSION of the vault with proper protections
 * @dev Demonstrates best practices that Sentinel should recognize as safe
 * @track Chainlink Convergence Hackathon 2026 - Testing Only
 */

contract SafeVault is Pausable, ReentrancyGuard, AccessControl {
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    /// @notice User balances
    mapping(address => uint256) public balances;
    
    /// @notice Total ETH deposited
    uint256 public totalDeposits;
    
    /// @notice Emergency pause info (for demo tracking)
    address public lastPausedBy;
    uint256 public lastPausedAt;
    bytes32 public lastVulnHash;
    
    /// @notice Events
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event EmergencyPaused(address indexed pauser, bytes32 vulnHash);
    event EmergencyUnpaused(address indexed unpauser);
    
    constructor(address guardian) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, guardian); // Sentinel Guardian can pause
        _grantRole(PAUSER_ROLE, msg.sender); // Owner can also pause
    }
    
    /**
     * @notice Deposit ETH into the vault
     */
    function deposit() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw ETH from the vault (SECURE)
     * @dev Follows checks-effects-interactions pattern
     */
    function withdraw() external whenNotPaused nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        // SECURE: State update BEFORE external call (checks-effects-interactions)
        balances[msg.sender] = 0;
        totalDeposits -= amount;
        
        // External call happens LAST
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @notice Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get user balance
     */
    function getUserBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @notice Emergency pause - callable by Sentinel Guardian
     * @param vulnHash Hash of detected vulnerability (for audit trail)
     */
    function pause(bytes32 vulnHash) external onlyRole(PAUSER_ROLE) {
        _pause();
        lastPausedBy = msg.sender;
        lastPausedAt = block.timestamp;
        lastVulnHash = vulnHash;
        emit EmergencyPaused(msg.sender, vulnHash);
    }
    
    /**
     * @notice Unpause - only admin
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }
    
    /**
     * @notice Check if contract can be paused by an address
     */
    function canPause(address account) external view returns (bool) {
        return hasRole(PAUSER_ROLE, account);
    }
    
    // Allow receiving ETH
    receive() external payable {
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
    }
}
