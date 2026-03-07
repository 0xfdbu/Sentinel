// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleFreezer {
    
    address public admin;
    mapping(address => bool) public isFrozen;
    mapping(bytes32 => bool) public usedReports;
    
    event AddressFrozen(address indexed target, bytes32 reportHash, string reason);
    event AddressUnfrozen(address indexed target);
    event OnReportCalled(bytes metadata, bytes report);
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    // IReceiver interface - called by Chainlink Forwarder
    function onReport(bytes calldata metadata, bytes calldata report) external {
        emit OnReportCalled(metadata, report);
        _processFreeze(report);
    }
    
    // Direct entry point
    function writeReport(bytes calldata report) external {
        _processFreeze(report);
    }
    
    function _processFreeze(bytes calldata report) internal {
        // Simple decoding: (bytes32 reportHash, address target, string reason)
        (bytes32 reportHash, address target, string memory reason) = abi.decode(report, (bytes32, address, string));
        
        require(!usedReports[reportHash], "Report used");
        require(target != address(0), "Invalid target");
        
        usedReports[reportHash] = true;
        isFrozen[target] = true;
        
        emit AddressFrozen(target, reportHash, reason);
    }
    
    function unfreeze(address target) external onlyAdmin {
        isFrozen[target] = false;
        emit AddressUnfrozen(target);
    }
}
