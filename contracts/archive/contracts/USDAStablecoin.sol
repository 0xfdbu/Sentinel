// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../standards/ACECompliant.sol";
import "../ccip/CCIPReceiver.sol";
import "../ccip/IRouterClient.sol";
import "../policies/IPolicyEngine.sol";

/**
 * @title USDAStablecoin
 * @notice ACE-compliant stablecoin with CCIP cross-chain support
 * @dev 
 * - Integrates with Sentinel PolicyEngine for compliance checks
 * - Supports cross-chain mint/burn via Chainlink CCIP
 * - Enforces policies at the contract level (not backend)
 * 
 * Cross-chain flow:
 * 1. User calls bridgeToChain() to burn tokens and send CCIP message
 * 2. Destination chain receives message and mints tokens via _ccipReceive()
 * 3. All transfers checked against ACE policies (blacklist, volume limits)
 */
contract USDAStablecoin is 
    ERC20, 
    ERC20Burnable, 
    ACECompliant, 
    CCIPReceiver,
    Pausable,
    ReentrancyGuard 
{
    // ═══════════════════════════════════════════════════════════════════════
    // Constants & Immutables
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Token decimals (6 for USD-like stablecoins)
    uint8 private constant DECIMALS = 6;
    
    /// @notice CCIP message version
    uint8 private constant CCIP_VERSION = 1;
    
    /// @notice Cross-chain transfer message type
    bytes4 private constant MSG_TYPE_BRIDGE = bytes4(keccak256("BRIDGE_TRANSFER"));
    
    // ═══════════════════════════════════════════════════════════════════════
    // State Variables
    // ═══════════════════════════════════════════════════════════════════════
    
    /// @notice Total minted supply (includes cross-chain)
    uint256 public totalMinted;
    
    /// @notice Total burned supply (includes cross-chain)
    uint256 public totalBurned;
    
    /// @notice Mapping of registered minters (other chain stablecoins)
    mapping(address => bool) public registeredMinters;
    
    /// @notice Mapping of chain selector to remote stablecoin address
    mapping(uint64 => address) public remoteStablecoins;
    
    /// @notice Daily mint limits per address
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintReset;
    uint256 public dailyMintLimit;
    
    /// @notice Global mint cap
    uint256 public mintCap;
    
    /// @notice Bridge fee (in basis points, 100 = 1%)
    uint256 public bridgeFeeBps;
    
    /// @notice Fee collector address
    address public feeCollector;
    
    /// @notice Nonce for bridge operations
    mapping(address => uint256) public bridgeNonces;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════
    
    event Mint(address indexed to, uint256 amount, string reason);
    event Burn(address indexed from, uint256 amount, string reason);
    event BridgeInitiated(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        address receiver,
        uint256 amount,
        uint256 fee
    );
    event BridgeCompleted(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address indexed receiver,
        uint256 amount
    );
    event RemoteStablecoinSet(uint64 indexed chainSelector, address remoteAddress);
    event MinterRegistered(address indexed minter);
    event MinterRevoked(address indexed minter);
    event BridgeFeeUpdated(uint256 newFeeBps);
    event FeeCollectorUpdated(address newCollector);
    event DailyMintLimitUpdated(uint256 newLimit);
    event MintCapUpdated(uint256 newCap);
    
    // ═══════════════════════════════════════════════════════════════════════
    // Errors
    // ═══════════════════════════════════════════════════════════════════════
    
    error ACEComplianceFailed(string reason);
    error ExceedsMintCap(uint256 requested, uint256 cap);
    error ExceedsDailyMintLimit(uint256 requested, uint256 limit);
    error InvalidAmount();
    error InvalidDestination();
    error InvalidReceiver();
    error BridgeFeeTransferFailed();
    error CCIPSendFailed();
    error NotRegisteredMinter();
    error RemoteStablecoinNotSet(uint64 chainSelector);
    error SameChainTransfer();
    
    // ═══════════════════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(
        address _policyEngine,
        address _guardian,
        address _ccipRouter,
        uint256 _initialMintCap,
        uint256 _dailyMintLimit
    ) 
        ERC20("USDA Stablecoin", "USDA")
        ACECompliant(_policyEngine, _guardian)
        CCIPReceiver(_ccipRouter)
    {
        mintCap = _initialMintCap;
        dailyMintLimit = _dailyMintLimit;
        bridgeFeeBps = 30; // 0.3% default bridge fee
        feeCollector = msg.sender;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // Modifiers
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check ACE compliance before executing function
     */
    modifier checkACE(address from, address to, uint256 value) {
        if (aceEnforcementEnabled && address(policyEngine) != address(0)) {
            (bool shouldBlock, string memory reason) = policyEngine.evaluateFromContract(
                from,
                to,
                value,
                msg.data
            );
            if (shouldBlock) {
                emit ACEBlock(from, msg.sig, reason);
                revert ACEComplianceFailed(reason);
            }
            emit ACEPass(from, msg.sig);
        }
        _;
    }
    
    /**
     * @notice Only registered minters (for cross-chain minting)
     */
    modifier onlyMinter() {
        if (!registeredMinters[msg.sender] && msg.sender != owner()) {
            revert NotRegisteredMinter();
        }
        _;
    }
    

    
    // ═══════════════════════════════════════════════════════════════════════
    // ERC20 Overrides with ACE Compliance
    // ═══════════════════════════════════════════════════════════════════════
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Override transfer to enforce ACE policies
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        checkACE(msg.sender, to, amount) 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @notice Override transferFrom to enforce ACE policies
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        checkACE(from, to, amount) 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // Minting Functions
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Mint tokens (owner only, with ACE compliance)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) 
        external 
        onlyOwner 
        whenNotPaused 
        checkACE(msg.sender, to, amount) 
    {
        _checkMintLimits(to, amount);
        _mint(to, amount);
        totalMinted += amount;
        _trackDailyMint(to, amount);
        emit Mint(to, amount, "Owner mint");
    }
    
    /**
     * @notice Cross-chain mint (called by CCIP receiver)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function crossChainMint(address to, uint256 amount) 
        external 
        onlyMinter 
        whenNotPaused 
        checkACE(msg.sender, to, amount) 
    {
        _checkMintLimits(to, amount);
        _mint(to, amount);
        totalMinted += amount;
        _trackDailyMint(to, amount);
        emit Mint(to, amount, "Cross-chain mint");
    }
    
    /**
     * @notice Check mint limits
     */
    function _checkMintLimits(address to, uint256 amount) internal view {
        if (amount == 0) revert InvalidAmount();
        if (totalSupply() + amount > mintCap) {
            revert ExceedsMintCap(totalSupply() + amount, mintCap);
        }
        
        // Check daily mint limit for recipient
        uint256 todayMinted = dailyMinted[to];
        if (block.timestamp >= lastMintReset[to] + 1 days) {
            todayMinted = 0;
        }
        if (todayMinted + amount > dailyMintLimit) {
            revert ExceedsDailyMintLimit(todayMinted + amount, dailyMintLimit);
        }
    }
    
    /**
     * @notice Track daily mint for an address
     */
    function _trackDailyMint(address to, uint256 amount) internal {
        if (block.timestamp >= lastMintReset[to] + 1 days) {
            dailyMinted[to] = 0;
            lastMintReset[to] = block.timestamp;
        }
        dailyMinted[to] += amount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // Burning Functions
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Burn tokens (with ACE compliance)
     */
    function burn(uint256 amount) 
        public 
        override 
        checkACE(msg.sender, address(0), amount) 
    {
        super.burn(amount);
        totalBurned += amount;
        emit Burn(msg.sender, amount, "User burn");
    }
    
    /**
     * @notice Burn from (with ACE compliance)
     */
    function burnFrom(address account, uint256 amount) 
        public 
        override 
        checkACE(account, address(0), amount) 
    {
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit Burn(account, amount, "Burn from");
    }
    
    /**
     * @notice Cross-chain burn (for bridging)
     * @param amount Amount to burn
     */
    function crossChainBurn(uint256 amount) 
        external 
        whenNotPaused 
        checkACE(msg.sender, address(0), amount) 
    {
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit Burn(msg.sender, amount, "Cross-chain burn");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CCIP Cross-Chain Bridge Functions
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Bridge tokens to another chain
     * @param destinationChainSelector The destination chain selector
     * @param receiver The receiver address on destination chain
     * @param amount Amount to bridge
     * @return messageId The CCIP message ID
     */
    function bridgeToChain(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        checkACE(msg.sender, receiver, amount) 
        returns (bytes32 messageId) 
    {
        if (amount == 0) revert InvalidAmount();
        if (receiver == address(0)) revert InvalidReceiver();
        if (destinationChainSelector == 0) revert InvalidDestination();
        if (remoteStablecoins[destinationChainSelector] == address(0)) {
            revert RemoteStablecoinNotSet(destinationChainSelector);
        }
        
        // Calculate bridge fee
        uint256 bridgeFee = (amount * bridgeFeeBps) / 10000;
        uint256 amountToBridge = amount - bridgeFee;
        
        // Burn tokens from sender (including fee)
        _burn(msg.sender, amount);
        totalBurned += amount;
        
        // Transfer fee to collector
        if (bridgeFee > 0 && feeCollector != address(0)) {
            _mint(feeCollector, bridgeFee);
        }
        
        // Prepare CCIP message
        bytes memory messageData = abi.encode(
            MSG_TYPE_BRIDGE,
            receiver,
            amountToBridge,
            bridgeNonces[msg.sender]++
        );
        
        EVM2AnyMessage memory message = EVM2AnyMessage({
            receiver: abi.encode(remoteStablecoins[destinationChainSelector]),
            data: messageData,
            tokenAmounts: new TokenAmount[](0),
            feeToken: address(0), // Pay in native ETH
            extraArgs: ""
        });
        
        // Get fee and validate
        IRouterClient router = IRouterClient(getRouter());
        uint256 fee = router.getFee(destinationChainSelector, message);
        if (msg.value < fee) revert CCIPSendFailed();
        
        // Send CCIP message
        messageId = router.ccipSend{value: fee}(destinationChainSelector, message);
        
        // Refund excess ETH
        if (msg.value > fee) {
            (bool success, ) = msg.sender.call{value: msg.value - fee}("");
            if (!success) revert BridgeFeeTransferFailed();
        }
        
        emit BridgeInitiated(
            messageId,
            destinationChainSelector,
            msg.sender,
            receiver,
            amountToBridge,
            fee
        );
        
        return messageId;
    }
    
    /**
     * @notice Receive CCIP messages (mint tokens on destination chain)
     * @param message The received CCIP message
     */
    function _ccipReceive(Any2EVMMessage calldata message) internal override {
        // Decode message data
        (
            bytes4 msgType,
            address receiver,
            uint256 amount,
            uint256 nonce
        ) = abi.decode(message.data, (bytes4, address, uint256, uint256));
        
        if (msgType != MSG_TYPE_BRIDGE) revert("Invalid message type");
        if (receiver == address(0)) revert InvalidReceiver();
        if (amount == 0) revert InvalidAmount();
        
        // Mint tokens to receiver
        _mint(receiver, amount);
        totalMinted += amount;
        
        emit BridgeCompleted(
            message.messageId,
            message.sourceChainSelector,
            receiver,
            amount
        );
        
        emit Mint(receiver, amount, "CCIP bridge receipt");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // Admin Functions
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Register a minter (for cross-chain minting)
     * @param minter The minter address to register
     */
    function registerMinter(address minter) external onlyOwner {
        registeredMinters[minter] = true;
        emit MinterRegistered(minter);
    }
    
    /**
     * @notice Revoke a minter
     * @param minter The minter address to revoke
     */
    function revokeMinter(address minter) external onlyOwner {
        registeredMinters[minter] = false;
        emit MinterRevoked(minter);
    }
    
    /**
     * @notice Set remote stablecoin address for a chain
     * @param chainSelector The chain selector
     * @param remoteAddress The remote stablecoin address
     */
    function setRemoteStablecoin(uint64 chainSelector, address remoteAddress) external onlyOwner {
        remoteStablecoins[chainSelector] = remoteAddress;
        // Also allow this chain as source
        allowedSourceChains[chainSelector] = true;
        // Allow the remote stablecoin as sender
        allowedSenders[chainSelector][remoteAddress] = true;
        emit RemoteStablecoinSet(chainSelector, remoteAddress);
    }
    
    /**
     * @notice Set bridge fee
     * @param newFeeBps New fee in basis points (100 = 1%)
     */
    function setBridgeFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Fee too high"); // Max 5%
        bridgeFeeBps = newFeeBps;
        emit BridgeFeeUpdated(newFeeBps);
    }
    
    /**
     * @notice Set fee collector
     * @param newCollector New fee collector address
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }
    
    /**
     * @notice Set daily mint limit
     * @param newLimit New daily mint limit
     */
    function setDailyMintLimit(uint256 newLimit) external onlyOwner {
        dailyMintLimit = newLimit;
        emit DailyMintLimitUpdated(newLimit);
    }
    
    /**
     * @notice Set mint cap
     * @param newCap New mint cap
     */
    function setMintCap(uint256 newCap) external onlyOwner {
        mintCap = newCap;
        emit MintCapUpdated(newCap);
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get bridge fee estimate
     * @param destinationChainSelector The destination chain selector
     * @param receiver The receiver address
     * @param amount The amount to bridge
     * @return ccipFee The CCIP fee in ETH
     * @return bridgeFee The bridge fee in tokens
     */
    function getBridgeFeeEstimate(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external view returns (uint256 ccipFee, uint256 bridgeFee) {
        bytes memory messageData = abi.encode(
            MSG_TYPE_BRIDGE,
            receiver,
            amount,
            uint256(0)
        );
        
        EVM2AnyMessage memory message = EVM2AnyMessage({
            receiver: abi.encode(remoteStablecoins[destinationChainSelector]),
            data: messageData,
            tokenAmounts: new TokenAmount[](0),
            feeToken: address(0),
            extraArgs: ""
        });
        
        ccipFee = IRouterClient(getRouter()).getFee(destinationChainSelector, message);
        bridgeFee = (amount * bridgeFeeBps) / 10000;
    }
    
    /**
     * @notice Get remaining daily mint for an address
     */
    function getRemainingDailyMint(address account) external view returns (uint256) {
        uint256 todayMinted = dailyMinted[account];
        if (block.timestamp >= lastMintReset[account] + 1 days) {
            todayMinted = 0;
        }
        return dailyMintLimit > todayMinted ? dailyMintLimit - todayMinted : 0;
    }
    
    /**
     * @notice Check if a transfer would pass ACE compliance
     */
    function checkTransferCompliance(
        address from,
        address to,
        uint256 value
    ) external returns (bool compliant, string memory reason) {
        if (!aceEnforcementEnabled || address(policyEngine) == address(0)) {
            return (true, "");
        }
        (bool shouldBlock, string memory blockReason) = policyEngine.evaluateFromContract(
            from,
            to,
            value,
            abi.encodeWithSelector(this.transfer.selector, to, value)
        );
        return (!shouldBlock, blockReason);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // Receive Function
    // ═══════════════════════════════════════════════════════════════════════
    
    receive() external payable {}
}
