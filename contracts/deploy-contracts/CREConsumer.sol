// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Minimal FunctionsClient interface
interface IFunctionsRouter {
    function getAllowListId() external view returns (bytes32);
    function getAdminFee() external view returns (uint96);
    function isValidCallback(
        bytes32 requestId,
        address clientAddress
    ) external view returns (bool);
}

interface IFunctionsClient {
    function handleOracleFulfillment(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external;
}

library FunctionsRequest {
    struct Request {
        string source;
        bytes encryptedSecretsReference;
        string[] args;
        bytes[] bytesArgs;
    }

    function initializeRequestForInlineJavaScript(
        Request memory self,
        string memory javaScriptSource
    ) internal pure {
        self.source = javaScriptSource;
    }

    function addSecretsReference(
        Request memory self,
        bytes memory encryptedSecretsReference
    ) internal pure {
        self.encryptedSecretsReference = encryptedSecretsReference;
    }

    function setArgs(Request memory self, string[] memory args) internal pure {
        self.args = args;
    }

    function encodeCBOR(Request memory self) internal pure returns (bytes memory) {
        // Simplified encoding for deployment
        return abi.encode(self.source, self.args);
    }
}

/**
 * @title CREConsumer - Chainlink Functions Consumer for Sentinel
 * @notice Executes confidential emergency pauses via Chainlink Functions
 */
contract CREConsumer is IFunctionsClient {
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
    event RequestSent(bytes32 indexed requestId);

    // ============ State ============
    mapping(address => bool) public authorizedSentinels;
    uint64 public subscriptionId;
    bytes32 public donId;
    uint32 public gasLimit = 300000;
    mapping(bytes32 => PauseRequest) public pendingRequests;
    address public pauseTarget;
    bool public isProcessing;

    // Chainlink Functions Router
    address public immutable functionsRouter;

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
    ) {
        functionsRouter = _functionsRouter;
        subscriptionId = _subscriptionId;
        donId = _donId;
        authorizedSentinels[msg.sender] = true;
    }

    // ============ Admin Functions ============
    function authorizeSentinel(address sentinel) external onlySentinel {
        authorizedSentinels[sentinel] = true;
    }

    function revokeSentinel(address sentinel) external onlySentinel {
        authorizedSentinels[sentinel] = false;
    }

    function updateConfig(
        uint64 _subscriptionId,
        bytes32 _donId,
        uint32 _gasLimit
    ) external onlySentinel {
        subscriptionId = _subscriptionId;
        donId = _donId;
        gasLimit = _gasLimit;
    }

    function setPauseTarget(address target) external onlySentinel {
        pauseTarget = target;
    }

    // ============ Core Functions ============
    function requestConfidentialPause(
        address target,
        bytes32 vulnHash,
        bytes calldata encryptedSecretsReference,
        string calldata source
    ) external onlySentinel returns (bytes32 requestId) {
        if (isProcessing) revert AlreadyProcessing();
        isProcessing = true;

        // Build request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        
        if (encryptedSecretsReference.length > 0) {
            req.addSecretsReference(encryptedSecretsReference);
        }

        string[] memory args = new string[](3);
        args[0] = toHexString(uint256(uint160(target)), 20);
        args[1] = toHexString(uint256(vulnHash), 32);
        args[2] = toAsciiString(msg.sender);
        req.setArgs(args);

        // Generate request ID (simplified)
        requestId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            target
        ));

        // Store pending request
        pendingRequests[requestId] = PauseRequest({
            target: target,
            vulnHash: vulnHash,
            timestamp: block.timestamp,
            executed: false
        });

        emit PauseRequestInitiated(requestId, target, vulnHash, block.timestamp);
        emit RequestSent(requestId);
        
        return requestId;
    }

    // ============ Oracle Callback ============
    function handleOracleFulfillment(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external override {
        // Only router can call this
        if (msg.sender != functionsRouter) revert UnauthorizedSentinel();
        
        emit ResponseReceived(requestId, response, err);

        PauseRequest storage request = pendingRequests[requestId];
        if (request.executed) return;

        if (err.length > 0) {
            isProcessing = false;
            revert RequestFailed();
        }

        bool success = abi.decode(response, (bool));
        if (success) {
            request.executed = true;
            emit PauseExecuted(requestId, request.target, true);
        }

        isProcessing = false;
    }

    // ============ Utility Functions ============
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
