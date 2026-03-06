// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../standards/ACECompliant.sol";
import "../ccip/CCIPReceiver.sol";
import "../ccip/IRouterClient.sol";

/**
 * @title USDAStablecoinV3
 * @notice Cross-chain USDA with ACE compliance, Pause functionality, and PROPER CCIP bridging
 * @dev Uses LINK for CCIP fees (following Chainlink best practices)
 */
contract USDAStablecoinV3 is ERC20, ERC20Burnable, AccessControl, ACECompliant, CCIPReceiver, Pausable, ReentrancyGuard {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BRIDGE_ADMIN_ROLE = keccak256("BRIDGE_ADMIN_ROLE");
    
    uint8 private constant DECIMALS = 6;
    bytes4 private constant MSG_TYPE_BRIDGE = bytes4(keccak256("BRIDGE_TRANSFER"));
    
    // LINK token for CCIP fees
    IERC20 public immutable linkToken;
    
    uint256 public totalMinted;
    uint256 public totalBurned;
    mapping(address => bool) public registeredMinters;
    mapping(uint64 => address) public remoteStablecoins;
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintReset;
    uint256 public dailyMintLimit;
    uint256 public mintCap;
    uint256 public bridgeFeeBps;
    address public feeCollector;
    mapping(address => uint256) public bridgeNonces;
    
    // Events
    event Mint(address indexed to, uint256 amount, string reason);
    event Burn(address indexed from, uint256 amount, string reason);
    event BridgeInitiated(bytes32 indexed messageId, uint64 indexed destinationChainSelector, address indexed sender, address receiver, uint256 amount, uint256 fee);
    event BridgeCompleted(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address indexed receiver, uint256 amount);
    event RemoteStablecoinSet(uint64 indexed chainSelector, address remoteAddress);
    event BridgeFeeUpdated(uint256 newFeeBps);
    event FeeCollectorUpdated(address newCollector);
    event DailyMintLimitUpdated(uint256 newLimit);
    event MintCapUpdated(uint256 newCap);
    event PausedBy(address indexed account);
    event UnpausedBy(address indexed account);
    event MinterRegistered(address indexed minter);
    event MinterRevoked(address indexed minter);
    
    // Errors
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
    error InsufficientLinkBalance(uint256 required, uint256 available);
    error LinkApprovalFailed();
    
    modifier checkACE(address from, address to, uint256 value) {
        if (aceEnforcementEnabled && address(policyEngine) != address(0)) {
            (bool shouldBlock, string memory reason) = policyEngine.evaluateFromContract(from, to, value, msg.data);
            if (shouldBlock) {
                emit ACEBlock(from, msg.sig, reason);
                revert ACEComplianceFailed(reason);
            }
            emit ACEPass(from, msg.sig);
        }
        _;
    }
    
    modifier onlyMinter() {
        if (!registeredMinters[msg.sender] && !hasRole(MINTER_ROLE, msg.sender)) {
            revert NotRegisteredMinter();
        }
        _;
    }
    
    constructor(
        address _policyEngine, 
        address _guardian, 
        address _ccipRouter,
        address _linkToken,
        uint256 _initialMintCap, 
        uint256 _dailyMintLimit
    ) 
        ERC20("USDA Stablecoin", "USDA")
        ACECompliant(_policyEngine, _guardian)
        CCIPReceiver(_ccipRouter)
    {
        require(_linkToken != address(0), "Invalid LINK token");
        linkToken = IERC20(_linkToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BRIDGE_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, _guardian);
        
        mintCap = _initialMintCap;
        dailyMintLimit = _dailyMintLimit;
        bridgeFeeBps = 30;
        feeCollector = msg.sender;
    }
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    function transfer(address to, uint256 amount) public override checkACE(msg.sender, to, amount) returns (bool) {
        return super.transfer(to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) public override checkACE(from, to, amount) returns (bool) {
        return super.transferFrom(from, to, amount);
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused checkACE(msg.sender, to, amount) {
        _checkMintLimits(to, amount);
        _mint(to, amount);
        totalMinted += amount;
        _trackDailyMint(to, amount);
        emit Mint(to, amount, "Minter mint");
    }
    
    function crossChainMint(address to, uint256 amount) external onlyMinter whenNotPaused checkACE(msg.sender, to, amount) {
        _checkMintLimits(to, amount);
        _mint(to, amount);
        totalMinted += amount;
        _trackDailyMint(to, amount);
        emit Mint(to, amount, "Cross-chain mint");
    }
    
    function _checkMintLimits(address to, uint256 amount) internal view {
        if (amount == 0) revert InvalidAmount();
        if (totalSupply() + amount > mintCap) {
            revert ExceedsMintCap(totalSupply() + amount, mintCap);
        }
        uint256 todayMinted = dailyMinted[to];
        if (block.timestamp >= lastMintReset[to] + 1 days) {
            todayMinted = 0;
        }
        if (todayMinted + amount > dailyMintLimit) {
            revert ExceedsDailyMintLimit(todayMinted + amount, dailyMintLimit);
        }
    }
    
    function _trackDailyMint(address to, uint256 amount) internal {
        if (block.timestamp >= lastMintReset[to] + 1 days) {
            dailyMinted[to] = 0;
            lastMintReset[to] = block.timestamp;
        }
        dailyMinted[to] += amount;
    }
    
    function burn(uint256 amount) public override checkACE(msg.sender, address(0), amount) {
        super.burn(amount);
        totalBurned += amount;
        emit Burn(msg.sender, amount, "User burn");
    }
    
    function burnFrom(address account, uint256 amount) public override checkACE(account, address(0), amount) {
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit Burn(account, amount, "Burn from");
    }
    
    function crossChainBurn(uint256 amount) external whenNotPaused checkACE(msg.sender, address(0), amount) {
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit Burn(msg.sender, amount, "Cross-chain burn");
    }
    
    /**
     * @notice Bridge tokens to another chain using LINK for fees (PROPER CCIP)
     * @param destinationChainSelector Target chain selector
     * @param receiver Recipient address on destination
     * @param amount Amount to bridge
     * @return messageId CCIP message ID
     */
    function bridgeToChain(uint64 destinationChainSelector, address receiver, uint256 amount) 
        external nonReentrant whenNotPaused checkACE(msg.sender, receiver, amount) returns (bytes32 messageId) 
    {
        if (amount == 0) revert InvalidAmount();
        if (receiver == address(0)) revert InvalidReceiver();
        if (destinationChainSelector == 0) revert InvalidDestination();
        
        address remoteToken = remoteStablecoins[destinationChainSelector];
        if (remoteToken == address(0)) revert RemoteStablecoinNotSet(destinationChainSelector);
        
        uint256 bridgeFee = (amount * bridgeFeeBps) / 10000;
        uint256 amountToBridge = amount - bridgeFee;
        uint256 nonce = bridgeNonces[msg.sender]++;
        
        // Build CCIP message with LINK fees
        bytes memory messageData = abi.encode(MSG_TYPE_BRIDGE, receiver, amountToBridge, nonce);
        bytes memory encodedReceiver = abi.encode(remoteToken);
        
        EVM2AnyMessage memory message = EVM2AnyMessage({
            receiver: encodedReceiver,
            data: messageData,
            tokenAmounts: new TokenAmount[](0),
            feeToken: address(linkToken),
            extraArgs: ""
        });
        
        IRouterClient router = IRouterClient(getRouter());
        uint256 ccipFee = router.getFee(destinationChainSelector, message);
        
        // Check and transfer LINK
        if (linkToken.balanceOf(msg.sender) < ccipFee) {
            revert InsufficientLinkBalance(ccipFee, linkToken.balanceOf(msg.sender));
        }
        
        if (!linkToken.transferFrom(msg.sender, address(this), ccipFee)) {
            revert LinkApprovalFailed();
        }
        
        linkToken.approve(address(router), ccipFee);
        
        // Burn tokens and handle fee
        _burn(msg.sender, amount);
        totalBurned += amount;
        
        if (bridgeFee > 0 && feeCollector != address(0)) {
            _mint(feeCollector, bridgeFee);
        }
        
        // Send CCIP message
        messageId = router.ccipSend(destinationChainSelector, message);
        
        emit BridgeInitiated(messageId, destinationChainSelector, msg.sender, receiver, amountToBridge, ccipFee);
    }
    
    /**
     * @notice Receive CCIP messages from other chains
     */
    function _ccipReceive(Any2EVMMessage calldata message) internal override {
        // Decode sender
        address sender = abi.decode(message.sender, (address));
        
        // Verify source chain and sender
        if (!allowedSourceChains[message.sourceChainSelector]) {
            revert("Source chain not allowed");
        }
        if (!allowedSenders[message.sourceChainSelector][sender]) {
            revert("Source sender not allowed");
        }
        
        // Decode message data
        (bytes4 msgType, address receiver, uint256 amount, uint256 nonce) = abi.decode(
            message.data, 
            (bytes4, address, uint256, uint256)
        );
        
        if (msgType != MSG_TYPE_BRIDGE) revert("Invalid message type");
        if (receiver == address(0)) revert InvalidReceiver();
        if (amount == 0) revert InvalidAmount();
        
        // Mint tokens to receiver
        _mint(receiver, amount);
        totalMinted += amount;
        
        emit BridgeCompleted(message.messageId, message.sourceChainSelector, receiver, amount);
        emit Mint(receiver, amount, "CCIP bridge receipt");
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit PausedBy(msg.sender);
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit UnpausedBy(msg.sender);
    }
    
    function registerMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registeredMinters[minter] = true;
        _grantRole(MINTER_ROLE, minter);
        emit MinterRegistered(minter);
    }
    
    function revokeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registeredMinters[minter] = false;
        _revokeRole(MINTER_ROLE, minter);
        emit MinterRevoked(minter);
    }
    
    function setRemoteStablecoin(uint64 chainSelector, address remoteAddress) external onlyRole(BRIDGE_ADMIN_ROLE) {
        remoteStablecoins[chainSelector] = remoteAddress;
        allowedSourceChains[chainSelector] = true;
        allowedSenders[chainSelector][remoteAddress] = true;
        emit RemoteStablecoinSet(chainSelector, remoteAddress);
    }
    
    function setBridgeFee(uint256 newFeeBps) external onlyRole(BRIDGE_ADMIN_ROLE) {
        require(newFeeBps <= 500, "Fee too high");
        bridgeFeeBps = newFeeBps;
        emit BridgeFeeUpdated(newFeeBps);
    }
    
    function setFeeCollector(address newCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }
    
    function setDailyMintLimit(uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyMintLimit = newLimit;
        emit DailyMintLimitUpdated(newLimit);
    }
    
    function setMintCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintCap = newCap;
        emit MintCapUpdated(newCap);
    }
    
    function grantPauserRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PAUSER_ROLE, account);
    }
    
    function revokePauserRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(PAUSER_ROLE, account);
    }
    
    /**
     * @notice Get bridge fee estimate including LINK fees
     */
    function getBridgeFeeEstimate(uint64 destinationChainSelector, address receiver, uint256 amount) 
        external view returns (uint256 ccipFee, uint256 bridgeFee) 
    {
        address remote = remoteStablecoins[destinationChainSelector];
        bytes memory data = abi.encode(MSG_TYPE_BRIDGE, receiver, amount, uint256(0));
        
        EVM2AnyMessage memory message = EVM2AnyMessage({
            receiver: abi.encode(remote),
            data: data,
            tokenAmounts: new TokenAmount[](0),
            feeToken: address(linkToken),
            extraArgs: ""
        });
        
        ccipFee = IRouterClient(getRouter()).getFee(destinationChainSelector, message);
        bridgeFee = (amount * bridgeFeeBps) / 10000;
    }
    
    function getRemainingDailyMint(address account) external view returns (uint256) {
        uint256 todayMinted = dailyMinted[account];
        if (block.timestamp >= lastMintReset[account] + 1 days) {
            todayMinted = 0;
        }
        return dailyMintLimit > todayMinted ? dailyMintLimit - todayMinted : 0;
    }
    
    function checkTransferCompliance(address from, address to, uint256 value) external returns (bool compliant, string memory reason) {
        if (!aceEnforcementEnabled || address(policyEngine) == address(0)) {
            return (true, "");
        }
        (bool shouldBlock, string memory blockReason) = policyEngine.evaluateFromContract(from, to, value, abi.encodeWithSelector(this.transfer.selector, to, value));
        return (!shouldBlock, blockReason);
    }
    
    function hasPauserRole(address account) external view returns (bool) {
        return hasRole(PAUSER_ROLE, account);
    }
    
    receive() external payable {}
}
