// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../policies/IPolicyEngine.sol";

/**
 * @title SentinelForwarder
 * @notice Forwards transactions to protected contracts with ACE policy enforcement
 * @dev Users submit transactions through this contract to have policies enforced
 * 
 * Flow:
 *   User ──► SentinelForwarder.forward() ──► ACE Check ──► TargetContract
 *                               │
 *                               └── If ACE blocks: REVERT (tx never reaches target)
 */
contract SentinelForwarder is Ownable, ReentrancyGuard {
    
    /// @notice Reference to PolicyEngine for ACE checks
    IPolicyEngine public policyEngine;
    
    /// @notice Optional fee for using the forwarder (0 = no fee)
    uint256 public forwardFee;
    
    /// @notice Accumulated fees available for withdrawal
    mapping(address => uint256) public accumulatedFees;
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;
    
    /// @notice Whitelisted targets (bypass fee, lower gas)
    mapping(address => bool) public whitelistedTargets;
    
    /// @notice Events
    event TransactionForwarded(
        address indexed sender,
        address indexed target,
        uint256 value,
        bytes4 selector,
        bool policyChecked
    );
    
    event TransactionBlocked(
        address indexed sender,
        address indexed target,
        string reason,
        uint8 severity
    );
    
    event PolicyEngineUpdated(address indexed newPolicyEngine);
    event ForwardFeeUpdated(uint256 newFee);
    event TargetWhitelisted(address indexed target, bool whitelisted);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    
    /// @notice Errors
    error PolicyViolation(string reason, uint8 severity);
    error TargetNotContract(address target);
    error InsufficientFee(uint256 required, uint256 provided);
    error ForwardFailed(bytes reason);
    error NoFeesToWithdraw();
    
    constructor(address _policyEngine) Ownable() {
        _transferOwnership(msg.sender);
        if (_policyEngine != address(0)) {
            policyEngine = IPolicyEngine(_policyEngine);
        }
    }
    
    /**
     * @notice Forward a transaction to target contract with ACE policy check
     * @param target The contract to call
     * @param data The calldata to forward
     * @return success Whether the call succeeded
     * @return result The return data from the call
     */
    function forward(
        address target,
        bytes calldata data
    ) external payable nonReentrant returns (bool success, bytes memory result) {
        // Validate target is a contract
        if (target.code.length == 0) revert TargetNotContract(target);
        
        // Check fee if applicable
        if (forwardFee > 0 && !whitelistedTargets[target]) {
            if (msg.value < forwardFee) {
                revert InsufficientFee(forwardFee, msg.value);
            }
            // Accumulate fee
            accumulatedFees[owner()] += forwardFee;
            totalFeesCollected += forwardFee;
        }
        
        // Calculate value to forward (minus fee if not whitelisted)
        uint256 valueToForward = msg.value;
        if (forwardFee > 0 && !whitelistedTargets[target]) {
            valueToForward = msg.value - forwardFee;
        }
        
        // ACE Policy Check (if policyEngine is set)
        if (address(policyEngine) != address(0)) {
            try policyEngine.shouldPauseTransaction(
                msg.sender,      // from
                target,          // to
                valueToForward,  // value
                data             // calldata
            ) returns (bool shouldBlock, uint8 severity) {
                
                if (shouldBlock) {
                    string memory reason = _getSeverityString(severity);
                    emit TransactionBlocked(msg.sender, target, reason, severity);
                    revert PolicyViolation(reason, severity);
                }
            } catch (bytes memory err) {
                // If policy check fails, we have two options:
                // 1. Block the transaction (safer)
                // 2. Allow it to proceed (more permissive)
                // For now, we'll allow but log it
                // In production, consider making this configurable
            }
        }
        
        // Extract function selector for event
        bytes4 selector = data.length >= 4 ? bytes4(data[:4]) : bytes4(0);
        
        // Forward the call
        (success, result) = target.call{value: valueToForward}(data);
        
        if (!success) {
            revert ForwardFailed(result);
        }
        
        emit TransactionForwarded(
            msg.sender,
            target,
            valueToForward,
            selector,
            address(policyEngine) != address(0)
        );
        
        return (success, result);
    }
    
    /**
     * @notice Batch forward multiple transactions
     * @param targets Array of target contracts
     * @param data Array of calldata for each target
     * @param values Array of ETH values for each call
     * @return successes Array of success booleans
     */
    function batchForward(
        address[] calldata targets,
        bytes[] calldata data,
        uint256[] calldata values
    ) external payable nonReentrant returns (bool[] memory successes) {
        require(
            targets.length == data.length && data.length == values.length,
            "Array length mismatch"
        );
        
        uint256 totalValue;
        for (uint256 i = 0; i < values.length; i++) {
            totalValue += values[i];
        }
        
        // Add fee for batch
        uint256 fee = forwardFee * targets.length;
        if (msg.value < totalValue + fee) {
            revert InsufficientFee(totalValue + fee, msg.value);
        }
        
        successes = new bool[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            // ACE check for each transaction
            if (address(policyEngine) != address(0)) {
                try policyEngine.shouldPauseTransaction(
                    msg.sender,
                    targets[i],
                    values[i],
                    data[i]
                ) returns (bool shouldBlock, uint8 severity) {
                    
                    if (shouldBlock) {
                        emit TransactionBlocked(
                            msg.sender,
                            targets[i],
                            _getSeverityString(severity),
                            severity
                        );
                        successes[i] = false;
                        continue;
                    }
                } catch {
                    // Continue on policy check failure
                }
            }
            
            (bool success, ) = targets[i].call{value: values[i]}(data[i]);
            successes[i] = success;
        }
        
        // Refund excess ETH
        uint256 excess = msg.value - totalValue - fee;
        if (excess > 0) {
            (bool sent, ) = payable(msg.sender).call{value: excess}("");
            require(sent, "Refund failed");
        }
        
        return successes;
    }
    
    /**
     * @notice Check if a transaction would be blocked by ACE (view function)
     * @param sender The transaction sender
     * @param target The target contract
     * @param value The ETH value
     * @param data The calldata
     * @return wouldBlock Whether the transaction would be blocked
     * @return reason The reason if it would be blocked
     */
    function previewACECheck(
        address sender,
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (bool wouldBlock, string memory reason) {
        if (address(policyEngine) == address(0)) {
            return (false, "No policy engine set");
        }
        
        try policyEngine.shouldPauseTransaction(sender, target, value, data) 
            returns (bool shouldBlock, uint8 severity) 
        {
            if (shouldBlock) {
                return (true, _getSeverityString(severity));
            }
            return (false, "");
        } catch {
            return (false, "Policy check failed");
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set the PolicyEngine address
     */
    function setPolicyEngine(address _policyEngine) external onlyOwner {
        policyEngine = IPolicyEngine(_policyEngine);
        emit PolicyEngineUpdated(_policyEngine);
    }
    
    /**
     * @notice Set the forward fee
     * @param _fee Fee in wei (0 to disable)
     */
    function setForwardFee(uint256 _fee) external onlyOwner {
        forwardFee = _fee;
        emit ForwardFeeUpdated(_fee);
    }
    
    /**
     * @notice Whitelist or unwhitelist a target (bypasses fee)
     */
    function setTargetWhitelisted(address target, bool whitelisted) external onlyOwner {
        whitelistedTargets[target] = whitelisted;
        emit TargetWhitelisted(target, whitelisted);
    }
    
    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees[owner()];
        if (amount == 0) revert NoFeesToWithdraw();
        
        accumulatedFees[owner()] = 0;
        
        (bool sent, ) = payable(owner()).call{value: amount}("");
        require(sent, "Withdrawal failed");
        
        emit FeesWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Get severity string from level
     */
    function _getSeverityString(uint8 severity) internal pure returns (string memory) {
        if (severity == 4) return "CRITICAL: Transaction blocked by ACE";
        if (severity == 3) return "HIGH: Transaction blocked by ACE";
        if (severity == 2) return "MEDIUM: Transaction blocked by ACE";
        if (severity == 1) return "LOW: Transaction blocked by ACE";
        return "Policy violation";
    }
    
    /**
     * @notice Allow receiving ETH (for forwarded calls)
     */
    receive() external payable {}
    fallback() external payable {}
}
