// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title SentinelVaultETHSimple
 * @notice Simple ETH vault that emits events for CRE workflow-triggered minting
 * @dev 
 *   - Accepts ETH deposits
 *   - Emits ETHDeposited event which triggers CRE workflow
 *   - CRE workflow calculates USDA amount and calls MintingConsumer
 *   - This vault does NOT mint - it just holds ETH collateral
 */
contract SentinelVaultETHSimple is AccessControl, ReentrancyGuard, Pausable {
    
    // Price feed for reference
    AggregatorV3Interface public chainlinkPriceFeed;
    
    // Configuration
    uint256 public minimumDeposit = 0.001 ether;
    uint256 public stalePriceThreshold = 1 hours;
    
    // Deposits tracking
    struct Deposit {
        uint256 ethAmount;
        uint256 ethPriceAtDeposit; // USD per ETH (8 decimals)
        uint256 timestamp;
        bool mintCompleted;
        bytes32 mintRequestId;
    }
    
    mapping(address => Deposit[]) public userDeposits;
    mapping(bytes32 => bool) public processedMintIds;
    
    uint256 public totalETHDeposited;
    uint256 public totalUSDAMinted;
    
    // Events
    event ETHDeposited(
        address indexed user,
        uint256 ethAmount,
        uint256 ethPrice,
        bytes32 mintRequestId,
        uint256 depositIndex
    );
    
    event MintCompleted(
        address indexed user,
        uint256 depositIndex,
        uint256 usdaAmount,
        bytes32 indexed mintRequestId
    );
    
    // Errors
    error MinimumDepositNotMet(uint256 sent, uint256 required);
    error StalePrice(uint256 lastUpdate);
    error InvalidPrice();
    
    constructor(
        address _chainlinkPriceFeed,
        address _admin
    ) {
        chainlinkPriceFeed = AggregatorV3Interface(_chainlinkPriceFeed);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }
    
    /**
     * @notice Deposit ETH and trigger USDA mint request
     * @dev Emits ETHDeposited event which triggers CRE workflow
     */
    function depositETH() external payable nonReentrant whenNotPaused returns (bytes32 mintRequestId, uint256 depositIndex) {
        if (msg.value < minimumDeposit) {
            revert MinimumDepositNotMet(msg.value, minimumDeposit);
        }
        
        // Generate unique mint request ID
        mintRequestId = keccak256(
            abi.encodePacked(msg.sender, msg.value, block.timestamp, block.number, userDeposits[msg.sender].length)
        );
        
        // Get current Chainlink price for reference (optional - workflow will fetch its own)
        uint256 chainlinkPrice = getChainlinkPrice();
        
        // Store deposit
        depositIndex = userDeposits[msg.sender].length;
        userDeposits[msg.sender].push(Deposit({
            ethAmount: msg.value,
            ethPriceAtDeposit: chainlinkPrice,
            timestamp: block.timestamp,
            mintCompleted: false,
            mintRequestId: mintRequestId
        }));
        
        totalETHDeposited += msg.value;
        
        emit ETHDeposited(msg.sender, msg.value, chainlinkPrice, mintRequestId, depositIndex);
        
        return (mintRequestId, depositIndex);
    }
    
    /**
     * @notice Mark deposit as mint completed (called by admin/workflow tracking)
     * @param user User address
     * @param depositIndex Deposit index
     * @param usdaAmount Amount of USDA that was minted
     */
    function markMintCompleted(
        address user,
        uint256 depositIndex,
        uint256 usdaAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(depositIndex < userDeposits[user].length, "Invalid deposit index");
        Deposit storage deposit = userDeposits[user][depositIndex];
        require(!deposit.mintCompleted, "Already minted");
        
        deposit.mintCompleted = true;
        totalUSDAMinted += usdaAmount;
        
        emit MintCompleted(user, depositIndex, usdaAmount, deposit.mintRequestId);
    }
    
    /**
     * @notice Get current Chainlink price with validation
     */
    function getChainlinkPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = chainlinkPriceFeed.latestRoundData();
        
        if (price <= 0) revert InvalidPrice();
        if (block.timestamp - updatedAt > stalePriceThreshold) {
            revert StalePrice(updatedAt);
        }
        
        return uint256(price);
    }
    
    /**
     * @notice Get user's deposit count
     */
    function getUserDepositCount(address user) external view returns (uint256) {
        return userDeposits[user].length;
    }
    
    /**
     * @notice Get specific deposit details
     */
    function getDeposit(address user, uint256 index) external view returns (Deposit memory) {
        require(index < userDeposits[user].length, "Invalid index");
        return userDeposits[user][index];
    }
    
    /**
     * @notice Get user's latest deposit
     */
    function getLatestDeposit(address user) external view returns (Deposit memory) {
        require(userDeposits[user].length > 0, "No deposits");
        return userDeposits[user][userDeposits[user].length - 1];
    }
    
    // Admin functions
    function setMinimumDeposit(uint256 _min) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumDeposit = _min;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Withdraw ETH (emergency only - would need to rebalance USDA)
     */
    function withdrawETH(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    receive() external payable {
        revert("Use depositETH()");
    }
}
