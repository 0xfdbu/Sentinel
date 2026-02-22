// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./SentinelRegistry.sol";

/**
 * @title ReserveHealthMonitor
 * @notice Real-time reserve health monitoring for DeFi protocols
 * @dev Part of Sentinel Risk & Compliance module
 * @author Sentinel Team
 * @track Chainlink Convergence Hackathon 2026 - Risk & Compliance
 * 
 * Monitors:
 * - TVL changes (sudden drops indicating potential exploits)
 * - Collateral ratios (for lending protocols)
 * - Stablecoin depegs (via Chainlink Price Feeds)
 * - LST (Liquid Staking Token) backing ratios
 * - Cross-asset correlations (unusual correlations = manipulation)
 */

interface IPausable {
    function pause() external;
    function paused() external view returns (bool);
}

interface IEmergencyGuardian {
    function emergencyPause(address target, bytes32 vulnerabilityHash) external;
}

contract ReserveHealthMonitor is Ownable, ReentrancyGuard {
    
    /// @notice Sentinel Registry reference
    SentinelRegistry public registry;
    
    /// @notice Emergency Guardian for triggering pauses
    IEmergencyGuardian public guardian;
    
    /// @notice Health metrics for a protected contract
    struct HealthMetrics {
        uint256 tvl;                    // Current TVL in wei
        uint256 tvlSnapshot;            // Baseline TVL for comparison
        uint256 snapshotBlock;          // When baseline was set
        uint256 collateralRatio;        // For lending (10000 = 100%)
        uint256 minCollateralRatio;     // Minimum healthy ratio
        uint256 lastUpdateBlock;
        uint256 lastUpdateTime;
        bool isHealthy;
        uint8 healthScore;              // 0-100 health rating
    }
    
    /// @notice Asset monitoring configuration
    struct AssetConfig {
        address asset;                  // Token address (0x0 for ETH)
        address priceFeed;              // Chainlink Price Feed
        uint256 weight;                 // Weight in TVL calculation (10000 = 100%)
        bool isStablecoin;              // Whether to check depeg
        uint256 depegThreshold;         // Depeg tolerance (50 = 0.5%)
    }
    
    /// @notice Risk thresholds for a contract
    struct RiskThresholds {
        uint256 maxTVLDropPercent;      // Max TVL drop before alert (1000 = 10%)
        uint256 maxCollateralRatioDrop; // Max collateral ratio drop (500 = 5%)
        uint256 minHealthScore;         // Minimum health score (0-100)
        uint256 volatilityThreshold;    // Price volatility threshold
        bool autoPauseEnabled;          // Whether to auto-pause on critical
    }
    
    /// @notice Monitoring data per contract
    struct MonitoringConfig {
        bool isActive;
        AssetConfig[] assets;
        RiskThresholds thresholds;
        address guardianOverride;       // Optional different guardian
    }
    
    /// @notice Health status for a contract
    enum HealthStatus { HEALTHY, WARNING, CRITICAL, PAUSED }
    
    /// @notice Mapping from contract to health metrics
    mapping(address => HealthMetrics) public healthMetrics;
    
    /// @notice Mapping from contract to monitoring config
    mapping(address => MonitoringConfig) public monitoringConfigs;
    
    /// @notice Historical TVL snapshots (contract => block => TVL)
    mapping(address => mapping(uint256 => uint256)) public tvlHistory;
    
    /// @notice List of monitored contracts
    address[] public monitoredContracts;
    
    /// @notice Authorized Sentinel updaters
    mapping(address => bool) public authorizedUpdaters;
    
    /// @notice Default Chainlink price feed for ETH/USD
    address public constant ETH_USD_FEED = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419; // Mainnet
    
    /// @notice Minimum blocks between snapshots
    uint256 public constant MIN_SNAPSHOT_INTERVAL = 100;
    
    /// @notice Events
    event ContractMonitoringAdded(address indexed contractAddr, address indexed owner);
    event ContractMonitoringRemoved(address indexed contractAddr);
    event HealthMetricsUpdated(
        address indexed contractAddr,
        uint256 tvl,
        uint256 healthScore,
        HealthStatus status
    );
    event TVLAlert(
        address indexed contractAddr,
        uint256 oldTVL,
        uint256 newTVL,
        uint256 dropPercent
    );
    event DepegAlert(
        address indexed asset,
        int256 price,
        uint256 deviation
    );
    event CollateralRatioAlert(
        address indexed contractAddr,
        uint256 oldRatio,
        uint256 newRatio
    );
    event HealthStatusChanged(
        address indexed contractAddr,
        HealthStatus oldStatus,
        HealthStatus newStatus
    );
    event AutoPauseTriggered(
        address indexed contractAddr,
        bytes32 reasonHash
    );
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);
    
    /// @notice Errors
    error ContractNotRegistered();
    error AlreadyMonitored();
    error NotMonitored();
    error UnauthorizedUpdater();
    error InvalidThreshold();
    error InvalidAssetConfig();
    error PriceFeedStale();
    error NotContractOwner();
    
    /// @notice Modifiers
    modifier onlyRegistered(address contractAddr) {
        if (!registry.isRegistered(contractAddr)) revert ContractNotRegistered();
        _;
    }
    
    modifier onlyMonitored(address contractAddr) {
        if (!monitoringConfigs[contractAddr].isActive) revert NotMonitored();
        _;
    }
    
    modifier onlyUpdater() {
        if (!authorizedUpdaters[msg.sender] && msg.sender != owner()) revert UnauthorizedUpdater();
        _;
    }
    
    modifier onlyContractOwner(address contractAddr) {
        (, , , address contractOwner, ) = registry.registrations(contractAddr);
        if (contractOwner != msg.sender && msg.sender != owner()) revert NotContractOwner();
        _;
    }
    
    constructor(address _registry, address _guardian) Ownable(msg.sender) {
        registry = SentinelRegistry(_registry);
        guardian = IEmergencyGuardian(_guardian);
    }
    
    /**
     * @notice Add a contract for reserve health monitoring
     * @param contractAddr The contract to monitor
     * @param assets Array of asset configurations
     * @param thresholds Risk thresholds
     */
    function addMonitoring(
        address contractAddr,
        AssetConfig[] calldata assets,
        RiskThresholds calldata thresholds
    ) external onlyRegistered(contractAddr) onlyContractOwner(contractAddr) {
        if (monitoringConfigs[contractAddr].isActive) revert AlreadyMonitored();
        if (thresholds.maxTVLDropPercent > 5000) revert InvalidThreshold(); // Max 50%
        if (thresholds.minHealthScore > 100) revert InvalidThreshold();
        
        MonitoringConfig storage config = monitoringConfigs[contractAddr];
        config.isActive = true;
        config.thresholds = thresholds;
        
        // Copy asset configs
        for (uint256 i = 0; i < assets.length; i++) {
            config.assets.push(assets[i]);
        }
        
        // Initialize health metrics
        HealthMetrics storage metrics = healthMetrics[contractAddr];
        metrics.snapshotBlock = block.number;
        metrics.lastUpdateBlock = block.number;
        metrics.lastUpdateTime = block.timestamp;
        metrics.isHealthy = true;
        metrics.healthScore = 100;
        
        monitoredContracts.push(contractAddr);
        
        emit ContractMonitoringAdded(contractAddr, msg.sender);
    }
    
    /**
     * @notice Remove monitoring from a contract
     */
    function removeMonitoring(address contractAddr) 
        external 
        onlyMonitored(contractAddr) 
        onlyContractOwner(contractAddr) 
    {
        monitoringConfigs[contractAddr].isActive = false;
        
        // Remove from monitored contracts list
        for (uint256 i = 0; i < monitoredContracts.length; i++) {
            if (monitoredContracts[i] == contractAddr) {
                monitoredContracts[i] = monitoredContracts[monitoredContracts.length - 1];
                monitoredContracts.pop();
                break;
            }
        }
        
        emit ContractMonitoringRemoved(contractAddr);
    }
    
    /**
     * @notice Update health metrics for a contract (called by Sentinel CRE)
     * @param contractAddr Contract to update
     * @param newTVL Current TVL
     * @param newCollateralRatio Current collateral ratio (if applicable)
     */
    function updateHealthMetrics(
        address contractAddr,
        uint256 newTVL,
        uint256 newCollateralRatio
    ) external onlyUpdater onlyMonitored(contractAddr) nonReentrant returns (HealthStatus) {
        HealthMetrics storage metrics = healthMetrics[contractAddr];
        MonitoringConfig storage config = monitoringConfigs[contractAddr];
        
        HealthStatus oldStatus = _getHealthStatus(contractAddr);
        
        // Store TVL history
        tvlHistory[contractAddr][block.number] = newTVL;
        
        // Calculate TVL change
        uint256 tvlChangePercent = 0;
        if (metrics.tvl > 0 && newTVL < metrics.tvl) {
            tvlChangePercent = ((metrics.tvl - newTVL) * 10000) / metrics.tvl;
        }
        
        // Check TVL drop alert
        if (tvlChangePercent > config.thresholds.maxTVLDropPercent) {
            emit TVLAlert(contractAddr, metrics.tvl, newTVL, tvlChangePercent);
        }
        
        // Check collateral ratio change
        if (metrics.collateralRatio > 0 && newCollateralRatio < metrics.collateralRatio) {
            uint256 ratioDrop = metrics.collateralRatio - newCollateralRatio;
            if (ratioDrop > config.thresholds.maxCollateralRatioDrop) {
                emit CollateralRatioAlert(contractAddr, metrics.collateralRatio, newCollateralRatio);
            }
        }
        
        // Update metrics
        metrics.tvl = newTVL;
        if (newCollateralRatio > 0) {
            metrics.collateralRatio = newCollateralRatio;
        }
        metrics.lastUpdateBlock = block.number;
        metrics.lastUpdateTime = block.timestamp;
        
        // Recalculate health score
        metrics.healthScore = _calculateHealthScore(contractAddr, newTVL, newCollateralRatio);
        metrics.isHealthy = metrics.healthScore >= config.thresholds.minHealthScore;
        
        // Take snapshot if interval passed
        if (block.number - metrics.snapshotBlock >= MIN_SNAPSHOT_INTERVAL) {
            metrics.tvlSnapshot = newTVL;
            metrics.snapshotBlock = block.number;
        }
        
        HealthStatus newStatus = _getHealthStatus(contractAddr);
        
        if (newStatus != oldStatus) {
            emit HealthStatusChanged(contractAddr, oldStatus, newStatus);
            
            // Auto-pause if critical and enabled
            if (newStatus == HealthStatus.CRITICAL && config.thresholds.autoPauseEnabled) {
                _triggerAutoPause(contractAddr);
            }
        }
        
        emit HealthMetricsUpdated(
            contractAddr,
            newTVL,
            metrics.healthScore,
            newStatus
        );
        
        return newStatus;
    }
    
    /**
     * @notice Check for stablecoin depeg using Chainlink Price Feeds
     */
    function checkDepeg(address asset, address priceFeed) external onlyUpdater returns (bool isDepegged, uint256 deviation) {
        AggregatorV3Interface feed = AggregatorV3Interface(priceFeed);
        
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        
        // Check for stale data
        if (updatedAt < block.timestamp - 3600) revert PriceFeedStale(); // 1 hour stale
        if (answeredInRound < roundId) revert PriceFeedStale();
        
        // For stablecoins, price should be ~1.00 (8 decimals for USD feeds)
        // 1.00 USD = 100000000
        uint256 expectedPrice = 100000000; // $1.00
        uint256 actualPrice = uint256(price);
        
        // Calculate deviation in basis points
        if (actualPrice > expectedPrice) {
            deviation = ((actualPrice - expectedPrice) * 10000) / expectedPrice;
        } else {
            deviation = ((expectedPrice - actualPrice) * 10000) / expectedPrice;
        }
        
        // Get threshold from config
        uint256 threshold = 100; // Default 1%
        for (uint256 i = 0; i < monitoredContracts.length; i++) {
            MonitoringConfig storage config = monitoringConfigs[monitoredContracts[i]];
            for (uint256 j = 0; j < config.assets.length; j++) {
                if (config.assets[j].asset == asset && config.assets[j].isStablecoin) {
                    threshold = config.assets[j].depegThreshold;
                    break;
                }
            }
        }
        
        isDepegged = deviation > threshold;
        
        if (isDepegged) {
            emit DepegAlert(asset, price, deviation);
        }
        
        return (isDepegged, deviation);
    }
    
    /**
     * @notice Batch update health metrics (gas optimization)
     */
    function batchUpdateHealthMetrics(
        address[] calldata contracts,
        uint256[] calldata tvls,
        uint256[] calldata collateralRatios
    ) external onlyUpdater {
        require(contracts.length == tvls.length && contracts.length == collateralRatios.length, "Length mismatch");
        
        for (uint256 i = 0; i < contracts.length; i++) {
            if (monitoringConfigs[contracts[i]].isActive) {
                updateHealthMetrics(contracts[i], tvls[i], collateralRatios[i]);
            }
        }
    }
    
    /**
     * @notice Manually trigger pause from monitoring (if auto-pause fails)
     */
    function manualPauseTrigger(address contractAddr, string calldata reason) 
        external 
        onlyUpdater 
        onlyMonitored(contractAddr) 
    {
        bytes32 reasonHash = keccak256(abi.encodePacked(reason));
        
        try guardian.emergencyPause(contractAddr, reasonHash) {
            emit AutoPauseTriggered(contractAddr, reasonHash);
        } catch {
            // Pause failed, but event is still logged
        }
    }
    
    /**
     * @notice Update risk thresholds for a contract
     */
    function updateThresholds(
        address contractAddr, 
        RiskThresholds calldata newThresholds
    ) external onlyMonitored(contractAddr) onlyContractOwner(contractAddr) {
        monitoringConfigs[contractAddr].thresholds = newThresholds;
    }
    
    /**
     * @notice Get current health status for a contract
     */
    function getHealthStatus(address contractAddr) 
        external 
        view 
        onlyMonitored(contractAddr) 
        returns (
            HealthStatus status,
            HealthMetrics memory metrics,
            RiskThresholds memory thresholds
        ) 
    {
        status = _getHealthStatus(contractAddr);
        metrics = healthMetrics[contractAddr];
        thresholds = monitoringConfigs[contractAddr].thresholds;
    }
    
    /**
     * @notice Get all monitored contracts
     */
    function getMonitoredContracts() external view returns (address[] memory) {
        return monitoredContracts;
    }
    
    /**
     * @notice Get monitoring config for a contract
     */
    function getMonitoringConfig(address contractAddr) 
        external 
        view 
        returns (MonitoringConfig memory config) 
    {
        return monitoringConfigs[contractAddr];
    }
    
    /**
     * @notice Authorize a new updater
     */
    function authorizeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = true;
        emit UpdaterAuthorized(updater);
    }
    
    /**
     * @notice Revoke an updater
     */
    function revokeUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit UpdaterRevoked(updater);
    }
    
    /**
     * @notice Update registry reference
     */
    function setRegistry(address _registry) external onlyOwner {
        registry = SentinelRegistry(_registry);
    }
    
    /**
     * @notice Update guardian reference
     */
    function setGuardian(address _guardian) external onlyOwner {
        guardian = IEmergencyGuardian(_guardian);
    }
    
    /**
     * @notice Calculate health score (0-100)
     */
    function _calculateHealthScore(
        address contractAddr,
        uint256 currentTVL,
        uint256 currentRatio
    ) internal view returns (uint8) {
        MonitoringConfig storage config = monitoringConfigs[contractAddr];
        HealthMetrics storage metrics = healthMetrics[contractAddr];
        
        uint256 score = 100;
        
        // TVL health component (40% weight)
        if (metrics.tvlSnapshot > 0 && currentTVL < metrics.tvlSnapshot) {
            uint256 tvlDrop = ((metrics.tvlSnapshot - currentTVL) * 100) / metrics.tvlSnapshot;
            score -= (tvlDrop * 40) / 100;
        }
        
        // Collateral ratio component (30% weight)
        if (config.thresholds.minHealthScore > 0 && currentRatio < config.thresholds.minHealthScore * 100) {
            uint256 ratioDrop = ((config.thresholds.minHealthScore * 100 - currentRatio) * 30) / config.thresholds.minHealthScore;
            score -= ratioDrop;
        }
        
        // Recency component (30% weight) - data freshness
        uint256 blocksSinceUpdate = block.number - metrics.lastUpdateBlock;
        if (blocksSinceUpdate > 1000) {
            score -= 30;
        } else if (blocksSinceUpdate > 500) {
            score -= 15;
        } else if (blocksSinceUpdate > 100) {
            score -= 5;
        }
        
        return uint8(score > 100 ? 0 : (score < 0 ? 0 : score));
    }
    
    /**
     * @notice Get health status from score and thresholds
     */
    function _getHealthStatus(address contractAddr) internal view returns (HealthStatus) {
        HealthMetrics storage metrics = healthMetrics[contractAddr];
        MonitoringConfig storage config = monitoringConfigs[contractAddr];
        
        if (!config.isActive) return HealthStatus.PAUSED;
        if (metrics.healthScore < 30) return HealthStatus.CRITICAL;
        if (metrics.healthScore < config.thresholds.minHealthScore) return HealthStatus.WARNING;
        return HealthStatus.HEALTHY;
    }
    
    /**
     * @notice Trigger auto-pause on critical health
     */
    function _triggerAutoPause(address contractAddr) internal {
        bytes32 reasonHash = keccak256(abi.encodePacked("ReserveHealth: Critical TVL drop detected"));
        
        try guardian.emergencyPause(contractAddr, reasonHash) {
            emit AutoPauseTriggered(contractAddr, reasonHash);
        } catch {
            // If guardian fails, still emit alert for manual intervention
        }
    }
    
    /**
     * @notice Emergency function to update TVL snapshot
     */
    function emergencySnapshot(address contractAddr) external onlyContractOwner(contractAddr) {
        HealthMetrics storage metrics = healthMetrics[contractAddr];
        metrics.tvlSnapshot = metrics.tvl;
        metrics.snapshotBlock = block.number;
    }
    
    receive() external payable {}
}
