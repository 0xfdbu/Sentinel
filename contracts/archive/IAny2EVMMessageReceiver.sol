// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Any2EVMMessage} from "./IRouterClient.sol";

/**
 * @title IAny2EVMMessageReceiver
 * @notice Interface for contracts that receive CCIP messages
 * @dev Based on Chainlink CCIP v1.2.0
 */
interface IAny2EVMMessageReceiver {
    /// @notice Error when the sender is not the CCIP router
    error OnlyRouterCanFulfill();
    
    /// @notice Error when the chain selector is invalid
    error InvalidChainSelector();
    
    /// @notice Error when the source sender is invalid
    error InvalidSourceSender();

    /**
     * @notice Called by the CCIP router when a message is received
     * @param message The received message
     */
    function ccipReceive(Any2EVMMessage calldata message) external;
}
