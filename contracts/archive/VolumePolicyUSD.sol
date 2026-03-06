// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BasePolicy.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title VolumePolicyUSD
 * @notice ACE Policy: Enforces transaction value limits in USD using Chainlink Price Feeds
 * @dev Volume limits are set in USD (18 decimals) but checked against ETH value via Chainlink oracle
 * Example: maxValue = 10000 * 1e18 means $10,000 USD max per transaction
 * Chainlink ETH/USD on Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
 */
contract VolumePolicyUSD is BasePolicy {
    
    /// @notice Chainlink Price Feed for ETH/USD
    AggregatorV3Interface public priceFeed;
    
    /// @notice Price feed heartbeat - max time between updates (1 hour)
    uint256 public constant PRICE_FEED_HEARTBEAT = 1 hours;
    
    /// @notice Last valid price (stored for resilience)
    uint256 public lastValidPrice;
    uint256 public lastPriceTimestamp;
    
    /// @notice Transaction value limits in USD (18 decimals)
    /// Example: 10000e18 = $10,000 USD
    uint256 public minValueUSD;  // Minimum transaction value in USD
    uint256 public maxValueUSD;  // Maximum transaction value in USD
    uint256 public dailyVolumeLimitUSD;  // Daily volume limit per address in USD
    
    /// @notice Daily volume tracking per address (in USD terms)
    mapping(address => uint256) public dailyVolumeUSD;
    mapping(address => uint256) public lastVolumeReset;
    
    /// @notice Exempt addresses (e.g., owner, trusted contracts)
    mapping(address => bool) public exempt;
    
    /// @notice Events
    event LimitsUpdated(uint256 minValueUSD, uint256 maxValueUSD);
    event DailyLimitUpdated(uint256 newLimitUSD);
    event ExemptionStatusChanged(address indexed addr, bool exempt);
    event VolumeViolation(address indexed addr, uint256 valueETH, uint256 valueUSD, string reason);
    event PriceFeedUpdated(address newPriceFeed);
    event StalePriceWarning(uint256 lastUpdateTime, uint256 currentTime);
    
    /// @notice Custom errors
    error ValueBelowMinimum(uint256 valueUSD, uint256 minUSD);
    error ValueAboveMaximum(uint256 valueUSD, uint256 maxUSD);
    error DailyLimitExceeded(uint256 dailyVolumeUSD, uint256 limitUSD);
    error StalePriceFeed(uint256 lastUpdateTime, uint256 currentTime);
    error InvalidPriceFeed();
    error PriceFeedNotSet();
    
    /// @notice Constants for severity levels
    uint8 constant SEVERITY_OK = 0;
    uint8 constant SEVERITY_LOW = 1;
    uint8 constant SEVERITY_MEDIUM = 2;
    uint8 constant SEVERITY_HIGH = 3;
    uint8 constant SEVERITY_CRITICAL = 4;
    
    /// @notice Price feed decimal adjustment
    /// Chainlink ETH/USD has 8 decimals, we normalize to 18
    uint256 constant PRICE_FEED_DECIMALS = 8;
    uint256 constant TARGET_DECIMALS = 18;
    uint256 constant DECIMAL_ADJUSTMENT = 10 ** (TARGET_DECIMALS - PRICE_FEED_DECIMALS);

    /**
     * @param _priceFeed Chainlink ETH/USD price feed address
     * @param _minValueUSD Minimum transaction value in USD (18 decimals)
     * @param _maxValueUSD Maximum transaction value in USD (18 decimals)
     * @param _dailyLimitUSD Daily volume limit in USD (18 decimals)
     */
    constructor(
        address _priceFeed,
        uint256 _minValueUSD,
        uint256 _maxValueUSD,
        uint256 _dailyLimitUSD
    ) BasePolicy("VolumePolicyUSD", "1.0.0") {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = AggregatorV3Interface(_priceFeed);
        
        minValueUSD = _minValueUSD;
        maxValueUSD = _maxValueUSD;
        dailyVolumeLimitUSD = _dailyLimitUSD;
        
        // Initialize with current price
        (uint256 currentPrice, uint256 timestamp) = _getLatestPrice();
        lastValidPrice = currentPrice;
        lastPriceTimestamp = timestamp;
        
        // Owner is exempt by default
        exempt[msg.sender] = true;
    }

    /**
     * @notice Get latest ETH/USD price from Chainlink
     * @return price ETH price in USD (18 decimals)
     * @return timestamp Last update timestamp
     */
    function _getLatestPrice() internal view returns (uint256 price, uint256 timestamp) {
        try priceFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (answer <= 0) revert InvalidPriceFeed();
            
            // Normalize to 18 decimals
            price = uint256(answer) * DECIMAL_ADJUSTMENT;
            timestamp = updatedAt;
            
            return (price, timestamp);
        } catch {
            revert InvalidPriceFeed();
        }
    }
    
    /**
     * @notice Get current ETH/USD price with staleness check
     * @return price Current ETH price in USD (18 decimals)
     */
    function getETHPriceInUSD() public view returns (uint256 price) {
        (uint256 currentPrice, uint256 timestamp) = _getLatestPrice();
        
        // Check for stale price
        if (block.timestamp > timestamp + PRICE_FEED_HEARTBEAT) {
            // Return last valid price if current is stale
            return lastValidPrice;
        }
        
        return currentPrice;
    }
    
    /**
     * @notice Convert ETH value to USD equivalent
     * @param ethAmount Amount in wei
     * @return usdValue USD equivalent (18 decimals)
     */
    function ethToUSD(uint256 ethAmount) public view returns (uint256 usdValue) {
        uint256 ethPrice = getETHPriceInUSD(); // 18 decimals
        // ethAmount is in wei (18 decimals)
        // usdValue = (ethAmount * ethPrice) / 1e18
        return (ethAmount * ethPrice) / 1e18;
    }
    
    /**
     * @notice Convert USD value to ETH equivalent
     * @param usdAmount USD amount (18 decimals)
     * @return ethValue ETH equivalent in wei
     */
    function usdToETH(uint256 usdAmount) public view returns (uint256 ethValue) {
        uint256 ethPrice = getETHPriceInUSD(); // 18 decimals
        // ethValue = (usdAmount * 1e18) / ethPrice
        return (usdAmount * 1e18) / ethPrice;
    }

    /**
     * @notice Evaluate transaction against volume policy (USD denominated)
     * @param from Transaction sender
     * @param to Transaction recipient
     * @param value Transaction value in wei
     */
    function evaluate(
        address from,
        address to,
        uint256 value,
        bytes calldata
    ) external override onlyActive returns (bool, string memory, uint8) {
        // Skip checks for exempt addresses
        if (exempt[from] || exempt[to]) {
            return (true, "", SEVERITY_OK);
        }

        // Convert ETH value to USD
        uint256 valueInUSD = ethToUSD(value);

        // Check minimum value
        if (valueInUSD < minValueUSD && value > 0) {
            return (
                false, 
                string(abi.encodePacked(
                    "Value $", _uintToString(valueInUSD / 1e18), 
                    " below minimum $", _uintToString(minValueUSD / 1e18)
                )),
                SEVERITY_LOW
            );
        }

        // Check maximum value
        if (valueInUSD > maxValueUSD && maxValueUSD > 0) {
            emit VolumeViolation(from, value, valueInUSD, "Above maximum USD");
            return (
                false,
                string(abi.encodePacked(
                    "Value $", _uintToString(valueInUSD / 1e18), 
                    " above maximum $", _uintToString(maxValueUSD / 1e18)
                )),
                SEVERITY_HIGH
            );
        }

        // Check daily volume
        _resetDailyVolumeIfNeeded(from);
        uint256 currentDailyVolume = dailyVolumeUSD[from];
        uint256 newDailyVolume = currentDailyVolume + valueInUSD;
        
        if (newDailyVolume > dailyVolumeLimitUSD && dailyVolumeLimitUSD > 0) {
            emit VolumeViolation(from, value, valueInUSD, "Daily limit exceeded");
            return (
                false,
                string(abi.encodePacked(
                    "Daily volume $", _uintToString(newDailyVolume / 1e18), 
                    " exceeds limit $", _uintToString(dailyVolumeLimitUSD / 1e18)
                )),
                SEVERITY_MEDIUM
            );
        }

        // Update daily volume
        dailyVolumeUSD[from] = newDailyVolume;
        
        // Update stored price if valid
        (uint256 currentPrice, uint256 timestamp) = _getLatestPrice();
        if (block.timestamp <= timestamp + PRICE_FEED_HEARTBEAT) {
            lastValidPrice = currentPrice;
            lastPriceTimestamp = timestamp;
        }

        return (true, "", SEVERITY_OK);
    }

    /**
     * @notice Update transaction value limits in USD
     * @param _minValueUSD New minimum value (0 for no minimum)
     * @param _maxValueUSD New maximum value (0 for no maximum)
     */
    function setLimits(uint256 _minValueUSD, uint256 _maxValueUSD) external onlyOwner {
        require(_maxValueUSD == 0 || _maxValueUSD > _minValueUSD, "Max must be > min or 0");
        minValueUSD = _minValueUSD;
        maxValueUSD = _maxValueUSD;
        emit LimitsUpdated(_minValueUSD, _maxValueUSD);
    }

    /**
     * @notice Update daily volume limit in USD
     * @param _dailyLimitUSD New daily limit (0 for no limit)
     */
    function setDailyLimit(uint256 _dailyLimitUSD) external onlyOwner {
        dailyVolumeLimitUSD = _dailyLimitUSD;
        emit DailyLimitUpdated(_dailyLimitUSD);
    }
    
    /**
     * @notice Update Chainlink price feed address
     * @param _priceFeed New price feed address
     */
    function setPriceFeed(address _priceFeed) external onlyOwner {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = AggregatorV3Interface(_priceFeed);
        emit PriceFeedUpdated(_priceFeed);
    }

    /**
     * @notice Set exemption status for an address
     * @param addr Address to set exemption for
     * @param _exempt True to exempt, false to remove exemption
     */
    function setExemption(address addr, bool _exempt) external onlyOwner {
        exempt[addr] = _exempt;
        emit ExemptionStatusChanged(addr, _exempt);
    }

    /**
     * @notice Check if an address is exempt
     */
    function isExempt(address addr) external view returns (bool) {
        return exempt[addr];
    }

    /**
     * @notice Get daily volume for an address in USD
     */
    function getDailyVolume(address addr) external view returns (uint256) {
        if (block.timestamp >= lastVolumeReset[addr] + 1 days) {
            return 0;
        }
        return dailyVolumeUSD[addr];
    }

    /**
     * @notice Get remaining daily volume for an address in USD
     */
    function getRemainingDailyVolume(address addr) external view returns (uint256) {
        if (dailyVolumeLimitUSD == 0) return type(uint256).max;
        
        uint256 used = block.timestamp >= lastVolumeReset[addr] + 1 days 
            ? 0 
            : dailyVolumeUSD[addr];
            
        return dailyVolumeLimitUSD > used ? dailyVolumeLimitUSD - used : 0;
    }
    
    /**
     * @notice Get current limits in USD
     */
    function getLimits() external view returns (uint256 min, uint256 max, uint256 daily) {
        return (minValueUSD, maxValueUSD, dailyVolumeLimitUSD);
    }
    
    /**
     * @notice Get current ETH price and conversion examples
     */
    function getPriceInfo() external view returns (
        uint256 ethPriceUSD,
        uint256 example1000USDInETH,
        uint256 example1ETHInUSD
    ) {
        ethPriceUSD = getETHPriceInUSD();
        example1000USDInETH = usdToETH(1000 * 1e18);
        example1ETHInUSD = ethToUSD(1e18);
    }

    /**
     * @notice Reset daily volume if 24 hours have passed
     */
    function _resetDailyVolumeIfNeeded(address addr) internal {
        if (block.timestamp >= lastVolumeReset[addr] + 1 days) {
            dailyVolumeUSD[addr] = 0;
            lastVolumeReset[addr] = block.timestamp;
        }
    }

    /**
     * @notice Convert uint to string for error messages
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
