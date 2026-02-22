// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SentinelTestVault
 * @notice Test vault with AccessControl PAUSER_ROLE for Sentinel testing
 * @dev Uses OpenZeppelin AccessControl + Pausable for full Sentinel compatibility
 */
contract SentinelTestVault is Pausable, AccessControl {
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    IERC20 public immutable asset;
    mapping(address => uint256) public balanceOf;
    uint256 public totalAssets;
    uint256 public totalSupply;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    
    constructor(address _asset, address _admin) {
        asset = IERC20(_asset);
        
        // Grant admin the default admin role
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        // Grant admin the pauser role
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }
    
    function deposit(uint256 amount) external whenNotPaused {
        require(amount > 0, "Zero amount");
        
        bool success = asset.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        
        balanceOf[msg.sender] += amount;
        totalAssets += amount;
        totalSupply += amount;
        
        emit Deposit(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external whenNotPaused {
        require(amount > 0, "Zero amount");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        // VULNERABLE: No reentrancy protection, external call before state update
        bool success = asset.transfer(msg.sender, amount);
        require(success, "Transfer failed");
        
        balanceOf[msg.sender] -= amount;
        totalAssets -= amount;
        totalSupply -= amount;
        
        emit Withdraw(msg.sender, amount);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function getVaultInfo() external view returns (
        address asset_,
        uint256 totalAssets_,
        uint256 totalSupply_,
        bool paused_
    ) {
        return (address(asset), totalAssets, totalSupply, paused());
    }
}
