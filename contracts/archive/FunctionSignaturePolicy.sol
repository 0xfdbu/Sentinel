// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BasePolicy.sol";

/**
 * @title FunctionSignaturePolicy
 * @notice ACE Policy: Detects suspicious function calls
 * @dev Monitors for high-risk function signatures that could indicate attacks
 */
contract FunctionSignaturePolicy is BasePolicy {
    
    // Function signature => risk level (0=safe, 1=low, 2=medium, 3=high, 4=critical)
    mapping(bytes4 => uint8) public signatureRisk;
    
    // Suspicious function signatures with names
    mapping(bytes4 => string) public signatureNames;
    
    // All registered signatures for enumeration
    bytes4[] public registeredSignatures;
    
    // Events
    event SignatureAdded(bytes4 indexed sig, string name, uint8 risk);
    event SignatureRemoved(bytes4 indexed sig);
    event SignatureRiskUpdated(bytes4 indexed sig, uint8 newRisk);

    // Severity constants
    uint8 constant SEVERITY_OK = 0;
    uint8 constant SEVERITY_LOW = 1;
    uint8 constant SEVERITY_MEDIUM = 2;
    uint8 constant SEVERITY_HIGH = 3;
    uint8 constant SEVERITY_CRITICAL = 4;

    constructor() BasePolicy("FunctionSignaturePolicy", "1.0.0") {
        // Add default high-risk signatures
        _addSignature(hex"8da5cb5b", "owner()", SEVERITY_LOW);           // Ownership check
        _addSignature(hex"f2fde38b", "transferOwnership()", SEVERITY_HIGH); // Ownership transfer
        _addSignature(hex"3659cfe6", "upgradeTo()", SEVERITY_CRITICAL);   // Proxy upgrade
        _addSignature(hex"4f1ef286", "upgradeToAndCall()", SEVERITY_CRITICAL); // Proxy upgrade with call
        _addSignature(hex"3f4ba83a", "unpause()", SEVERITY_MEDIUM);       // Unpause (suspicious if during attack)
        _addSignature(hex"8456cb59", "pause()", SEVERITY_LOW);            // Pause
        _addSignature(hex"a9059cbb", "transfer()", SEVERITY_LOW);         // ERC20 transfer
        _addSignature(hex"23b872dd", "transferFrom()", SEVERITY_MEDIUM);  // ERC20 transferFrom
        _addSignature(hex"2e1a7d4d", "withdraw()", SEVERITY_MEDIUM);      // Withdrawal
        _addSignature(hex"d0e30db0", "deposit()", SEVERITY_LOW);          // Deposit
    }

    /**
     * @notice Evaluate transaction against function signature policy
     * @param from Transaction sender
     * @param to Transaction recipient
     * @param value Transaction value
     * @param data Transaction calldata
     */
    function evaluate(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external view override onlyActive returns (bool, string memory, uint8) {
        // Empty data is fine (simple transfer)
        if (data.length < 4) {
            return (true, "", SEVERITY_OK);
        }

        // Extract function selector (first 4 bytes)
        bytes4 selector = bytes4(data[:4]);
        uint8 risk = signatureRisk[selector];

        if (risk > SEVERITY_OK) {
            string memory sigName = signatureNames[selector];
            if (bytes(sigName).length == 0) {
                sigName = "Unknown function";
            }

            return (
                risk < SEVERITY_HIGH, // Allow LOW and MEDIUM, block HIGH and CRITICAL
                string(abi.encodePacked("Suspicious function: ", sigName)),
                risk
            );
        }

        return (true, "", SEVERITY_OK);
    }

    /**
     * @notice Add a function signature to monitor
     * @param sig 4-byte function selector
     * @param name Human-readable name
     * @param risk Risk level (0-4)
     */
    function addSignature(bytes4 sig, string calldata name, uint8 risk) external onlyOwner {
        require(risk <= SEVERITY_CRITICAL, "Invalid risk level");
        _addSignature(sig, name, risk);
    }

    /**
     * @notice Remove a function signature from monitoring
     */
    function removeSignature(bytes4 sig) external onlyOwner {
        require(signatureRisk[sig] > 0, "Signature not registered");
        
        delete signatureRisk[sig];
        delete signatureNames[sig];
        
        // Remove from array (swap and pop)
        for (uint256 i = 0; i < registeredSignatures.length; i++) {
            if (registeredSignatures[i] == sig) {
                uint256 lastIndex = registeredSignatures.length - 1;
                if (i != lastIndex) {
                    registeredSignatures[i] = registeredSignatures[lastIndex];
                }
                registeredSignatures.pop();
                break;
            }
        }
        
        emit SignatureRemoved(sig);
    }

    /**
     * @notice Update risk level for a signature
     */
    function setSignatureRisk(bytes4 sig, uint8 newRisk) external onlyOwner {
        require(signatureRisk[sig] > 0, "Signature not registered");
        require(newRisk <= SEVERITY_CRITICAL, "Invalid risk level");
        
        signatureRisk[sig] = newRisk;
        emit SignatureRiskUpdated(sig, newRisk);
    }

    /**
     * @notice Get all registered signatures
     */
    function getAllSignatures() external view returns (bytes4[] memory) {
        return registeredSignatures;
    }

    /**
     * @notice Get signature count
     */
    function getSignatureCount() external view returns (uint256) {
        return registeredSignatures.length;
    }

    /**
     * @notice Get risk level for a function selector
     */
    function getSignatureRisk(bytes4 sig) external view returns (uint8) {
        return signatureRisk[sig];
    }

    /**
     * @notice Internal function to add signature
     */
    function _addSignature(bytes4 sig, string memory name, uint8 risk) internal {
        if (signatureRisk[sig] == 0) {
            registeredSignatures.push(sig);
        }
        signatureRisk[sig] = risk;
        signatureNames[sig] = name;
        emit SignatureAdded(sig, name, risk);
    }
}
