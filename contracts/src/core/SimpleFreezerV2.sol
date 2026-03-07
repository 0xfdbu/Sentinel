// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleFreezerV2 {
    
    address public admin;
    address public forwarder;
    uint256 public nonce;
    
    mapping(address => bool) public isFrozen;
    mapping(bytes32 => bool) public usedReports;
    
    event AddressFrozen(address indexed target, bytes32 reportHash, string reason);
    event AddressUnfrozen(address indexed target);
    event OnReportCalled(bytes metadata, bytes report);
    event ForwarderSet(address indexed forwarder);
    
    error NotForwarder();
    error NotAdmin();
    error ReportUsed();
    error InvalidTarget();
    
    constructor(address _forwarder) {
        admin = msg.sender;
        forwarder = _forwarder;
        emit ForwarderSet(_forwarder);
    }
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    // IReceiver interface - called by Chainlink Forwarder only
    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert NotForwarder();
        emit OnReportCalled(metadata, report);
        _processFreeze(report);
    }
    
    // Direct entry point (admin only for testing)
    function writeReport(bytes calldata report) external onlyAdmin {
        _processFreeze(report);
    }
    
    function _processFreeze(bytes calldata report) internal {
        // Decode: (bytes32 reportHash, address target, string reason)
        (bytes32 reportHash, address target, string memory reason) = abi.decode(report, (bytes32, address, string));
        
        if (usedReports[reportHash]) revert ReportUsed();
        if (target == address(0)) revert InvalidTarget();
        
        usedReports[reportHash] = true;
        isFrozen[target] = true;
        nonce++;
        
        emit AddressFrozen(target, reportHash, reason);
    }
    
    function unfreeze(address target) external onlyAdmin {
        isFrozen[target] = false;
        emit AddressUnfrozen(target);
    }
    
    function setForwarder(address _forwarder) external onlyAdmin {
        forwarder = _forwarder;
        emit ForwarderSet(_forwarder);
    }
}
