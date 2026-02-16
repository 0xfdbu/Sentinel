// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SafeVault
 * @notice SECURE VERSION of the vault with proper protections
 * @dev Demonstrates best practices that Sentinel should recognize as safe
 * @track Chainlink Convergence Hackathon 2026 - Testing Only
 */

contract SafeVault is Pausable, ReentrancyGuard, Ownable {
    
    /// @notice User balances
    mapping(address => uint256) public balances;
    
    /// @notice Total ETH deposited
    uint256 public totalDeposits;
    
    /// @notice Events
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
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
        
        // External call happens AFTER state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @notice Emergency withdraw for owner
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
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
    
    // Allow receiving ETH (with reentrancy protection via nonReentrant on deposit)
    receive() external payable {
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
    }
}
