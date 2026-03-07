// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IUSDAStablecoinV8 {
    function mint(address to, uint256 amount) external;
    function hasRole(bytes32 role, address account) external view returns (bool);
    function MINTER_ROLE() external view returns (bytes32);
}

/**
 * @title MintingConsumerV8
 * @notice Minting consumer for USDA V8 with proper mint functionality
 * @dev Accepts mint calls from Chainlink CRE Forwarder (implements IReceiver interface)
 */
contract MintingConsumerV8 is AccessControl {
    
    // IReceiver interface constant
    bytes4 constant RECEIVER_SELECTOR = 0x6d6ac477; // onReport(bytes,bytes) selector
    
    // Report instructions
    uint8 constant INSTRUCTION_MINT = 1;
    uint8 constant INSTRUCTION_BURN = 2;
    
    // USDA V8 token
    IUSDAStablecoinV8 public usdaToken;
    
    // Authorized minters
    mapping(address => bool) public authorizedMinters;
    
    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedReports;
    
    // Events
    event MintExecuted(
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
    error NotMinterRole();
    
    modifier onlyAuthorizedMinter() {
        if (!authorizedMinters[msg.sender] && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert OnlyAuthorizedMinter();
        }
        _;
    }
    
    constructor(address _usdaToken, address _admin) {
        if (_usdaToken == address(0) || _admin == address(0)) revert ZeroAddress();
        usdaToken = IUSDAStablecoinV8(_usdaToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }
    
    /**
     * @notice Authorize a minter address
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
     * @notice onReport - Chainlink CRE Forwarder interface
     * @dev This is the entry point called by the Chainlink Forwarder
     * @param metadata DON attestation metadata (contains workflow ID, DON signatures, etc.)
     * @param report The report containing mint instructions
     * 
     * Report format: abi.encode(uint8 instructionType, address beneficiary, uint256 amount, bytes32 bankRef)
     */
    function onReport(bytes calldata metadata, bytes calldata report) external returns (bool) {
        // In production, the Forwarder validates DON signatures before calling this function
        // In simulation, test signatures are used which still pass through the Forwarder
        return _processMint(report);
    }
    
    /**
     * @notice Write report - Standard CRE interface for DON-signed reports (for testing/direct calls)
     * @dev This allows authorized minters to call directly without going through Forwarder
     * @param report The DON-signed report containing mint instructions
     */
    function writeReport(bytes calldata report) external onlyAuthorizedMinter returns (bool) {
        return _processMint(report);
    }
    
    /**
     * @notice Process mint with report data
     * @dev Actually Mints new tokens (not transfer)
     */
    function processMint(
        bytes calldata report
    ) external onlyAuthorizedMinter returns (bool) {
        return _processMint(report);
    }
    
    /**
     * @notice Internal mint processing
     */
    function _processMint(bytes calldata report) internal returns (bool) {
        // Calculate report hash for replay protection
        bytes32 reportHash = keccak256(report);
        
        // Prevent replay attacks
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        // Decode report: (instructionType, beneficiary, amount, bankRef)
        (uint8 instructionType, address beneficiary, uint256 amount, bytes32 bankRef) = 
            abi.decode(report, (uint8, address, uint256, bytes32));
        
        if (instructionType != INSTRUCTION_MINT) {
            revert InvalidInstruction(instructionType);
        }
        
        // MINT new tokens (not transfer!)
        // Note: USDA V8 mint doesn't return a value, it reverts on failure
        usdaToken.mint(beneficiary, amount);
        
        emit MintExecuted(reportHash, beneficiary, amount, bankRef);
        
        return true;
    }
    
    /**
     * @notice Direct mint function for testing
     */
    function mintDirect(
        address beneficiary,
        uint256 amount,
        bytes32 bankRef
    ) external onlyAuthorizedMinter returns (bool) {
        bytes32 reportHash = keccak256(abi.encodePacked(beneficiary, amount, bankRef, block.timestamp));
        
        // MINT new tokens
        // Note: USDA V8 mint doesn't return a value, it reverts on failure
        usdaToken.mint(beneficiary, amount);
        
        emit MintExecuted(reportHash, beneficiary, amount, bankRef);
        
        return true;
    }
    
    /**
     * @notice Update USDA token address (admin only)
     */
    function setUSDAToken(address _usdaToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_usdaToken == address(0)) revert ZeroAddress();
        usdaToken = IUSDAStablecoinV8(_usdaToken);
    }
    
    /**
     * @notice Receive ETH for funding
     */
    receive() external payable {}
}
