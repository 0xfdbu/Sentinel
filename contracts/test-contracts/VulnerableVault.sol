// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// @title VulnerableVault
// @notice This contract is INTENTIONALLY VULNERABLE for testing Sentinel's detection
// @dev DO NOT USE IN PRODUCTION - Educational purposes only

contract VulnerableVault {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    // VULNERABLE: No reentrancy protection
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    // CRITICAL VULNERABILITY: Reentrancy - sends ETH before updating state
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        // VULNERABLE: External call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update AFTER external call - exploitable!
        balances[msg.sender] = 0;
        
        emit Withdrawal(msg.sender, amount);
    }
    
    // VULNERABLE: No access control
    function emergencyWithdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        payable(msg.sender).transfer(amount);
        balances[msg.sender] = 0;
    }
    
    // VULNERABLE: Unchecked return value
    function riskyTransfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        
        // Not checking return value
        to.call{value: amount}("");
    }
    
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
    
    receive() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
}
