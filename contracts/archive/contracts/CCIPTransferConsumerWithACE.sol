// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import "./core/SentinelPauseController.sol";

/**
 * @title CCIPTransferConsumerWithACE
 * @notice CRE Consumer for cross-chain transfers with ACE policy enforcement
 * @dev Receives DON-signed reports and initiates CCIP transfers after ACE validation
 * 
 * Pause Integration:
 *   - Uses SentinelPauseController for centralized pause management
 *   - Sentinel nodes can pause via CRE workflows
 *   - Guardians can pause/unpause
 *   - Bank operator retains emergency pause capability
 */
contract CCIPTransferConsumerWithACE {
    // Report instructions
    uint8 constant INSTRUCTION_CCIP_TRANSFER = 3;
    
    // Stablecoin token
    IERC20 public stablecoin;
    
    // CCIP Router
    IRouterClient public ccipRouter;
    
    // CRE Forwarder
    address public forwarder;
    
    // Bank operator
    address public bankOperator;
    
    // Pause Controller
    ISentinelPauseController public pauseController;
    
    // Local paused state (fallback if no controller set)
    bool public locallyPaused;
    
    // Nonce tracking
    mapping(bytes32 => bool) public usedReports;
    
    // Chain selectors
    mapping(uint64 => bool) public supportedChains;
    
    // Events
    event CCIPTransferRequested(
        bytes32 indexed reportHash,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        uint64 destinationChain
    );
    
    event ReportReceived(bytes32 indexed reportHash, bytes report);
    event ChainSupported(uint64 indexed chainSelector);
    event ChainRemoved(uint64 indexed chainSelector);
    event PauseControllerUpdated(address indexed controller);
    
    // Errors
    error OnlyForwarder();
    error OnlyBankOperator();
    error OnlyPauseController();
    error ReportAlreadyUsed(bytes32 reportHash);
    error InvalidInstruction(uint8 instruction);
    error ChainNotSupported(uint64 chainSelector);
    error CCIPTransferFailed(bytes errorData);
    error ContractPaused();
    error InsufficientBalance(uint256 required, uint256 available);
    error NoFeeTokenSet();
    error ZeroAddress();
    
    // Modifiers
    modifier onlyForwarder() {
        if (msg.sender != forwarder) revert OnlyForwarder();
        _;
    }
    
    modifier onlyBankOperator() {
        if (msg.sender != bankOperator) revert OnlyBankOperator();
        _;
    }
    
    modifier whenNotPaused() {
        if (_isPaused()) revert ContractPaused();
        _;
    }
    
    /**
     * @param _stablecoin USDA token address
     * @param _ccipRouter CCIP Router address
     * @param _bankOperator Bank operator address
     * @param _pauseController SentinelPauseController address (can be set later)
     */
    constructor(
        address _stablecoin, 
        address _ccipRouter, 
        address _bankOperator,
        address _pauseController
    ) {
        if (_stablecoin == address(0) || _ccipRouter == address(0) || _bankOperator == address(0)) {
            revert ZeroAddress();
        }
        stablecoin = IERC20(_stablecoin);
        ccipRouter = IRouterClient(_ccipRouter);
        bankOperator = _bankOperator;
        if (_pauseController != address(0)) {
            pauseController = ISentinelPauseController(_pauseController);
        }
    }
    
    /**
     * @notice Set the CRE Forwarder address
     */
    function setForwarder(address _forwarder) external onlyBankOperator {
        if (_forwarder == address(0)) revert ZeroAddress();
        forwarder = _forwarder;
    }
    
    /**
     * @notice Set the Pause Controller
     */
    function setPauseController(address _pauseController) external onlyBankOperator {
        if (_pauseController == address(0)) revert ZeroAddress();
        pauseController = ISentinelPauseController(_pauseController);
        emit PauseControllerUpdated(_pauseController);
    }
    
    /**
     * @notice Add supported destination chain
     */
    function addSupportedChain(uint64 chainSelector) external onlyBankOperator {
        supportedChains[chainSelector] = true;
        emit ChainSupported(chainSelector);
    }
    
    /**
     * @notice Remove supported destination chain
     */
    function removeSupportedChain(uint64 chainSelector) external onlyBankOperator {
        supportedChains[chainSelector] = false;
        emit ChainRemoved(chainSelector);
    }
    
    /**
     * @notice Receive report from CRE Forwarder
     * @dev Called by Forwarder with DON-signed report
     * @param report The encoded report data
     * @param reportContext Additional context (metadata)
     */
    function onReport(
        bytes calldata report,
        bytes calldata reportContext
    ) external onlyForwarder whenNotPaused {
        // Calculate report hash
        bytes32 reportHash = keccak256(report);
        
        // Prevent replay attacks
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        emit ReportReceived(reportHash, report);
        
        // Decode report: (instructionType, sender, receiver, amount, destinationChain)
        (
            uint8 instructionType,
            address sender,
            address receiver,
            uint256 amount,
            uint64 destinationChain
        ) = abi.decode(report, (uint8, address, address, uint256, uint64));
        
        if (instructionType == INSTRUCTION_CCIP_TRANSFER) {
            _processCCIPTransfer(reportHash, sender, receiver, amount, destinationChain);
        } else {
            revert InvalidInstruction(instructionType);
        }
    }
    
    /**
     * @notice Process CCIP transfer instruction
     * @dev ACE VolumePolicy check happens before this call via Forwarder's PolicyEngine
     */
    function _processCCIPTransfer(
        bytes32 reportHash,
        address sender,
        address receiver,
        uint256 amount,
        uint64 destinationChain
    ) internal {
        // Verify chain is supported
        if (!supportedChains[destinationChain]) {
            revert ChainNotSupported(destinationChain);
        }
        
        emit CCIPTransferRequested(reportHash, sender, receiver, amount, destinationChain);
        
        // Pull tokens from sender
        // If sender is this contract (tokens were minted here), use transfer
        // Otherwise, use transferFrom (requires approval from external sender)
        bool success;
        if (sender == address(this)) {
            // Tokens are already in this contract, no approval needed
            success = true; // Just proceed, we already have the tokens
        } else {
            // Pull tokens from external sender (requires approval)
            success = stablecoin.transferFrom(sender, address(this), amount);
        }
        if (!success) revert CCIPTransferFailed("token transfer failed");
        
        // Approve CCIP router
        stablecoin.approve(address(ccipRouter), amount);
        
        // Build CCIP message
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: address(stablecoin),
            amount: amount
        });
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: "", // No additional data
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0) // Pay fees in native ETH
        });
        
        // Get fee
        uint256 fees = ccipRouter.getFee(destinationChain, message);
        if (fees > address(this).balance) {
            revert InsufficientBalance(fees, address(this).balance);
        }
        
        // Send CCIP message
        bytes32 messageId = ccipRouter.ccipSend{value: fees}(destinationChain, message);
    }
    
    /**
     * @notice Manual CCIP transfer by bank operator
     */
    function emergencyCCIPTransfer(
        address receiver,
        uint256 amount,
        uint64 destinationChain
    ) external payable onlyBankOperator whenNotPaused {
        // Verify chain is supported
        if (!supportedChains[destinationChain]) {
            revert ChainNotSupported(destinationChain);
        }
        
        bytes32 reportHash = keccak256(abi.encodePacked(receiver, amount, destinationChain, block.timestamp));
        emit CCIPTransferRequested(reportHash, address(this), receiver, amount, destinationChain);
        
        // Approve and send
        stablecoin.approve(address(ccipRouter), amount);
        
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: address(stablecoin),
            amount: amount
        });
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0)
        });
        
        ccipRouter.ccipSend{value: msg.value}(destinationChain, message);
    }
    
    // ============================================
    // Pause Functions
    // ============================================
    
    /**
     * @notice Check if contract is paused
     * @dev Checks both local pause and pause controller
     */
    function _isPaused() internal view returns (bool) {
        // Check local pause first
        if (locallyPaused) return true;
        
        // Check pause controller if set
        if (address(pauseController) != address(0)) {
            return pauseController.isPaused(address(this));
        }
        
        return false;
    }
    
    /**
     * @notice Check if contract is paused (public view)
     */
    function isPaused() external view returns (bool) {
        return _isPaused();
    }
    
    /**
     * @notice Pause via Pause Controller (called by controller)
     */
    function pauseByController() external {
        if (msg.sender != address(pauseController)) revert OnlyPauseController();
        locallyPaused = true;
    }
    
    /**
     * @notice Unpause via Pause Controller (called by controller)
     */
    function unpauseByController() external {
        if (msg.sender != address(pauseController)) revert OnlyPauseController();
        locallyPaused = false;
    }
    
    /**
     * @notice Local pause by bank operator (emergency)
     */
    function pause() external onlyBankOperator {
        locallyPaused = true;
    }
    
    /**
     * @notice Local unpause by bank operator
     */
    function unpause() external onlyBankOperator {
        locallyPaused = false;
    }
    
    // ============================================
    // Admin Functions
    // ============================================
    
    /**
     * @notice Update bank operator
     */
    function setBankOperator(address _bankOperator) external onlyBankOperator {
        if (_bankOperator == address(0)) revert ZeroAddress();
        bankOperator = _bankOperator;
    }
    
    /**
     * @notice Withdraw stuck tokens
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyBankOperator {
        IERC20(token).transfer(to, amount);
    }
    
    /**
     * @notice Withdraw stuck ETH
     */
    function rescueETH(address payable to, uint256 amount) external onlyBankOperator {
        to.transfer(amount);
    }
    
    receive() external payable {}
}
