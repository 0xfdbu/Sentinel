// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IPolicy.sol";

/**
 * @title BlacklistPolicyRBAC
 * @notice ACE Policy: Rejects transactions from/to blacklisted addresses
 * @dev Upgraded version using AccessControl instead of Ownable
 * 
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles, emergency functions
 * - SENTINEL_ROLE: Can add/remove blacklisted addresses (autonomous)
 * - BLACKLIST_MANAGER_ROLE: Can manage blacklist
 */
contract BlacklistPolicyRBAC is IPolicy, AccessControl {
    // Role definitions
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant BLACKLIST_MANAGER_ROLE = keccak256("BLACKLIST_MANAGER_ROLE");
    
    // Policy metadata
    string public override name;
    string public override version;
    bool public override isActive;
    
    // Blacklist mapping
    mapping(address => bool) public blacklist;
    mapping(address => string) public blacklistReason;
    address[] public blacklistedAddresses;
    mapping(address => uint256) private blacklistIndex;
    
    // Severity constant
    uint8 constant SEVERITY_CRITICAL = 4;
    
    // Events
    event AddressBlacklisted(address indexed addr, string reason, address indexed by);
    event AddressRemovedFromBlacklist(address indexed addr, address indexed by);
    event BatchBlacklistAdded(address[] addresses, string reason);
    event PolicyStatusChanged(bool active);
    
    // Custom errors
    error AddressAlreadyBlacklisted();
    error AddressNotBlacklisted();
    error ZeroAddressNotAllowed();
    error BlacklistedAddress(address addr);
    
    modifier onlyActive() {
        require(isActive, "Policy: not active");
        _;
    }
    
    /**
     * @notice Constructor
     * @param admin Address to grant DEFAULT_ADMIN_ROLE
     */
    constructor(address admin) {
        name = "BlacklistPolicyRBAC";
        version = "2.0.0";
        isActive = true;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BLACKLIST_MANAGER_ROLE, admin);
    }
    
    /**
     * @notice Evaluate transaction against blacklist policy
     */
    function evaluate(
        address from,
        address to,
        uint256,
        bytes calldata
    ) external view override onlyActive returns (bool, string memory, uint8) {
        if (blacklist[from]) {
            return (
                false, 
                string(abi.encodePacked("Sender blacklisted: ", _toAsciiString(from), " - ", blacklistReason[from])), 
                SEVERITY_CRITICAL
            );
        }
        if (blacklist[to]) {
            return (
                false, 
                string(abi.encodePacked("Recipient blacklisted: ", _toAsciiString(to), " - ", blacklistReason[to])), 
                SEVERITY_CRITICAL
            );
        }
        return (true, "", 0);
    }
    
    /**
     * @notice Add an address to the blacklist
     * @param addr Address to blacklist
     * @param reason Reason for blacklisting
     */
    function addToBlacklist(
        address addr, 
        string calldata reason
    ) external onlyRole(BLACKLIST_MANAGER_ROLE) {
        if (addr == address(0)) revert ZeroAddressNotAllowed();
        if (blacklist[addr]) revert AddressAlreadyBlacklisted();
        
        blacklist[addr] = true;
        blacklistReason[addr] = reason;
        blacklistIndex[addr] = blacklistedAddresses.length;
        blacklistedAddresses.push(addr);
        
        emit AddressBlacklisted(addr, reason, msg.sender);
    }
    
    /**
     * @notice Remove an address from the blacklist
     * @param addr Address to remove
     */
    function removeFromBlacklist(address addr) external onlyRole(BLACKLIST_MANAGER_ROLE) {
        if (!blacklist[addr]) revert AddressNotBlacklisted();
        
        // Swap and pop for O(1) removal
        uint256 index = blacklistIndex[addr];
        uint256 lastIndex = blacklistedAddresses.length - 1;
        
        if (index != lastIndex) {
            address lastAddr = blacklistedAddresses[lastIndex];
            blacklistedAddresses[index] = lastAddr;
            blacklistIndex[lastAddr] = index;
        }
        
        blacklistedAddresses.pop();
        delete blacklistIndex[addr];
        delete blacklist[addr];
        delete blacklistReason[addr];
        
        emit AddressRemovedFromBlacklist(addr, msg.sender);
    }
    
    /**
     * @notice Batch add addresses to blacklist
     */
    function batchAddToBlacklist(
        address[] calldata addresses, 
        string calldata reason
    ) external onlyRole(BLACKLIST_MANAGER_ROLE) {
        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            if (addr != address(0) && !blacklist[addr]) {
                blacklist[addr] = true;
                blacklistReason[addr] = reason;
                blacklistIndex[addr] = blacklistedAddresses.length;
                blacklistedAddresses.push(addr);
                emit AddressBlacklisted(addr, reason, msg.sender);
            }
        }
        emit BatchBlacklistAdded(addresses, reason);
    }
    
    /**
     * @notice Activate or deactivate the policy
     */
    function setActive(bool _active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isActive = _active;
        emit PolicyStatusChanged(_active);
    }
    
    /**
     * @notice Grant SENTINEL_ROLE to an address
     */
    function grantSentinelRole(address sentinel) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(SENTINEL_ROLE, sentinel);
        _grantRole(BLACKLIST_MANAGER_ROLE, sentinel);
    }
    
    /**
     * @notice Revoke SENTINEL_ROLE
     */
    function revokeSentinelRole(address sentinel) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(SENTINEL_ROLE, sentinel);
        _revokeRole(BLACKLIST_MANAGER_ROLE, sentinel);
    }
    
    /**
     * @notice Check if an address has SENTINEL_ROLE
     */
    function isSentinel(address addr) external view returns (bool) {
        return hasRole(SENTINEL_ROLE, addr);
    }
    
    /**
     * @notice Check if an address is blacklisted
     */
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklist[addr];
    }
    
    /**
     * @notice Get blacklist reason for an address
     */
    function getBlacklistReason(address addr) external view returns (string memory) {
        return blacklistReason[addr];
    }
    
    /**
     * @notice Get all blacklisted addresses
     */
    function getAllBlacklisted() external view returns (address[] memory) {
        return blacklistedAddresses;
    }
    
    /**
     * @notice Get blacklist count
     */
    function getBlacklistCount() external view returns (uint256) {
        return blacklistedAddresses.length;
    }
    
    /**
     * @notice Utility: Convert address to ASCII string
     */
    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19-i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = _char(hi);
            s[2*i+1] = _char(lo);
        }
        return string(s);
    }
    
    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
