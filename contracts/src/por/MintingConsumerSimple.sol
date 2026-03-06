// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MintingConsumerSimple
 * @notice Simplified minting consumer for testing with local CRE simulation
 * @dev Accepts mint calls directly from authorized senders (for testing)
 * 
 * WARNING: This is for TESTING ONLY. Production should use proper
 * DON-signed report validation via CRE Forwarder.
 */
contract MintingConsumerSimple is AccessControl {
    
    // Report instructions
    uint8 constant INSTRUCTION_MINT = 1;
    uint8 constant INSTRUCTION_BURN = 2;
    
    // Stablecoin token
    IERC20 public stablecoin;
    
    // Authorized minters (for testing - in production this would be CRE Forwarder)
    mapping(address => bool) public authorizedMinters;
    
    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedReports;
    
    // Events
    event MintRequested(
        bytes32 indexed reportHash,
        address indexed beneficiary,
        uint256 amount,
        bytes32 bankRef
    );
    
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    
    // Errors
    error OnlyAuthorizedMinter();
    error ReportAlreadyUsed(bytes32 reportHash);
    error InvalidInstruction(uint8 instruction);
    error MintFailed(address to, uint256 amount);
    error ZeroAddress();
    
    modifier onlyAuthorizedMinter() {
        if (!authorizedMinters[msg.sender] && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert OnlyAuthorizedMinter();
        }
        _;
    }
    
    constructor(address _stablecoin, address _admin) {
        if (_stablecoin == address(0) || _admin == address(0)) revert ZeroAddress();
        stablecoin = IERC20(_stablecoin);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }
    
    /**
     * @notice Authorize a minter address
     * @dev In testing, this is your wallet. In production, this would be CRE Forwarder.
     */
    function authorizeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }
    
    /**
     * @notice Revoke a minter address
     */
    function revokeMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }
    
    /**
     * @notice Process mint with report data
     * @dev Accepts raw report bytes (instructionType, beneficiary, amount, bankRef)
     * 
     * For local CRE simulation: Call this directly with the report bytes
     * For production: This should be called via CRE Forwarder with DON signatures
     */
    function processMint(
        bytes calldata report
    ) external onlyAuthorizedMinter returns (bool) {
        // Calculate report hash for replay protection
        bytes32 reportHash = keccak256(report);
        
        // Prevent replay attacks
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        // Decode report: (instructionType, account, amount, bankRef)
        (uint8 instructionType, address beneficiary, uint256 amount, bytes32 bankRef) = 
            abi.decode(report, (uint8, address, uint256, bytes32));
        
        if (instructionType != INSTRUCTION_MINT) {
            revert InvalidInstruction(instructionType);
        }
        
        emit MintRequested(reportHash, beneficiary, amount, bankRef);
        
        // Transfer tokens from consumer to beneficiary
        bool success = stablecoin.transfer(beneficiary, amount);
        if (!success) revert MintFailed(beneficiary, amount);
        
        return true;
    }
    
    /**
     * @notice Direct mint function for testing
     * @dev Bypasses report structure for simple testing
     */
    function mintDirect(
        address beneficiary,
        uint256 amount,
        bytes32 bankRef
    ) external onlyAuthorizedMinter returns (bool) {
        bytes32 reportHash = keccak256(abi.encodePacked(beneficiary, amount, bankRef, block.timestamp));
        emit MintRequested(reportHash, beneficiary, amount, bankRef);
        
        bool success = stablecoin.transfer(beneficiary, amount);
        if (!success) revert MintFailed(beneficiary, amount);
        
        return true;
    }
    
    /**
     * @notice Receive ETH for funding
     */
    receive() external payable {}
}
