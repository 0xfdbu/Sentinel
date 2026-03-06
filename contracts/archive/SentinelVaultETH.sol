// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title SentinelVaultETH
 * @notice ETH-collateralized USDA minting vault with multi-source price aggregation
 * @dev 
 *   - Accepts ETH deposits
 *   - Fetches ETH/USD from 3 sources via CRE workflow
 *   - Validates price consensus (deviation < 1%)
 *   - Mints USDA with ACE policy enforcement
 */
contract SentinelVaultETH is AccessControl, ReentrancyGuard, Pausable {
    
    // Roles
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    // Price feed sources
    AggregatorV3Interface public chainlinkPriceFeed;
    
    // USDA Token interface
    IERC20Mintable public usdaToken;
    
    // Price configuration
    uint256 public constant PRICE_PRECISION = 1e8; // Chainlink uses 8 decimals
    uint256 public constant USDA_PRECISION = 1e18;
    uint256 public maxPriceDeviation = 100; // 1% = 100 basis points
    uint256 public stalePriceThreshold = 1 hours;
    
    // Collateralization
    uint256 public collateralRatio = 15000; // 150% = 15000 basis points
    uint256 public minimumDeposit = 0.001 ether; // Min 0.001 ETH
    
    // Deposits tracking
    struct Deposit {
        uint256 ethAmount;
        uint256 usdaMinted;
        uint256 ethPriceAtDeposit; // USD per ETH (8 decimals)
        uint256 timestamp;
        bool active;
    }
    
    mapping(address => Deposit[]) public userDeposits;
    mapping(bytes32 => bool) public processedMintIds; // Prevent replay
    
    // Events
    event ETHDeposited(
        address indexed user,
        uint256 ethAmount,
        uint256 ethPrice,
        bytes32 mintRequestId
    );
    
    event USDAMinted(
        address indexed user,
        uint256 usdaAmount,
        uint256 ethPrice,
        bytes32 indexed mintId
    );
    
    event PriceUpdated(
        bytes32 indexed source,
        uint256 price,
        uint256 timestamp
    );
    
    event ConsensusPrice(
        uint256 chainlinkPrice,
        uint256 coingeckoPrice,
        uint256 twelvedataPrice,
        uint256 medianPrice
    );
    
    // Errors
    error InvalidPriceDeviation(uint256 deviation);
    error StalePrice(uint256 lastUpdate);
    error MinimumDepositNotMet(uint256 sent, uint256 required);
    error MintAlreadyProcessed(bytes32 mintId);
    error InvalidPriceFromSource(string source);
    error ConsensusFailed();
    
    constructor(
        address _usdaToken,
        address _chainlinkPriceFeed,
        address _admin
    ) {
        usdaToken = IERC20Mintable(_usdaToken);
        chainlinkPriceFeed = AggregatorV3Interface(_chainlinkPriceFeed);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SENTINEL_ROLE, _admin);
    }
    
    /**
     * @notice Deposit ETH and request USDA mint
     * @dev Triggers CRE workflow to fetch prices and mint
     */
    function depositETH() external payable nonReentrant whenNotPaused {
        if (msg.value < minimumDeposit) {
            revert MinimumDepositNotMet(msg.value, minimumDeposit);
        }
        
        // Generate unique mint request ID
        bytes32 mintRequestId = keccak256(
            abi.encodePacked(msg.sender, msg.value, block.timestamp, block.number)
        );
        
        // Get current Chainlink price for immediate feedback
        uint256 chainlinkPrice = getChainlinkPrice();
        
        // Store deposit pending full price consensus
        userDeposits[msg.sender].push(Deposit({
            ethAmount: msg.value,
            usdaMinted: 0, // Will be set after price consensus
            ethPriceAtDeposit: chainlinkPrice,
            timestamp: block.timestamp,
            active: true
        }));
        
        emit ETHDeposited(msg.sender, msg.value, chainlinkPrice, mintRequestId);
    }
    
    /**
     * @notice Complete mint with multi-source price consensus (called by CRE workflow)
     * @param user Address to mint USDA to
     * @param ethAmount Amount of ETH deposited
     * @param chainlinkPrice Price from Chainlink (8 decimals)
     * @param coingeckoPrice Price from CoinGecko (8 decimals)
     * @param twelvedataPrice Price from TwelveData (8 decimals)
     * @param mintRequestId Unique mint request ID
     */
    function completeMintWithConsensus(
        address user,
        uint256 ethAmount,
        uint256 chainlinkPrice,
        uint256 coingeckoPrice,
        uint256 twelvedataPrice,
        bytes32 mintRequestId
    ) external onlyRole(SENTINEL_ROLE) nonReentrant whenNotPaused {
        // Prevent replay attacks
        if (processedMintIds[mintRequestId]) {
            revert MintAlreadyProcessed(mintRequestId);
        }
        processedMintIds[mintRequestId] = true;
        
        // Validate all prices are fresh
        _validatePriceFreshness(chainlinkPrice);
        
        // Calculate median price (consensus)
        uint256 medianPrice = _calculateMedian(
            chainlinkPrice,
            coingeckoPrice,
            twelvedataPrice
        );
        
        // Validate price deviation from sources
        _validatePriceDeviation(medianPrice, chainlinkPrice, "Chainlink");
        _validatePriceDeviation(medianPrice, coingeckoPrice, "CoinGecko");
        _validatePriceDeviation(medianPrice, twelvedataPrice, "TwelveData");
        
        emit ConsensusPrice(
            chainlinkPrice,
            coingeckoPrice,
            twelvedataPrice,
            medianPrice
        );
        
        // Calculate USDA amount with 150% collateralization
        // USDA = (ETH * ETH_PRICE_USD) / 1.5
        uint256 usdaAmount = (ethAmount * medianPrice * 10000) / (collateralRatio * PRICE_PRECISION);
        
        // Mint USDA to user (ACE policy check happens in USDA contract)
        usdaToken.mint(user, usdaAmount);
        
        emit USDAMinted(user, usdaAmount, medianPrice, mintRequestId);
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
        
        if (price <= 0) revert InvalidPriceFromSource("Chainlink");
        if (block.timestamp - updatedAt > stalePriceThreshold) {
            revert StalePrice(updatedAt);
        }
        
        return uint256(price);
    }
    
    /**
     * @notice Calculate median of 3 prices
     */
    function _calculateMedian(
        uint256 a,
        uint256 b,
        uint256 c
    ) internal pure returns (uint256) {
        // Sort and return middle value
        if (a > b) {
            if (b > c) return b; // a > b > c
            if (a > c) return c; // a > c > b
            return a; // c > a > b
        } else {
            if (a > c) return a; // b > a > c
            if (b > c) return c; // b > c > a
            return b; // c > b > a
        }
    }
    
    /**
     * @notice Validate price deviation from median
     */
    function _validatePriceDeviation(
        uint256 median,
        uint256 price,
        string memory source
    ) internal view {
        uint256 deviation = price > median 
            ? ((price - median) * 10000) / median
            : ((median - price) * 10000) / median;
            
        if (deviation > maxPriceDeviation) {
            revert InvalidPriceDeviation(deviation);
        }
    }
    
    function _validatePriceFreshness(uint256 lastUpdate) internal view {
        if (block.timestamp - lastUpdate > stalePriceThreshold) {
            revert StalePrice(lastUpdate);
        }
    }
    
    // Admin functions
    function setCollateralRatio(uint256 _ratio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        collateralRatio = _ratio;
    }
    
    function setMaxPriceDeviation(uint256 _deviation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxPriceDeviation = _deviation;
    }
    
    function setMinimumDeposit(uint256 _min) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumDeposit = _min;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // View functions
    function getUserDepositCount(address user) external view returns (uint256) {
        return userDeposits[user].length;
    }
    
    function getLatestDeposit(address user) external view returns (Deposit memory) {
        Deposit[] storage deposits = userDeposits[user];
        require(deposits.length > 0, "No deposits");
        return deposits[deposits.length - 1];
    }
}

interface IERC20Mintable {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}
