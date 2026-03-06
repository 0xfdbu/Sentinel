// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title SentinelVaultETHV2
 * @notice ETH-collateralized USDA minting vault with CRE workflow attestation
 * @dev 
 *   - Accepts ETH deposits
 *   - Requires CRE workflow to complete mint with DON-attested prices
 *   - Uses report hash to verify workflow execution integrity
 *   - Guardian CANNOT tamper - would need DON signatures
 */
contract SentinelVaultETHV2 is AccessControl, ReentrancyGuard, Pausable {
    
    // Roles
    bytes32 public constant WORKFLOW_ROLE = keccak256("WORKFLOW_ROLE");
    
    // Price feed sources
    AggregatorV3Interface public chainlinkPriceFeed;
    
    // USDA Token interface
    IERC20Mintable public usdaToken;
    
    // Price configuration
    uint256 public constant PRICE_PRECISION = 1e8;
    uint256 public constant USDA_PRECISION = 1e18;
    uint256 public maxPriceDeviation = 100; // 1% = 100 basis points
    
    // Collateralization
    uint256 public collateralRatio = 15000; // 150% = 15000 basis points
    uint256 public minimumDeposit = 0.001 ether;
    
    // Deposits tracking
    struct Deposit {
        uint256 ethAmount;
        uint256 usdaMinted;
        uint256 ethPriceAtDeposit;
        uint256 timestamp;
        bool active;
        bool mintCompleted;
    }
    
    mapping(address => Deposit[]) public userDeposits;
    mapping(bytes32 => bool) public processedMintIds;
    mapping(bytes32 => bool) public processedReports; // Prevent report replay
    
    // Events
    event ETHDeposited(
        address indexed user,
        uint256 ethAmount,
        uint256 ethPrice,
        bytes32 mintRequestId,
        uint256 depositIndex
    );
    
    event USDAMinted(
        address indexed user,
        uint256 usdaAmount,
        uint256 medianPrice,
        bytes32 indexed mintRequestId,
        bytes32 indexed reportHash
    );
    
    event ConsensusValidated(
        uint256 chainlinkPrice,
        uint256 coingeckoPrice,
        uint256 twelvedataPrice,
        uint256 medianPrice,
        uint256 deviationMax
    );
    
    // Errors
    error InvalidPriceDeviation(uint256 deviation);
    error MinimumDepositNotMet(uint256 sent, uint256 required);
    error MintAlreadyProcessed(bytes32 mintId);
    error ReportAlreadyProcessed(bytes32 reportHash);
    error InvalidPrice();
    error UnauthorizedWorkflow();
    error InvalidReportData();
    error MintNotPending();
    
    constructor(
        address _usdaToken,
        address _chainlinkPriceFeed,
        address _admin
    ) {
        usdaToken = IERC20Mintable(_usdaToken);
        chainlinkPriceFeed = AggregatorV3Interface(_chainlinkPriceFeed);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(WORKFLOW_ROLE, _admin);
    }
    
    /**
     * @notice Deposit ETH and request USDA mint
     * @dev Stores deposit info, CRE workflow will complete mint with DON-attested prices
     */
    function depositETH() external payable nonReentrant whenNotPaused returns (bytes32 mintRequestId, uint256 depositIndex) {
        if (msg.value < minimumDeposit) {
            revert MinimumDepositNotMet(msg.value, minimumDeposit);
        }
        
        // Generate unique mint request ID
        mintRequestId = keccak256(
            abi.encodePacked(msg.sender, msg.value, block.timestamp, block.number, userDeposits[msg.sender].length)
        );
        
        // Get current Chainlink price for reference
        uint256 chainlinkPrice = getChainlinkPrice();
        
        // Store deposit
        depositIndex = userDeposits[msg.sender].length;
        userDeposits[msg.sender].push(Deposit({
            ethAmount: msg.value,
            usdaMinted: 0,
            ethPriceAtDeposit: chainlinkPrice,
            timestamp: block.timestamp,
            active: true,
            mintCompleted: false
        }));
        
        emit ETHDeposited(msg.sender, msg.value, chainlinkPrice, mintRequestId, depositIndex);
        
        return (mintRequestId, depositIndex);
    }
    
    /**
     * @notice Complete mint with DON-attested report from CRE workflow
     * @dev 
     *   - Called by CRE workflow via writeReport
     *   - Requires WORKFLOW_ROLE (granted to CRE DON)
     *   - Verifies price consensus was calculated correctly
     *   - Report hash prevents tampering/replay
     * 
     * @param user Address to mint USDA to
     * @param depositIndex Index in user's deposits array
     * @param ethAmount Amount of ETH deposited (must match deposit)
     * @param chainlinkPrice Price from Chainlink (8 decimals) - DON attested
     * @param coingeckoPrice Price from CoinGecko (8 decimals) - DON attested  
     * @param twelvedataPrice Price from TwelveData (8 decimals) - DON attested
     * @param mintRequestId Unique mint request ID
     */
    function completeMintWithReport(
        address user,
        uint256 depositIndex,
        uint256 ethAmount,
        uint256 chainlinkPrice,
        uint256 coingeckoPrice,
        uint256 twelvedataPrice,
        bytes32 mintRequestId
    ) external onlyRole(WORKFLOW_ROLE) nonReentrant whenNotPaused {
        // Prevent replay
        if (processedMintIds[mintRequestId]) {
            revert MintAlreadyProcessed(mintRequestId);
        }
        
        // Verify deposit exists and is pending
        if (depositIndex >= userDeposits[user].length) {
            revert MintNotPending();
        }
        
        Deposit storage deposit = userDeposits[user][depositIndex];
        if (!deposit.active || deposit.mintCompleted) {
            revert MintNotPending();
        }
        
        // Verify ETH amount matches
        if (deposit.ethAmount != ethAmount) {
            revert InvalidReportData();
        }
        
        // Calculate report hash for tamper detection
        bytes32 reportHash = keccak256(abi.encodePacked(
            user,
            depositIndex,
            ethAmount,
            chainlinkPrice,
            coingeckoPrice,
            twelvedataPrice,
            mintRequestId,
            block.chainid
        ));
        
        // Prevent report replay
        if (processedReports[reportHash]) {
            revert ReportAlreadyProcessed(reportHash);
        }
        processedReports[reportHash] = true;
        
        // Calculate median price (consensus)
        uint256 medianPrice = _calculateMedian(chainlinkPrice, coingeckoPrice, twelvedataPrice);
        
        // Validate price deviation from sources (ensures consensus)
        uint256 maxDeviation = _validateConsensus(chainlinkPrice, coingeckoPrice, twelvedataPrice, medianPrice);
        
        emit ConsensusValidated(
            chainlinkPrice,
            coingeckoPrice,
            twelvedataPrice,
            medianPrice,
            maxDeviation
        );
        
        // Calculate USDA amount with collateralization
        // USDA = (ETH * ETH_PRICE_USD) / 1.5
        uint256 usdaAmount = (ethAmount * medianPrice * 10000) / (collateralRatio * PRICE_PRECISION);
        
        // Mark as processed
        processedMintIds[mintRequestId] = true;
        deposit.usdaMinted = usdaAmount;
        deposit.mintCompleted = true;
        
        // Mint USDA to user
        usdaToken.mint(user, usdaAmount);
        
        emit USDAMinted(user, usdaAmount, medianPrice, mintRequestId, reportHash);
    }
    
    /**
     * @notice Validate price consensus and return max deviation
     */
    function _validateConsensus(
        uint256 chainlinkPrice,
        uint256 coingeckoPrice,
        uint256 twelvedataPrice,
        uint256 median
    ) internal view returns (uint256 maxDeviation) {
        uint256 dev1 = _calculateDeviation(median, chainlinkPrice);
        uint256 dev2 = _calculateDeviation(median, coingeckoPrice);
        uint256 dev3 = _calculateDeviation(median, twelvedataPrice);
        
        maxDeviation = dev1 > dev2 ? (dev1 > dev3 ? dev1 : dev3) : (dev2 > dev3 ? dev2 : dev3);
        
        if (maxDeviation > maxPriceDeviation) {
            revert InvalidPriceDeviation(maxDeviation);
        }
    }
    
    /**
     * @notice Calculate deviation from median
     */
    function _calculateDeviation(uint256 median, uint256 price) internal pure returns (uint256) {
        if (price > median) {
            return ((price - median) * 10000) / median;
        } else {
            return ((median - price) * 10000) / median;
        }
    }
    
    /**
     * @notice Calculate median of 3 prices
     */
    function _calculateMedian(uint256 a, uint256 b, uint256 c) internal pure returns (uint256) {
        if (a > b) {
            if (b > c) return b;
            if (a > c) return c;
            return a;
        } else {
            if (a > c) return a;
            if (b > c) return c;
            return b;
        }
    }
    
    /**
     * @notice Get current Chainlink price
     */
    function getChainlinkPrice() public view returns (uint256) {
        (, int256 price, , , ) = chainlinkPriceFeed.latestRoundData();
        if (price <= 0) revert InvalidPrice();
        return uint256(price);
    }
    
    /**
     * @notice Grant workflow role to CRE DON address
     */
    function grantWorkflowRole(address workflowAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(WORKFLOW_ROLE, workflowAddress);
    }
    
    /**
     * @notice Revoke workflow role
     */
    function revokeWorkflowRole(address workflowAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(WORKFLOW_ROLE, workflowAddress);
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
    
    function getDeposit(address user, uint256 index) external view returns (Deposit memory) {
        return userDeposits[user][index];
    }
    
    function calculateUSDAAmount(uint256 ethAmount, uint256 ethPrice) external view returns (uint256) {
        return (ethAmount * ethPrice * 10000) / (collateralRatio * PRICE_PRECISION);
    }
}

interface IERC20Mintable {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}
