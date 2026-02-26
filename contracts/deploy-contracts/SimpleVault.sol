// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleVault
 * @notice A simple ETH vault with Sentinel protection
 * @dev Compatible with SentinelRegistry and Guardian
 */
contract SimpleVault is Pausable, Ownable {
    
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed owner, uint256 amount);
    
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
     * @notice Withdraw ETH from the vault (safe version)
     */
    function withdraw(uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Safe: State update before external call
        balances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @notice Emergency withdraw by owner (when paused)
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
        emit EmergencyWithdraw(owner(), balance);
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
