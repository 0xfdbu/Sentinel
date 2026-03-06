// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAny2EVMMessageReceiver} from "./IAny2EVMMessageReceiver.sol";

/// @notice TokenAmount struct for CCIP transfers
struct TokenAmount {
    address token;
    uint256 amount;
}

/// @notice EVM2AnyMessage struct for CCIP cross-chain messages
struct EVM2AnyMessage {
    bytes receiver;
    bytes data;
    TokenAmount[] tokenAmounts;
    address feeToken;
    bytes extraArgs;
}

/// @notice Any2EVMMessage struct for received CCIP messages
struct Any2EVMMessage {
    bytes32 messageId;
    uint64 sourceChainSelector;
    bytes sender;
    bytes data;
    TokenAmount[] destTokenAmounts;
}

/**
 * @title IRouterClient
 * @notice Interface for Chainlink CCIP Router
 * @dev Based on Chainlink CCIP v1.2.0
 */
interface IRouterClient {
    /// @notice Error when a chain is not supported
    error UnsupportedDestinationChain(uint64 destChainSelector);
    
    /// @notice Error when the destination chain is the same as the source
    error InvalidDestinationChain();
    
    /// @notice Error when the receiver address is invalid
    error InvalidReceiverAddress();
    
    /// @notice Error when the message is invalid
    error InvalidMessage();
    
    /// @notice Error when the fee token is invalid
    error InvalidFeeToken();

    /// @notice Emitted when a message is sent
    event MessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed sender,
        bytes receiver,
        bytes data,
        TokenAmount[] tokenAmounts,
        address feeToken,
        uint256 fees
    );

    /**
     * @notice Send a message to a destination chain
     * @param destinationChainSelector The destination chain selector
     * @param message The message to send
     * @return messageId The unique message ID
     */
    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external payable returns (bytes32 messageId);

    /**
     * @notice Get the fee for sending a message
     * @param destinationChainSelector The destination chain selector
     * @param message The message to send
     * @return fee The fee amount
     */
    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage calldata message
    ) external view returns (uint256 fee);

    /**
     * @notice Check if a chain is supported
     * @param chainSelector The chain selector to check
     * @return supported True if the chain is supported
     */
    function isChainSupported(uint64 chainSelector) external view returns (bool supported);

    /**
     * @notice Get the supported fee tokens for a chain
     * @param chainSelector The chain selector
     * @return feeTokens Array of supported fee token addresses
     */
    function getSupportedTokens(uint64 chainSelector) external view returns (address[] memory feeTokens);
}
