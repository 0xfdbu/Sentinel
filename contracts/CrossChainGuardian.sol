// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SentinelRegistry.sol";

// CCIP imports (these would be installed via npm)
// For hackathon, we'll define interfaces inline to avoid dependency issues
interface IRouterClient {
    function ccipSend(
        uint64 destinationChainSelector,
        bytes memory message
    ) external payable returns (bytes32);
    
    function getFee(
        uint64 destinationChainSelector,
        bytes memory message
    ) external view returns (uint256);
}

interface ICCIPReceiver {
    function ccipReceive(bytes memory message) external;
}

/**
 * @title CrossChainGuardian
 * @notice Multi-chain emergency guardian with CCIP integration
 * @dev Executes pauses across multiple chains atomically
 * @author Sentinel Team
 * @track Chainlink Convergence Hackathon 2026
 */

interface IPausable {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}

contract CrossChainGuardian is Ownable {
    
    // ============ Structs ============
    
    struct SentinelMessage {
        uint256 messageType;      // 1 = PAUSE, 2 = UNPAUSE, 3 = THREAT_ALERT
        address victimContract;
        bytes32 threatHash;
        uint256 sourceChainId;
        uint256 timestamp;
        uint256 nonce;
    }
    
    struct PauseStatus {
        bool isPaused;
        uint256 pausedAt;
        bytes32 threatHash;
        uint256 sourceChain;      // Which chain triggered the pause
        address triggeredBy;      // Which guardian triggered it
    }
    
    struct CCIPMessage {
        uint64 sourceChainSelector;
        address sender;
        bytes data;
    }
    
    // ============ State Variables ============
    
    SentinelRegistry public registry;
    IRouterClient public ccipRouter;
    
    // Chain selector mapping
    // Ethereum Sepolia: 16015286601757825753
    // Arbitrum Sepolia: 3478487238524512106
    // Base Sepolia: 10344971235874465080
    mapping(uint64 => address) public guardiansByChain;
    mapping(uint64 => bool) public supportedChains;
    
    // Pause status tracking
    mapping(address => PauseStatus) public pauseStatus;
    mapping(bytes32 => bool) public processedMessages; // Prevent replay
    
    // Statistics
    uint256 public totalLocalPauses;
    uint256 public totalCrossChainMessagesSent;
    uint256 public totalCrossChainMessagesReceived;
    
    // ============ Events ============
    
    event LocalPauseExecuted(
        address indexed victim,
        bytes32 indexed threatHash,
        address triggeredBy,
        uint256 timestamp
    );
    
    event CrossChainPauseInitiated(
        address indexed victim,
        bytes32 indexed threatHash,
        uint64[] targetChains,
        uint256 totalFee,
        uint256 timestamp
    );
    
    event CrossChainPauseReceived(
        uint64 indexed sourceChainSelector,
        address indexed victim,
        bytes32 indexed threatHash,
        uint256 timestamp
    );
    
    event CCIPMessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        address victim,
        uint256 fee
    );
    
    event ChainSupportAdded(uint64 indexed chainSelector, address guardian);
    event ChainSupportRemoved(uint64 indexed chainSelector);
    
    // ============ Errors ============
    
    error ContractNotRegistered();
    error AlreadyPaused();
    error NotPaused();
    error Unauthorized();
    error ChainNotSupported();
    error InvalidMessage();
    error MessageAlreadyProcessed();
    error CCIPError(bytes);
    error InsufficientFee(uint256 required, uint256 provided);
    
    // ============ Modifiers ============
    
    modifier onlySentinel() {
        // In production, check CRE oracle address
        // For hackathon: authorized address
        if (!registry.isAuthorizedSentinel(msg.sender)) revert Unauthorized();
        _;
    }
    
    modifier onlyValidReceiver(uint64 sourceChain) {
        if (!supportedChains[sourceChain]) revert ChainNotSupported();
        // Verify sender is registered guardian on source chain
        if (msg.sender != ccipRouter) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _registry,
        address _ccipRouter
    ) Ownable(msg.sender) {
        if (_registry == address(0)) revert InvalidMessage();
        registry = SentinelRegistry(_registry);
        ccipRouter = IRouterClient(_ccipRouter);
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Execute emergency pause with optional cross-chain propagation
     * @param target Contract to pause
     * @param threatHash Hash of threat details (for privacy)
     * @param siblingChains Array of chain selectors to also pause on
     */
    function emergencyPause(
        address target,
        bytes32 threatHash,
        uint64[] calldata siblingChains
    ) external payable onlySentinel {
        if (!registry.isRegistered(target)) revert ContractNotRegistered();
        if (pauseStatus[target].isPaused) revert AlreadyPaused();
        
        // Execute local pause first
        _executeLocalPause(target, threatHash);
        
        // If cross-chain propagation needed
        if (siblingChains.length > 0) {
            uint256 totalFee = _sendCrossChainPause(target, threatHash, siblingChains);
            
            // Refund excess ETH
            if (msg.value > totalFee) {
                payable(msg.sender).transfer(msg.value - totalFee);
            }
        }
    }
    
    /**
     * @notice Simplified pause without cross-chain
     */
    function emergencyPause(
        address target,
        bytes32 threatHash
    ) external onlySentinel {
        if (!registry.isRegistered(target)) revert ContractNotRegistered();
        if (pauseStatus[target].isPaused) revert AlreadyPaused();
        
        _executeLocalPause(target, threatHash);
    }
    
    /**
     * @notice Lift pause (can be called by contract owner or after expiry)
     */
    function liftPause(address target) external {
        PauseStatus storage status = pauseStatus[target];
        if (!status.isPaused) revert NotPaused();
        
        // Check authorization
        bool isOwner = false;
        try IPausable(target).owner() returns (address owner) {
            isOwner = owner == msg.sender;
        } catch {}
        
        bool isGuardianOwner = msg.sender == owner();
        bool isSentinel = registry.isAuthorizedSentinel(msg.sender);
        
        if (!isOwner && !isGuardianOwner && !isSentinel) revert Unauthorized();
        
        // Execute unpause
        IPausable(target).unpause();
        status.isPaused = false;
        
        emit LocalPauseExecuted(target, status.threatHash, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Receive pause message from another chain
     */
    function ccipReceive(bytes calldata message) external onlyValidReceiver(16015286601757825753) {
        // Decode CCIP message
        CCIPMessage memory ccipMsg = abi.decode(message, (CCIPMessage));
        
        // Decode Sentinel message
        SentinelMessage memory sentinelMsg = abi.decode(ccipMsg.data, (SentinelMessage));
        
        // Prevent replay attacks
        bytes32 messageHash = keccak256(ccipMsg.data);
        if (processedMessages[messageHash]) revert MessageAlreadyProcessed();
        processedMessages[messageHash] = true;
        
        // Execute pause
        if (sentinelMsg.messageType == 1) { // PAUSE
            if (!registry.isRegistered(sentinelMsg.victimContract)) {
                // Still emit event but don't pause
                emit CrossChainPauseReceived(
                    ccipMsg.sourceChainSelector,
                    sentinelMsg.victimContract,
                    sentinelMsg.threatHash
                );
                return;
            }
            
            _executeLocalPause(sentinelMsg.victimContract, sentinelMsg.threatHash);
            
            emit CrossChainPauseReceived(
                ccipMsg.sourceChainSelector,
                sentinelMsg.victimContract,
                sentinelMsg.threatHash
            );
            
            totalCrossChainMessagesReceived++;
        }
    }
    
    // ============ Internal Functions ============
    
    function _executeLocalPause(address target, bytes32 threatHash) internal {
        IPausable(target).pause();
        
        pauseStatus[target] = PauseStatus({
            isPaused: true,
            pausedAt: block.timestamp,
            threatHash: threatHash,
            sourceChain: block.chainid,
            triggeredBy: msg.sender
        });
        
        totalLocalPauses++;
        
        emit LocalPauseExecuted(target, threatHash, msg.sender, block.timestamp);
    }
    
    function _sendCrossChainPause(
        address target,
        bytes32 threatHash,
        uint64[] calldata destinationChains
    ) internal returns (uint256 totalFee) {
        // Encode Sentinel message
        bytes memory data = abi.encode(SentinelMessage({
            messageType: 1, // PAUSE
            victimContract: target,
            threatHash: threatHash,
            sourceChainId: block.chainid,
            timestamp: block.timestamp,
            nonce: block.number
        }));
        
        for (uint i = 0; i < destinationChains.length; i++) {
            uint64 destChain = destinationChains[i];
            if (!supportedChains[destChain]) revert ChainNotSupported();
            
            // Build CCIP message
            bytes memory message = _buildCCIPMessage(
                guardiansByChain[destChain],
                data
            );
            
            // Calculate fee
            uint256 fee = ccipRouter.getFee(destChain, message);
            totalFee += fee;
            
            // Send via CCIP
            try ccipRouter.ccipSend{value: fee}(destChain, message) returns (bytes32 messageId) {
                emit CCIPMessageSent(messageId, destChain, target, fee);
                totalCrossChainMessagesSent++;
            } catch (bytes memory err) {
                revert CCIPError(err);
            }
        }
        
        emit CrossChainPauseInitiated(target, threatHash, destinationChains, totalFee, block.timestamp);
    }
    
    function _buildCCIPMessage(
        address receiver,
        bytes memory data
    ) internal pure returns (bytes memory) {
        // Encode CCIP message format
        return abi.encode(CCIPMessage({
            sourceChainSelector: 0, // Will be set by router
            sender: address(0),     // Will be set by router
            data: data
        }));
    }
    
    // ============ Admin Functions ============
    
    function addSupportedChain(uint64 chainSelector, address guardian) external onlyOwner {
        if (chainSelector == 0 || guardian == address(0)) revert InvalidMessage();
        supportedChains[chainSelector] = true;
        guardiansByChain[chainSelector] = guardian;
        emit ChainSupportAdded(chainSelector, guardian);
    }
    
    function removeSupportedChain(uint64 chainSelector) external onlyOwner {
        supportedChains[chainSelector] = false;
        delete guardiansByChain[chainSelector];
        emit ChainSupportRemoved(chainSelector);
    }
    
    function updateRegistry(address _registry) external onlyOwner {
        if (_registry == address(0)) revert InvalidMessage();
        registry = SentinelRegistry(_registry);
    }
    
    function updateRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert InvalidMessage();
        ccipRouter = IRouterClient(_router);
    }
    
    // ============ View Functions ============
    
    function isPaused(address target) external view returns (bool) {
        return pauseStatus[target].isPaused;
    }
    
    function getPauseDetails(address target) external view returns (PauseStatus memory) {
        return pauseStatus[target];
    }
    
    function estimateCrossChainFee(
        address target,
        bytes32 threatHash,
        uint64[] calldata destinationChains
    ) external view returns (uint256 totalFee) {
        bytes memory data = abi.encode(SentinelMessage({
            messageType: 1,
            victimContract: target,
            threatHash: threatHash,
            sourceChainId: block.chainid,
            timestamp: block.timestamp,
            nonce: 0
        }));
        
        bytes memory message = _buildCCIPMessage(address(0), data);
        
        for (uint i = 0; i < destinationChains.length; i++) {
            if (supportedChains[destinationChains[i]]) {
                totalFee += ccipRouter.getFee(destinationChains[i], message);
            }
        }
    }
    
    // ============ Receive ETH ============
    
    receive() external payable {}
    fallback() external payable {}
}
