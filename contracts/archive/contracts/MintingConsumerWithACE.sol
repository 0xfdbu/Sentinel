// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./core/SentinelPauseController.sol";

/**
 * @title MintingConsumerWithACE
 * @notice CRE Consumer for minting USDA with ACE policy enforcement
 * @dev Receives DON-signed reports via onReport() and mints stablecoins after ACE validation
 * 
 * Pause Integration:
 *   - Uses SentinelPauseController for centralized pause management
 *   - Sentinel nodes can pause via CRE workflows
 *   - Guardians can pause/unpause
 *   - Bank operator retains emergency pause capability
 */
contract MintingConsumerWithACE {
    // Report instructions
    uint8 constant INSTRUCTION_MINT = 1;
    uint8 constant INSTRUCTION_BURN = 2;
    
    // Stablecoin token
    IERC20 public stablecoin;
    
    // CRE Forwarder (set by CRE on deployment)
    address public forwarder;
    
    // Bank operator (for manual operations)
    address public bankOperator;
    
    // Pause Controller
    ISentinelPauseController public pauseController;
    
    // Local paused state (fallback if no controller set)
    bool public locallyPaused;
    
    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedReports;
    
    // Events
    event MintRequested(
        bytes32 indexed reportHash,
        address indexed beneficiary,
        uint256 amount,
        bytes32 bankRef
    );
    
    event BurnRequested(
        bytes32 indexed reportHash,
        address indexed burner,
        uint256 amount,
        bytes32 bankRef
    );
    
    event ReportReceived(bytes32 indexed reportHash, bytes report);
    event PauseControllerUpdated(address indexed controller);
    
    // Errors
    error OnlyForwarder();
    error OnlyBankOperator();
    error OnlyPauseController();
    error ReportAlreadyUsed(bytes32 reportHash);
    error InvalidInstruction(uint8 instruction);
    error MintFailed(address to, uint256 amount);
    error BurnFailed(address from, uint256 amount);
    error ContractPaused();
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
     * @param _bankOperator Bank operator address for manual operations
     * @param _pauseController SentinelPauseController address (can be set later)
     */
    constructor(address _stablecoin, address _bankOperator, address _pauseController) {
        if (_stablecoin == address(0) || _bankOperator == address(0)) revert ZeroAddress();
        stablecoin = IERC20(_stablecoin);
        bankOperator = _bankOperator;
        if (_pauseController != address(0)) {
            pauseController = ISentinelPauseController(_pauseController);
        }
    }
    
    /**
     * @notice Set the CRE Forwarder address
     * @dev Called by bank operator after CRE deployment
     */
    function setForwarder(address _forwarder) external onlyBankOperator {
        if (_forwarder == address(0)) revert ZeroAddress();
        forwarder = _forwarder;
    }
    
    /**
     * @notice Set the Pause Controller
     * @dev Can only be set by bank operator
     */
    function setPauseController(address _pauseController) external onlyBankOperator {
        if (_pauseController == address(0)) revert ZeroAddress();
        pauseController = ISentinelPauseController(_pauseController);
        emit PauseControllerUpdated(_pauseController);
    }
    
    /**
     * @notice Receive report from CRE Forwarder
     * @dev Called by Forwarder with DON-signed report
     * @param metadata Additional context (metadata from Forwarder)
     * @param report The encoded report data with mint instruction
     */
    function onReport(
        bytes calldata metadata,
        bytes calldata report
    ) external onlyForwarder whenNotPaused {
        // Calculate report hash for replay protection
        bytes32 reportHash = keccak256(report);
        
        // Prevent replay attacks
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        emit ReportReceived(reportHash, report);
        
        // Decode report: (instructionType, account, amount, bankRef)
        (uint8 instructionType, address account, uint256 amount, bytes32 bankRef) = 
            abi.decode(report, (uint8, address, uint256, bytes32));
        
        if (instructionType == INSTRUCTION_MINT) {
            _processMint(reportHash, account, amount, bankRef);
        } else if (instructionType == INSTRUCTION_BURN) {
            _processBurn(reportHash, account, amount, bankRef);
        } else {
            revert InvalidInstruction(instructionType);
        }
    }
    
    /**
     * @notice Process mint instruction
     * @dev ACE Policy Check happens before this call via Forwarder's PolicyEngine
     * If beneficiary is blacklisted, the Forwarder will revert before reaching here
     */
    function _processMint(
        bytes32 reportHash,
        address beneficiary,
        uint256 amount,
        bytes32 bankRef
    ) internal {
        emit MintRequested(reportHash, beneficiary, amount, bankRef);
        
        // Transfer tokens from consumer to beneficiary
        bool success = stablecoin.transfer(beneficiary, amount);
        if (!success) revert MintFailed(beneficiary, amount);
    }
    
    /**
     * @notice Process burn instruction
     * @dev Burns tokens from user's wallet (requires approval)
     */
    function _processBurn(
        bytes32 reportHash,
        address burner,
        uint256 amount,
        bytes32 bankRef
    ) internal {
        emit BurnRequested(reportHash, burner, amount, bankRef);
        
        // Transfer tokens from burner to this contract (burn)
        bool success = stablecoin.transferFrom(burner, address(this), amount);
        if (!success) revert BurnFailed(burner, amount);
    }
    
    /**
     * @notice Manual mint by bank operator (bypasses CRE)
     * @dev Emergency/admin use only
     */
    function emergencyMint(
        address to,
        uint256 amount,
        bytes32 bankRef
    ) external onlyBankOperator whenNotPaused {
        bytes32 reportHash = keccak256(abi.encodePacked(to, amount, bankRef, block.timestamp));
        emit MintRequested(reportHash, to, amount, bankRef);
        
        bool success = stablecoin.transfer(to, amount);
        if (!success) revert MintFailed(to, amount);
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
     * @dev This function is called by the SentinelPauseController when pausing
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
     * @dev Use this when pause controller is not available or for immediate response
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
     * @notice Withdraw stuck tokens (emergency)
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyBankOperator {
        IERC20(token).transfer(to, amount);
    }
}
