// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../standards/ACECompliant.sol";

/**
 * @title SentinelBankVault
 * @notice A stablecoin vault demonstrating:
 *         - Chainlink Price Feeds (ETH/USDA exchange rate)
 *         - ACE Compliance (volume limits, policy enforcement)
 *         - Proof of Reserves via CRE (Confidential HTTP verification)
 * 
 * Flow:
 *   1. User calls requestMint() with ETH
 *   2. ACE compliance check (on-chain)
 *   3. Chainlink Price Feed (ETH/USDA rate)
 *   4. Event emitted → CRE workflow triggered
 *   5. CRE verifies bank reserves via Confidential HTTP
 *   6. CRE calls fulfillPoR() callback
 *   7. If reserves OK → mint USDA, else → refund ETH
 */
contract SentinelBankVault is ERC20, ReentrancyGuard, ACECompliant {
    
    // ============ State ============
    
    AggregatorV3Interface public immutable ethUsdPriceFeed;
    address public creOracle;
    
    struct MintRequest {
        address user;
        uint256 ethDeposited;
        uint256 usdToMint;
        uint256 requestTime;
        uint256 ethPrice;      // Price used for calculation
        Status status;
    }
    
    enum Status { PENDING, APPROVED, REJECTED }
    
    mapping(bytes32 => MintRequest) public mintRequests;
    bytes32[] public pendingRequests;
    
    // Track stats for transparency
    uint256 public totalEthBacking;
    uint256 public totalMinted;
    uint256 public totalRefunded;
    uint256 public requestCount;
    
    // ============ Events ============
    
    event MintRequested(
        bytes32 indexed requestId,
        address indexed user,
        uint256 ethAmount,
        uint256 usdAmount,
        uint256 ethPrice,
        uint256 timestamp
    );
    
    event PoRVerified(
        bytes32 indexed requestId,
        bool approved,
        uint256 bankReserves,
        uint256 requiredReserves,
        string reason
    );
    
    event MintExecuted(
        bytes32 indexed requestId,
        address indexed user,
        uint256 usdAmount,
        uint256 ethBacking
    );
    
    event RefundExecuted(
        bytes32 indexed requestId,
        address indexed user,
        uint256 ethAmount,
        string reason
    );
    
    event CREOracleUpdated(address indexed newOracle);
    
    // ============ Modifiers ============
    
    modifier onlyCREOracle() {
        require(msg.sender == creOracle, "SentinelBank: only CRE oracle");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _priceFeed,
        address _policyEngine,
        address _guardian,
        address _creOracle
    ) ERC20("Sentinel USDA", "USDA") ACECompliant(_policyEngine, _guardian) {
        require(_priceFeed != address(0), "Invalid price feed");
        require(_creOracle != address(0), "Invalid CRE oracle");
        
        ethUsdPriceFeed = AggregatorV3Interface(_priceFeed);
        creOracle = _creOracle;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Request to mint USDA by depositing ETH
     * @dev ETH is locked until PoR verification completes (async)
     * @return requestId Unique identifier for this mint request
     */
    function requestMint() 
        external 
        payable 
        nonReentrant 
        returns (bytes32 requestId) 
    {
        require(msg.value >= 0.001 ether, "SentinelBank: minimum 0.001 ETH");
        
        // 1. ACE Compliance Check (Compliance Layer)
        _requireACECompliance();
        
        // 2. Get ETH/USD price from Chainlink (Price Feed)
        (,int256 price,,uint256 updatedAt,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "SentinelBank: invalid price");
        require(block.timestamp - updatedAt < 1 hours, "SentinelBank: stale price");
        
        // Calculate USDA amount (price has 8 decimals)
        // USDA has 18 decimals like USDC
        uint256 usdAmount = (msg.value * uint256(price)) / 1e8;
        
        // 3. Create unique request ID
        requestId = keccak256(abi.encodePacked(
            msg.sender,
            msg.value,
            block.timestamp,
            block.number,
            requestCount++
        ));
        
        // Store request - ETH stays LOCKED in contract!
        mintRequests[requestId] = MintRequest({
            user: msg.sender,
            ethDeposited: msg.value,
            usdToMint: usdAmount,
            requestTime: block.timestamp,
            ethPrice: uint256(price),
            status: Status.PENDING
        });
        
        pendingRequests.push(requestId);
        
        emit MintRequested(
            requestId,
            msg.sender,
            msg.value,
            usdAmount,
            uint256(price),
            block.timestamp
        );
        
        // CRE workflow is triggered off-chain by this event
        // User must wait for fulfillPoR callback...
    }
    
    /**
     * @notice Burn USDA to redeem ETH
     * @param usdaAmount Amount of USDA to burn
     */
    function burn(uint256 usdaAmount) external nonReentrant {
        require(balanceOf(msg.sender) >= usdaAmount, "SentinelBank: insufficient balance");
        require(usdaAmount > 0, "SentinelBank: amount must be > 0");
        
        // Get current price
        (,int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "SentinelBank: invalid price");
        
        // Calculate ETH to return
        // usdaAmount (18 decimals) * 1e8 / price (8 decimals)
        uint256 ethAmount = (usdaAmount * 1e8) / uint256(price);
        
        require(address(this).balance >= ethAmount, "SentinelBank: insufficient ETH backing");
        
        // Burn tokens first (checks-effects-interactions)
        _burn(msg.sender, usdaAmount);
        totalMinted -= usdaAmount;
        totalEthBacking -= ethAmount;
        
        // Send ETH
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "SentinelBank: ETH transfer failed");
        
        emit RefundExecuted(
            bytes32(0), // No request ID for burns
            msg.sender,
            ethAmount,
            "BURN_REDEEM"
        );
    }
    
    // ============ CRE Oracle Functions ============
    
    /**
     * @notice Called by CRE workflow after verifying bank reserves
     * @dev This is the callback from the PoR verification
     * @param requestId The mint request to process
     * @param bankHasReserves Whether bank has sufficient reserves
     * @param bankReservesAmount Current bank reserve amount (for transparency)
     */
    function fulfillPoR(
        bytes32 requestId,
        bool bankHasReserves,
        uint256 bankReservesAmount
    ) external nonReentrant onlyCREOracle {
        MintRequest storage req = mintRequests[requestId];
        
        require(req.status == Status.PENDING, "SentinelBank: not pending");
        require(block.timestamp <= req.requestTime + 1 hours, "SentinelBank: request expired");
        
        // Mark as processed
        req.status = bankHasReserves ? Status.APPROVED : Status.REJECTED;
        _removeFromPending(requestId);
        
        emit PoRVerified(
            requestId,
            bankHasReserves,
            bankReservesAmount,
            req.usdToMint,
            bankHasReserves ? "SUFFICIENT_RESERVES" : "INSUFFICIENT_RESERVES"
        );
        
        if (bankHasReserves) {
            // ✅ PoR PASSED + ACE PASSED → Mint USDA
            _mint(req.user, req.usdToMint);
            totalMinted += req.usdToMint;
            totalEthBacking += req.ethDeposited;
            
            emit MintExecuted(
                requestId,
                req.user,
                req.usdToMint,
                req.ethDeposited
            );
        } else {
            // ❌ PoR FAILED → Refund ETH
            totalRefunded += req.ethDeposited;
            
            (bool success, ) = payable(req.user).call{value: req.ethDeposited}("");
            require(success, "SentinelBank: refund failed");
            
            emit RefundExecuted(
                requestId,
                req.user,
                req.ethDeposited,
                "INSUFFICIENT_BANK_RESERVES"
            );
        }
    }
    
    // ============ Admin Functions ============
    
    function setCREOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid address");
        creOracle = _newOracle;
        emit CREOracleUpdated(_newOracle);
    }
    
    // ============ View Functions ============
    
    function getMintRequest(bytes32 requestId) 
        external 
        view 
        returns (MintRequest memory) 
    {
        return mintRequests[requestId];
    }
    
    function getPendingRequests() external view returns (bytes32[] memory) {
        return pendingRequests;
    }
    
    function getPendingRequestCount() external view returns (uint256) {
        return pendingRequests.length;
    }
    
    /**
     * @notice Calculate USDA amount for given ETH
     */
    function previewMint(uint256 ethAmount) external view returns (uint256 usdaAmount) {
        (,int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return (ethAmount * uint256(price)) / 1e8;
    }
    
    /**
     * @notice Calculate ETH amount for given USDA
     */
    function previewBurn(uint256 usdaAmount) external view returns (uint256 ethAmount) {
        (,int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return (usdaAmount * 1e8) / uint256(price);
    }
    
    function getVaultStats() external view returns (
        uint256 ethBacking,
        uint256 usdaMinted,
        uint256 totalRefundedEth,
        uint256 pendingCount,
        uint256 totalRequests
    ) {
        return (
            totalEthBacking,
            totalMinted,
            totalRefunded,
            pendingRequests.length,
            requestCount
        );
    }
    
    // ============ Internal Functions ============
    
    function _removeFromPending(bytes32 requestId) internal {
        for (uint i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == requestId) {
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
    }
    
    // Required to receive ETH
    receive() external payable {}
}
