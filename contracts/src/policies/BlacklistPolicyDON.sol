// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicy.sol";

/**
 * @title BlacklistPolicyDON
 * @notice ACE Blacklist Policy with DON-signed report support
 * @dev Supports writeReport() from Chainlink CRE workflows
 */
contract BlacklistPolicyDON is IPolicy, AccessControl {
    
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant BLACKLIST_MANAGER_ROLE = keccak256("BLACKLIST_MANAGER_ROLE");
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    
    // DON report tracking
    mapping(bytes32 => bool) public usedReports;
    
    string public override name;
    string public override version;
    bool public override isActive;
    
    mapping(address => bool) public blacklist;
    mapping(address => string) public blacklistReason;
    address[] public blacklistedAddresses;
    mapping(address => uint256) private blacklistIndex;
    
    uint8 constant SEVERITY_CRITICAL = 4;
    
    // Instructions
    uint8 constant INSTRUCTION_BLACKLIST = 1;
    uint8 constant INSTRUCTION_UNBLACKLIST = 2;
    
    event AddressBlacklisted(address indexed addr, string reason, bytes32 reportHash);
    event AddressUnblacklisted(address indexed addr, bytes32 reportHash);
    event ReportProcessed(bytes32 indexed reportHash, uint8 instruction);
    
    error InvalidReport();
    error ReportAlreadyUsed(bytes32 reportHash);
    error AddressAlreadyBlacklisted();
    error AddressNotBlacklisted();
    error InvalidInstruction(uint8 instruction);
    
    modifier onlyActive() {
        require(isActive, "Policy: not active");
        _;
    }
    
    constructor(address admin) {
        name = "BlacklistPolicyDON";
        version = "1.0.0";
        isActive = true;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BLACKLIST_MANAGER_ROLE, admin);
    }
    
    /**
     * @notice Process DON-signed report from CRE workflow
     * @param report ABI-encoded report with instruction and parameters
     * 
     * Report format:
     * - bytes32 reportHash: Unique report identifier
     * - uint8 instruction: 1=blacklist, 2=unblacklist
     * - address target: Address to blacklist/unblacklist
     * - string reason: Reason for action
     */
    function writeReport(bytes calldata report) external onlyRole(DON_SIGNER_ROLE) {
        (
            bytes32 reportHash,
            uint8 instruction,
            address target,
            string memory reason
        ) = abi.decode(report, (bytes32, uint8, address, string));
        
        if (usedReports[reportHash]) revert ReportAlreadyUsed(reportHash);
        usedReports[reportHash] = true;
        
        if (instruction == INSTRUCTION_BLACKLIST) {
            _addToBlacklist(target, reason, reportHash);
        } else if (instruction == INSTRUCTION_UNBLACKLIST) {
            _removeFromBlacklist(target, reportHash);
        } else {
            revert InvalidInstruction(instruction);
        }
        
        emit ReportProcessed(reportHash, instruction);
    }
    
    function _addToBlacklist(address addr, string memory reason, bytes32 reportHash) internal {
        if (addr == address(0)) revert InvalidReport();
        if (blacklist[addr]) revert AddressAlreadyBlacklisted();
        
        blacklist[addr] = true;
        blacklistReason[addr] = reason;
        blacklistIndex[addr] = blacklistedAddresses.length;
        blacklistedAddresses.push(addr);
        
        emit AddressBlacklisted(addr, reason, reportHash);
    }
    
    function _removeFromBlacklist(address addr, bytes32 reportHash) internal {
        if (!blacklist[addr]) revert AddressNotBlacklisted();
        
        blacklist[addr] = false;
        delete blacklistReason[addr];
        
        // Remove from array
        uint256 index = blacklistIndex[addr];
        uint256 lastIndex = blacklistedAddresses.length - 1;
        
        if (index != lastIndex) {
            address lastAddr = blacklistedAddresses[lastIndex];
            blacklistedAddresses[index] = lastAddr;
            blacklistIndex[lastAddr] = index;
        }
        
        blacklistedAddresses.pop();
        delete blacklistIndex[addr];
        
        emit AddressUnblacklisted(addr, reportHash);
    }
    
    // Legacy role-based functions
    function addToBlacklist(address addr, string calldata reason) 
        external 
        onlyRole(BLACKLIST_MANAGER_ROLE) 
    {
        _addToBlacklist(addr, reason, bytes32(0));
    }
    
    function removeFromBlacklist(address addr) 
        external 
        onlyRole(BLACKLIST_MANAGER_ROLE) 
    {
        _removeFromBlacklist(addr, bytes32(0));
    }
    
    // IPolicy interface
    function evaluate(
        address from,
        address to,
        uint256,
        bytes calldata
    ) external view override onlyActive returns (bool, string memory, uint8) {
        if (blacklist[from]) {
            return (false, string(abi.encodePacked("Sender blacklisted: ", blacklistReason[from])), SEVERITY_CRITICAL);
        }
        if (blacklist[to]) {
            return (false, string(abi.encodePacked("Recipient blacklisted: ", blacklistReason[to])), SEVERITY_CRITICAL);
        }
        return (true, "", 0);
    }
    
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklist[addr];
    }
    
    function isReportUsed(bytes32 reportHash) external view returns (bool) {
        return usedReports[reportHash];
    }
}
