// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ACECompliant.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ACECompliantVault
 * @notice Example vault demonstrating ACE compliance
 * @dev Shows how to build ACE-compliant contracts with optional compliance
 * 
 * Features:
 * - Guardian-only mode: Just hack protection (pause) via Pausable
 * - ACE+Guardian mode: Compliance rules + hack protection
 * - Opt-in per function: Choose which functions need ACE
 */
contract ACECompliantVault is ACECompliant, ReentrancyGuard {
    
    /// @notice User balances
    mapping(address => uint256) public balances;
    
    /// @notice Total ETH deposited
    uint256 public totalDeposits;
    
    /// @notice Whether this vault is paused (Guardian)
    bool public paused;
    
    /// @notice Guardian can pause
    modifier whenNotPaused() {
        require(!paused, "GUARDIAN: Contract paused");
        _;
    }
    
    modifier onlyGuardian() {
        require(msg.sender == guardian, "Only guardian");
        _;
    }
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event GuardianPaused(address indexed guardian);
    event GuardianUnpaused(address indexed guardian);
    
    constructor(
        address _policyEngine,
        address _guardian
    ) ACECompliant(_policyEngine, _guardian) {}
    
    // ═════════════════════════════════════════════════════════════
    // USER FUNCTIONS
    // ═════════════════════════════════════════════════════════════
    
    /**
     * @notice Deposit ETH with ACE compliance check
     * @dev This function requires ACE validation to pass
     * 
     * If ACE is enabled: validates against policies (volume limits, etc)
     * If ACE is disabled: works normally (Guardian-only mode)
     */
    function deposit() 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
        requireACECompliant 
    {
        require(msg.value > 0, "Must deposit ETH");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposited(msg.sender, msg.value);
        emit ACEPass(msg.sender, msg.sig);
    }
    
    /**
     * @notice Deposit without ACE check (if user opts out)
     * @dev Owner can disable ACE and users use this, or just use deposit()
     */
    function depositNoACE() 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        require(msg.value > 0, "Must deposit ETH");
        require(!aceEnforcementEnabled, "Use deposit() for ACE");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw ETH with ACE compliance check
     * @dev ACE can enforce withdrawal limits, velocity checks, etc
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        requireACECompliant 
    {
        require(amount > 0, "Invalid amount");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
        emit ACEPass(msg.sender, msg.sig);
    }
    
    /**
     * @notice Withdraw without ACE check
     * @dev Available when ACE is disabled
     */
    function withdrawNoACE(uint256 amount) 
        external 
        nonReentrant 
    {
        require(!aceEnforcementEnabled, "Use withdraw() for ACE");
        require(amount > 0, "Invalid amount");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // ═════════════════════════════════════════════════════════════
    // GUARDIAN / SECURITY LAYER
    // ═════════════════════════════════════════════════════════════
    
    /**
     * @notice Guardian pauses the contract (emergency hack protection)
     * @dev Works even if ACE is disabled - separate security layer
     */
    function guardianPause() external onlyGuardian {
        paused = true;
        emit GuardianPaused(msg.sender);
    }
    
    /**
     * @notice Guardian unpauses the contract
     */
    function guardianUnpause() external onlyGuardian {
        paused = false;
        emit GuardianUnpaused(msg.sender);
    }
    
    // ═════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═════════════════════════════════════════════════════════════
    
    /**
     * @notice Check ACE status for this contract
     */
    function getACEStatus() external view returns (
        bool aceEnabled,
        address policyEngineAddr,
        bool hasGuardian,
        bool isPaused
    ) {
        return (
            aceEnforcementEnabled,
            address(policyEngine),
            guardian != address(0),
            paused
        );
    }
    
    /**
     * @notice Preview if a transaction would pass ACE
     * @dev For UI to show warnings before user submits
     */
    function previewACECompliance(
        address caller,
        bytes4 selector,
        uint256 value
    ) external returns (bool wouldPass, string memory reason) {
        if (!aceEnforcementEnabled) {
            return (true, "ACE disabled");
        }
        
        // Build the call data
        bytes memory data = abi.encodeWithSelector(selector);
        
        // Check against PolicyEngine (static call simulation)
        try policyEngine.evaluateFromContract(caller, address(this), value, data) 
            returns (bool shouldBlock, string memory blockReason) 
        {
            return (!shouldBlock, shouldBlock ? blockReason : "Would pass");
        } catch {
            return (false, "ACE evaluation failed");
        }
    }
    
    receive() external payable {
        // Accept ETH directly
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
    }
}
