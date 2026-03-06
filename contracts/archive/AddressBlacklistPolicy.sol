// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BasePolicy.sol";

/**
 * @title AddressBlacklistPolicy
 * @notice ACE Policy: Rejects transactions from/to blacklisted addresses
 * @dev Similar to Chainlink CRE stablecoin-ace-ccip AddressBlacklistPolicy
 */
contract AddressBlacklistPolicy is BasePolicy {
    // Blacklist mapping: address => isBlacklisted
    mapping(address => bool) public blacklist;
    
    // List of all blacklisted addresses for enumeration
    address[] public blacklistedAddresses;
    
    // Quick lookup index
    mapping(address => uint256) private blacklistIndex;
    
    // Events
    event AddressBlacklisted(address indexed addr, string reason);
    event AddressRemovedFromBlacklist(address indexed addr);
    event BatchBlacklistAdded(address[] addresses, string reason);

    // Custom errors
    error AddressAlreadyBlacklisted();
    error AddressNotBlacklisted();
    error ZeroAddressNotAllowed();
    error BlacklistedAddress(address addr);

    constructor() BasePolicy("AddressBlacklistPolicy", "1.0.0") {}

    /**
     * @notice Evaluate transaction against blacklist policy
     * @param from Transaction sender
     * @param to Transaction recipient
     */
    function evaluate(
        address from,
        address to,
        uint256,
        bytes calldata
    ) external view override onlyActive returns (bool, string memory, uint8) {
        if (blacklist[from]) {
            return (false, string(abi.encodePacked("Sender blacklisted: ", _toAsciiString(from))), 4);
        }
        if (blacklist[to]) {
            return (false, string(abi.encodePacked("Recipient blacklisted: ", _toAsciiString(to))), 4);
        }
        return (true, "", 0);
    }

    /**
     * @notice Add an address to the blacklist
     * @param addr Address to blacklist
     * @param reason Reason for blacklisting
     */
    function addToBlacklist(address addr, string calldata reason) external onlyOwner {
        if (addr == address(0)) revert ZeroAddressNotAllowed();
        if (blacklist[addr]) revert AddressAlreadyBlacklisted();

        blacklist[addr] = true;
        blacklistIndex[addr] = blacklistedAddresses.length;
        blacklistedAddresses.push(addr);

        emit AddressBlacklisted(addr, reason);
    }

    /**
     * @notice Remove an address from the blacklist
     * @param addr Address to remove
     */
    function removeFromBlacklist(address addr) external onlyOwner {
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

        emit AddressRemovedFromBlacklist(addr);
    }

    /**
     * @notice Batch add addresses to blacklist
     * @param addresses Array of addresses to blacklist
     * @param reason Common reason for all addresses
     */
    function batchAddToBlacklist(address[] calldata addresses, string calldata reason) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            if (addr != address(0) && !blacklist[addr]) {
                blacklist[addr] = true;
                blacklistIndex[addr] = blacklistedAddresses.length;
                blacklistedAddresses.push(addr);
            }
        }
        emit BatchBlacklistAdded(addresses, reason);
    }

    /**
     * @notice Check if an address is blacklisted
     */
    function isBlacklisted(address addr) external view returns (bool) {
        return blacklist[addr];
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
     * @notice Convert address to ASCII string for error messages
     */
    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = '0';
        s[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i + 2] = _char(hi);
            s[2*i + 3] = _char(lo);
        }
        return string(s);
    }

    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
