// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PausableVulnerableVault
 * @notice A realistic DeFi vault using OpenZeppelin Pausable - WITH intentional reentrancy vulnerability
 * @dev This contract mimics common yield vault patterns found in production protocols
 * @dev VULNERABILITY: Missing reentrancy guard on withdraw()
 * @author Sentinel Team (for hackathon demonstration)
 * Chainlink Convergence Hackathon 2026
 * 
 * Features (Legitimate):
 * - OpenZeppelin Pausable for emergency stops
 * - OpenZeppelin Ownable for access control
 * - ERC4626-style deposit/withdraw
 * - Yield generation simulation
 * 
 * Vulnerabilities (Intentional):
 * - Reentrancy in withdraw() - external call before state update
 * - No ReentrancyGuard usage
 */

contract PausableVulnerableVault is Pausable, Ownable {
    
    /// @notice The underlying token (e.g., WETH, DAI, USDC)
    IERC20 public immutable asset;
    
    /// @notice User deposit balances
    mapping(address => uint256) public balanceOf;
    
    /// @notice Total assets managed by vault
    uint256 public totalAssets;
    
    /// @notice Total shares issued
    uint256 public totalSupply;
    
    /// @notice Share price tracker (for yield simulation)
    uint256 public pricePerShare = 1e18;
    
    /// @notice Minimum deposit amount
    uint256 public constant MIN_DEPOSIT = 0.001 ether;
    
    /// @notice Maximum deposit per user (deposit cap)
    uint256 public depositCap = 1000 ether;
    
    /// @notice Accumulated fees
    uint256 public accumulatedFees;
    
    /// @notice Fee percentage (0.1% = 10 basis points)
    uint256 public constant FEE_BPS = 10;
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Events
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event YieldHarvested(uint256 amount, uint256 newPricePerShare);
    event FeesCollected(uint256 amount);
    event DepositCapUpdated(uint256 newCap);
    
    // Errors
    error ZeroAmount();
    error InsufficientBalance();
    error MinDepositNotMet();
    error DepositCapReached();
    error TransferFailed();
    error ContractPaused();
    error NotPaused();
    
    /**
     * @notice Initialize vault with underlying asset
     */
    constructor(address _asset) Ownable(msg.sender) {
        asset = IERC20(_asset);
    }
    
    /**
     * @notice Returns decimals of the underlying asset
     */
    function decimals() public view returns (uint8) {
        // ERC20 doesn't have decimals() in interface, assume 18
        return 18;
    }
    
    /**
     * @notice Preview how many shares you'd get for a deposit
     */
    function previewDeposit(uint256 assets) public view returns (uint256) {
        if (totalSupply == 0) return assets;
        return (assets * totalSupply) / totalAssets;
    }
    
    /**
     * @notice Preview how many assets you'd get for shares
     */
    function previewRedeem(uint256 shares) public view returns (uint256) {
        if (totalSupply == 0) return 0;
        return (shares * totalAssets) / totalSupply;
    }
    
    /**
     * @notice Get user's current balance in underlying assets
     */
    function balanceOfAssets(address account) public view returns (uint256) {
        return previewRedeem(balanceOf[account]);
    }
    
    /**
     * @notice Deposit assets and receive vault shares
     * @param assets Amount of assets to deposit
     * @param receiver Address to receive the shares
     */
    function deposit(uint256 assets, address receiver) public whenNotPaused returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        if (assets < MIN_DEPOSIT) revert MinDepositNotMet();
        if (balanceOfAssets(receiver) + assets > depositCap) revert DepositCapReached();
        
        // Calculate shares before transfer to prevent manipulation
        shares = previewDeposit(assets);
        if (shares == 0) shares = assets; // First deposit
        
        // Transfer assets from user to vault
        bool success = asset.transferFrom(msg.sender, address(this), assets);
        if (!success) revert TransferFailed();
        
        // Update state
        totalAssets += assets;
        totalSupply += shares;
        balanceOf[receiver] += shares;
        
        emit Deposit(msg.sender, receiver, assets, shares);
        
        return shares;
    }
    
    /**
     * @notice Simplified deposit for ETH compatibility
     */
    function deposit(uint256 assets) external returns (uint256) {
        return deposit(assets, msg.sender);
    }
    
    /**
     * @notice Withdraw assets by burning shares
     * @param assets Amount of assets to withdraw
     * @param receiver Address to receive the assets
     * @param owner Address that owns the shares
     * 
     * @dev ⚠️ VULNERABILITY: This function has a reentrancy vulnerability!
     * @dev External call (transfer) happens BEFORE state update
     * @dev Missing ReentrancyGuard from OpenZeppelin
     */
    function withdraw(uint256 assets, address receiver, address owner) public {
        if (assets == 0) revert ZeroAmount();
        
        // Calculate shares to burn
        uint256 shares = (assets * totalSupply) / totalAssets;
        
        if (balanceOf[owner] < shares) revert InsufficientBalance();
        
        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            // In a real ERC4626, we'd check allowance here
            // Skipped for simplicity
        }
        
        // ⚠️ VULNERABILITY: External call BEFORE state update!
        // This allows reentrancy attacks
        bool success = asset.transfer(receiver, assets);
        if (!success) revert TransferFailed();
        
        // State update happens AFTER external call (WRONG ORDER)
        balanceOf[owner] -= shares;
        totalSupply -= shares;
        totalAssets -= assets;
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }
    
    /**
     * @notice Simplified withdraw
     */
    function withdraw(uint256 assets) external {
        withdraw(assets, msg.sender, msg.sender);
    }
    
    /**
     * @notice Redeem shares for assets
     */
    function redeem(uint256 shares, address receiver, address owner) external {
        if (shares == 0) revert ZeroAmount();
        if (balanceOf[owner] < shares) revert InsufficientBalance();
        
        uint256 assets = previewRedeem(shares);
        
        // ⚠️ Same vulnerability here - external call before state update
        bool success = asset.transfer(receiver, assets);
        if (!success) revert TransferFailed();
        
        balanceOf[owner] -= shares;
        totalSupply -= shares;
        totalAssets -= assets;
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }
    
    /**
     * @notice Simulate yield generation (called by keeper/strategy)
     * @param profit Amount of profit generated
     */
    function harvestYield(uint256 profit) external onlyOwner {
        if (profit == 0) revert ZeroAmount();
        
        // Transfer profit into vault
        bool success = asset.transferFrom(msg.sender, address(this), profit);
        if (!success) revert TransferFailed();
        
        // Take fee
        uint256 fee = (profit * FEE_BPS) / BPS_DENOMINATOR;
        accumulatedFees += fee;
        
        // Update total assets (minus fee)
        totalAssets += (profit - fee);
        
        // Update share price
        if (totalSupply > 0) {
            pricePerShare = (totalAssets * 1e18) / totalSupply;
        }
        
        emit YieldHarvested(profit - fee, pricePerShare);
    }
    
    /**
     * @notice Collect accumulated fees
     */
    function collectFees() external onlyOwner {
        uint256 fees = accumulatedFees;
        if (fees == 0) revert ZeroAmount();
        
        accumulatedFees = 0;
        totalAssets -= fees;
        
        bool success = asset.transfer(owner(), fees);
        if (!success) revert TransferFailed();
        
        emit FeesCollected(fees);
    }
    
    /**
     * @notice Update deposit cap
     */
    function setDepositCap(uint256 newCap) external onlyOwner {
        depositCap = newCap;
        emit DepositCapUpdated(newCap);
    }
    
    /**
     * @notice Emergency pause - uses OpenZeppelin Pausable
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause - uses OpenZeppelin Pausable
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency rescue of stuck tokens
     */
    function rescue(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @notice Get vault info for UI
     */
    function getVaultInfo() external view returns (
        address asset_,
        uint256 totalAssets_,
        uint256 totalSupply_,
        uint256 pricePerShare_,
        uint256 depositCap_,
        bool paused_,
        uint256 apr
    ) {
        return (
            address(asset),
            totalAssets,
            totalSupply,
            pricePerShare,
            depositCap,
            paused(),
            500 // Simulated 5% APR
        );
    }
}
