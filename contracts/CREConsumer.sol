// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title CREConsumer - Chainlink Functions Consumer for Sentinel
 * @notice Executes confidential emergency pauses via Chainlink Functions
 * @dev This contract is called by the Sentinel Node when threats are detected
 */
contract CREConsumer is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    // ============ Errors ============
    error UnauthorizedSentinel();
    error InvalidResponse();
    error RequestFailed();
    error AlreadyProcessing();

    // ============ Events ============
    event PauseRequestInitiated(
        bytes32 indexed requestId,
        address indexed target,
        bytes32 vulnHash,
        uint256 timestamp
    );
    event PauseExecuted(
        bytes32 indexed requestId,
        address indexed target,
        bool success
    );
    event ResponseReceived(
        bytes32 indexed requestId,
        bytes response,
        bytes err
    );

    // ============ State ============
    /// @notice Mapping of authorized Sentinel node addresses
    mapping(address => bool) public authorizedSentinels;
    
    /// @notice Subscription ID for Chainlink Functions
    uint64 public subscriptionId;
    
    /// @notice DON ID for the Functions oracle
    bytes32 public donId;
    
    /// @notice Gas limit for Functions execution
    uint32 public gasLimit = 300000;
    
    /// @notice Pending pause requests
    mapping(bytes32 => PauseRequest) public pendingRequests;
    
    /// @notice Target contract that can be paused
    address public pauseTarget;
    
    /// @notice Whether a request is currently being processed
    bool public isProcessing;

    struct PauseRequest {
        address target;
        bytes32 vulnHash;
        uint256 timestamp;
        bool executed;
    }

    // ============ Modifiers ============
    modifier onlySentinel() {
        if (!authorizedSentinels[msg.sender]) revert UnauthorizedSentinel();
        _;
    }

    // ============ Constructor ============
    constructor(
        address _functionsRouter,
        uint64 _subscriptionId,
        bytes32 _donId
    ) FunctionsClient(_functionsRouter) {
        subscriptionId = _subscriptionId;
        donId = _donId;
        authorizedSentinels[msg.sender] = true; // Deployer is first sentinel
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Authorize a new Sentinel node
     * @param sentinel Address of the Sentinel node to authorize
     */
    function authorizeSentinel(address sentinel) external onlySentinel {
        authorizedSentinels[sentinel] = true;
    }

    /**
     * @notice Revoke Sentinel authorization
     * @param sentinel Address of the Sentinel node to revoke
     */
    function revokeSentinel(address sentinel) external onlySentinel {
        authorizedSentinels[sentinel] = false;
    }

    /**
     * @notice Update Chainlink Functions configuration
     */
    function updateConfig(
        uint64 _subscriptionId,
        bytes32 _donId,
        uint32 _gasLimit
    ) external onlySentinel {
        subscriptionId = _subscriptionId;
        donId = _donId;
        gasLimit = _gasLimit;
    }

    /**
     * @notice Set the target contract that can be paused
     */
    function setPauseTarget(address target) external onlySentinel {
        pauseTarget = target;
    }

    // ============ Core Functions ============

    /**
     * @notice Request confidential pause execution via Chainlink Functions
     * @param target Contract address to pause
     * @param vulnHash Hash of the detected vulnerability
     * @param encryptedSecretsReference Reference to encrypted API keys/secrets
     * @param source JavaScript source code to execute
     */
    function requestConfidentialPause(
        address target,
        bytes32 vulnHash,
        bytes calldata encryptedSecretsReference,
        string calldata source
    ) external onlySentinel returns (bytes32 requestId) {
        if (isProcessing) revert AlreadyProcessing();
        
        isProcessing = true;

        // Build the Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        
        // Add encrypted secrets if provided
        if (encryptedSecretsReference.length > 0) {
            req.addSecretsReference(encryptedSecretsReference);
        }

        // Set arguments for the Functions script
        string[] memory args = new string[](3);
        args[0] = toHexString(uint256(uint160(target)), 20);
        args[1] = toHexString(uint256(vulnHash), 32);
        args[2] = toAsciiString(msg.sender);
        req.setArgs(args);

        // Send request to Chainlink Functions
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        // Store pending request
        pendingRequests[requestId] = PauseRequest({
            target: target,
            vulnHash: vulnHash,
            timestamp: block.timestamp,
            executed: false
        });

        emit PauseRequestInitiated(requestId, target, vulnHash, block.timestamp);
        
        return requestId;
    }

    /**
     * @notice Callback function called by Chainlink Functions DON
     * @param requestId The ID of the request
     * @param response The response from the Functions execution
     * @param err Any error from the Functions execution
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        emit ResponseReceived(requestId, response, err);

        PauseRequest storage request = pendingRequests[requestId];
        if (request.executed) return;

        // Check if there was an error
        if (err.length > 0) {
            isProcessing = false;
            revert RequestFailed();
        }

        // Parse response - expected to be ABI-encoded boolean
        bool success = abi.decode(response, (bool));
        
        if (success) {
            request.executed = true;
            emit PauseExecuted(requestId, request.target, true);
        }

        isProcessing = false;
    }

    // ============ Utility Functions ============

    /**
     * @notice Helper to convert address to hex string
     */
    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = bytes1(uint8(48 + uint256(value % 16)));
            if (uint8(buffer[i]) > 57) {
                buffer[i] = bytes1(uint8(buffer[i]) + 39);
            }
            value /= 16;
        }
        return string(buffer);
    }

    /**
     * @notice Helper to convert address to ASCII string
     */
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19-i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2+2*i] = char(hi);
            s[2+2*i+1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
