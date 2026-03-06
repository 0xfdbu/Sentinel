// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAny2EVMMessageReceiver} from "./IAny2EVMMessageReceiver.sol";
import {Any2EVMMessage} from "./IRouterClient.sol";

/**
 * @title CCIPReceiver
 * @notice Base contract for CCIP message receivers
 * @dev Based on Chainlink CCIP v1.2.0
 */
abstract contract CCIPReceiver is IAny2EVMMessageReceiver {
    /// @notice The CCIP router address
    address internal immutable i_ccipRouter;
    
    /// @notice Contract owner
    address public ccipOwner;
    
    /// @notice Mapping of allowed source chain selectors
    mapping(uint64 => bool) public allowedSourceChains;
    
    /// @notice Mapping of allowed senders per source chain
    mapping(uint64 => mapping(address => bool)) public allowedSenders;

    /// @notice Events
    event SourceChainAllowed(uint64 indexed chainSelector, bool allowed);
    event SourceSenderAllowed(uint64 indexed chainSelector, address indexed sender, bool allowed);
    event CCIPMessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address indexed sender,
        bytes data
    );

    /// @notice Error when router address is invalid
    error InvalidRouter();
    
    /// @notice Error when sender is not the router
    error OnlyRouter();
    
    /// @notice Error when caller is not the owner
    error OnlyCCIPOwner();

    /**
     * @param router The address of the CCIP router
     */
    constructor(address router) {
        if (router == address(0)) revert InvalidRouter();
        i_ccipRouter = router;
        ccipOwner = msg.sender;
    }
    
    /**
     * @notice Modifier for owner-only functions
     */
    modifier onlyCCIPOwner() {
        if (msg.sender != ccipOwner) revert OnlyCCIPOwner();
        _;
    }

    /**
     * @notice Modifier to ensure only the CCIP router can call
     */
    modifier onlyRouter() {
        if (msg.sender != i_ccipRouter) revert OnlyRouter();
        _;
    }

    /**
     * @notice Get the CCIP router address
     * @return The router address
     */
    function getRouter() public view returns (address) {
        return i_ccipRouter;
    }

    /**
     * @notice Allow or disallow a source chain
     * @param chainSelector The chain selector
     * @param allowed Whether the chain is allowed
     */
    function setSourceChainAllowed(uint64 chainSelector, bool allowed) external onlyCCIPOwner {
        allowedSourceChains[chainSelector] = allowed;
        emit SourceChainAllowed(chainSelector, allowed);
    }

    /**
     * @notice Allow or disallow a sender from a source chain
     * @param chainSelector The source chain selector
     * @param sender The sender address
     * @param allowed Whether the sender is allowed
     */
    function setSourceSenderAllowed(uint64 chainSelector, address sender, bool allowed) external onlyCCIPOwner {
        allowedSenders[chainSelector][sender] = allowed;
        emit SourceSenderAllowed(chainSelector, sender, allowed);
    }

    /**
     * @notice Check if a source chain is allowed
     * @param chainSelector The chain selector to check
     * @return True if the chain is allowed
     */
    function isSourceChainAllowed(uint64 chainSelector) public view returns (bool) {
        return allowedSourceChains[chainSelector];
    }

    /**
     * @notice Check if a sender from a source chain is allowed
     * @param chainSelector The source chain selector
     * @param sender The sender address
     * @return True if the sender is allowed
     */
    function isSourceSenderAllowed(uint64 chainSelector, address sender) public view returns (bool) {
        return allowedSenders[chainSelector][sender];
    }

    /**
     * @notice Entry point for CCIP router to deliver messages
     * @param message The received message
     */
    function ccipReceive(Any2EVMMessage calldata message) external virtual onlyRouter {
        // Verify source chain is allowed
        if (!allowedSourceChains[message.sourceChainSelector]) {
            revert InvalidChainSelector();
        }
        
        // Decode sender address
        address sender = abi.decode(message.sender, (address));
        
        // Verify sender is allowed
        if (!allowedSenders[message.sourceChainSelector][sender]) {
            revert InvalidSourceSender();
        }

        emit CCIPMessageReceived(
            message.messageId,
            message.sourceChainSelector,
            sender,
            message.data
        );

        _ccipReceive(message);
    }

    /**
     * @notice Override this function in the implementation contract
     * @param message The received message
     */
    function _ccipReceive(Any2EVMMessage calldata message) internal virtual;
}
