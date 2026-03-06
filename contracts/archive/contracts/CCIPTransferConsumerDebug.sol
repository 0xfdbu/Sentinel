// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

/**
 * @title CCIPTransferConsumerDebug
 * @notice DEBUG VERSION - Identifies exact failure point in CCIP via Forwarder
 * @dev This version emits events at every step to trace the execution
 */
contract CCIPTransferConsumerDebug {
    uint8 constant INSTRUCTION_CCIP_TRANSFER = 3;
    
    IERC20 public stablecoin;
    IRouterClient public ccipRouter;
    address public forwarder;
    address public bankOperator;
    
    mapping(bytes32 => bool) public usedReports;
    mapping(uint64 => bool) public supportedChains;
    
    // DEBUG EVENTS - emitted at every step
    event Debug_EnteredOnReport(address sender, uint256 contractBalance);
    event Debug_ForwarderCheck(address sender, address expectedForwarder, bool passed);
    event Debug_ReportHash(bytes32 reportHash);
    event Debug_UsedReportCheck(bytes32 reportHash, bool wasUsed);
    event Debug_DecodedReport(uint8 instructionType, address sender, address receiver, uint256 amount, uint64 destinationChain);
    event Debug_InstructionCheck(uint8 instructionType, uint8 expected, bool passed);
    event Debug_ChainCheck(uint64 chain, bool supported);
    event Debug_ProcessingTransfer(address sender, address receiver, uint256 amount, uint64 chain);
    event Debug_FeeCalculation(uint256 fees, uint256 contractBalance);
    event Debug_CCIPSendCalled(bytes32 messageId);
    event Debug_Revert(string reason);
    
    event CCIPTransferRequested(
        bytes32 indexed reportHash,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        uint64 destinationChain
    );
    
    error OnlyForwarder();
    error OnlyBankOperator();
    error ReportAlreadyUsed(bytes32 reportHash);
    error InvalidInstruction(uint8 instruction);
    error ChainNotSupported(uint64 chainSelector);
    error InsufficientBalance(uint256 required, uint256 available);
    
    modifier onlyForwarder() {
        if (msg.sender != forwarder) {
            emit Debug_ForwarderCheck(msg.sender, forwarder, false);
            revert OnlyForwarder();
        }
        emit Debug_ForwarderCheck(msg.sender, forwarder, true);
        _;
    }
    
    modifier onlyBankOperator() {
        if (msg.sender != bankOperator) revert OnlyBankOperator();
        _;
    }
    
    constructor(
        address _stablecoin,
        address _ccipRouter,
        address _bankOperator
    ) {
        stablecoin = IERC20(_stablecoin);
        ccipRouter = IRouterClient(_ccipRouter);
        bankOperator = _bankOperator;
    }
    
    function setForwarder(address _forwarder) external onlyBankOperator {
        forwarder = _forwarder;
    }
    
    function addSupportedChain(uint64 chainSelector) external onlyBankOperator {
        supportedChains[chainSelector] = true;
    }
    
    /**
     * @notice DEBUG VERSION - onReport with extensive logging
     */
    function onReport(
        bytes calldata report,
        bytes calldata reportContext
    ) external onlyForwarder {
        emit Debug_EnteredOnReport(msg.sender, address(this).balance);
        
        // Calculate report hash
        bytes32 reportHash = keccak256(report);
        emit Debug_ReportHash(reportHash);
        
        // Check used reports
        emit Debug_UsedReportCheck(reportHash, usedReports[reportHash]);
        if (usedReports[reportHash]) {
            revert ReportAlreadyUsed(reportHash);
        }
        usedReports[reportHash] = true;
        
        // Decode report
        (uint8 instructionType, address sender, address receiver, 
         uint256 amount, uint64 destinationChain) = 
            abi.decode(report, (uint8, address, address, uint256, uint64));
        
        emit Debug_DecodedReport(instructionType, sender, receiver, amount, destinationChain);
        
        // Check instruction type
        emit Debug_InstructionCheck(instructionType, INSTRUCTION_CCIP_TRANSFER, instructionType == INSTRUCTION_CCIP_TRANSFER);
        if (instructionType != INSTRUCTION_CCIP_TRANSFER) {
            revert InvalidInstruction(instructionType);
        }
        
        // Check chain support
        emit Debug_ChainCheck(destinationChain, supportedChains[destinationChain]);
        if (!supportedChains[destinationChain]) {
            revert ChainNotSupported(destinationChain);
        }
        
        emit Debug_ProcessingTransfer(sender, receiver, amount, destinationChain);
        
        // Process the transfer
        _processCCIPTransfer(reportHash, sender, receiver, amount, destinationChain);
    }
    
    function _processCCIPTransfer(
        bytes32 reportHash,
        address sender,
        address receiver,
        uint256 amount,
        uint64 destinationChain
    ) internal {
        emit CCIPTransferRequested(reportHash, sender, receiver, amount, destinationChain);
        
        // Handle token transfer/approval
        if (sender != address(this)) {
            // Pull tokens from external sender
            bool success = stablecoin.transferFrom(sender, address(this), amount);
            if (!success) {
                emit Debug_Revert("Token transfer failed");
                revert("Token transfer failed");
            }
        }
        
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
            data: "",
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0)
        });
        
        // Get fee
        uint256 fees = ccipRouter.getFee(destinationChain, message);
        emit Debug_FeeCalculation(fees, address(this).balance);
        
        if (fees > address(this).balance) {
            emit Debug_Revert("Insufficient balance for fees");
            revert InsufficientBalance(fees, address(this).balance);
        }
        
        // Send CCIP message
        bytes32 messageId = ccipRouter.ccipSend{value: fees}(destinationChain, message);
        emit Debug_CCIPSendCalled(messageId);
    }
    
    /**
     * @notice Manual CCIP transfer for comparison
     */
    function emergencyCCIPTransfer(
        address receiver,
        uint256 amount,
        uint64 destinationChain
    ) external payable onlyBankOperator {
        require(supportedChains[destinationChain], "Chain not supported");
        
        bytes32 reportHash = keccak256(abi.encodePacked(receiver, amount, destinationChain, block.timestamp));
        _processCCIPTransfer(reportHash, address(this), receiver, amount, destinationChain);
    }
    
    receive() external payable {}
}
