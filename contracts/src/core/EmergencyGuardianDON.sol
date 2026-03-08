// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IPausable {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}

/**
 * @title EmergencyGuardianDON
 * @notice Emergency pause contract optimized for Chainlink CRE DON reports
 * @dev 
 *   - Receives DON-signed reports via writeReport()
 *   - No external registry checks - DON attestation IS the authorization
 *   - Requires PAUSER_ROLE on target contracts
 *   - Prevents replay attacks via report tracking
 */
contract EmergencyGuardianDON is AccessControl {
    
    bytes32 public constant PAUSE_ADMIN_ROLE = keccak256("PAUSE_ADMIN_ROLE");
    
    /// @notice Track used reports to prevent replay
    mapping(bytes32 => bool) public usedReports;
    
    /// @notice Pause record structure
    struct PauseRecord {
        address pausedContract;
        bytes32 reportHash;
        uint256 pausedAt;
        uint256 expiresAt;
        bool isActive;
        uint8 severity;
    }
    
    /// @notice Mapping from contract to pause record
    mapping(address => PauseRecord) public pauses;
    
    /// @notice List of currently active pauses
    address[] public activePauseList;
    
    /// @notice Default pause duration (24 hours)
    uint256 public defaultPauseDuration = 24 hours;
    
    /// @notice Maximum pause duration (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
    /// @notice Events
    event ContractPaused(
        address indexed contractAddress,
        bytes32 indexed reportHash,
        uint256 pausedAt,
        uint256 expiresAt,
        uint8 severity
    );
    
    event ContractUnpaused(address indexed contractAddress, uint256 unpausedAt);
    event ReportReceived(bytes32 indexed reportHash, address indexed target, uint8 severity);
    event ReportUsed(bytes32 indexed reportHash);
    event PauseDurationUpdated(uint256 newDuration);
    
    /// @notice Errors
    error ContractAlreadyPaused(address contractAddress);
    error ContractNotPaused(address contractAddress);
    error ReportAlreadyUsed(bytes32 reportHash);
    error PauseFailed(address contractAddress);
    error UnpauseFailed(address contractAddress);
    error InvalidReport();
    
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSE_ADMIN_ROLE, admin);
    }
    
    /**
     * @notice Write report - Entry point for DON-signed reports from CRE workflows
     * @dev Called by CRE via Chainlink DON with guardian attestation
     * @param report The DON-signed report (abi.encode of report params)
     * 
     * Report format (abi.encode):
     * - bytes32 reportHash: Unique hash of the report
     * - address target: Contract to pause
     * - uint8 severity: 1=HIGH, 2=CRITICAL
     * - bytes32 txHash: Related transaction hash
     * - uint256 timestamp: Report timestamp
     * - address guardian: Guardian who submitted (DON verifies this)
     */
    function writeReport(bytes calldata report) external {
        // Decode report
        (
            bytes32 reportHash,
            address target,
            uint8 severity,
            bytes32 txHash,
            uint256 timestamp,
            address guardian
        ) = abi.decode(report, (bytes32, address, uint8, bytes32, uint256, address));
        
        // Prevent replay attacks
        if (usedReports[reportHash]) {
            revert ReportAlreadyUsed(reportHash);
        }
        
        // Mark report as used
        usedReports[reportHash] = true;
        
        emit ReportReceived(reportHash, target, severity);
        
        // Only HIGH (1) and CRITICAL (2) severity trigger auto-pause
        if (severity < 1) {
            emit ReportUsed(reportHash);
            return;
        }
        
        // Execute the pause
        _executePause(target, reportHash, severity);
        
        emit ReportUsed(reportHash);
    }
    
    /**
     * @notice Execute pause on target contract
     */
    function _executePause(
        address target,
        bytes32 reportHash,
        uint8 severity
    ) internal {
        if (pauses[target].isActive) {
            revert ContractAlreadyPaused(target);
        }
        
        // Execute pause - will revert if no PAUSER_ROLE
        try IPausable(target).pause() {
            // Success
        } catch {
            revert PauseFailed(target);
        }
        
        // Record pause
        uint256 expiresAt = block.timestamp + defaultPauseDuration;
        
        pauses[target] = PauseRecord({
            pausedContract: target,
            reportHash: reportHash,
            pausedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            severity: severity
        });
        
        activePauseList.push(target);
        
        emit ContractPaused(target, reportHash, block.timestamp, expiresAt, severity);
    }
    
    /**
     * @notice Unpause a contract (admin only)
     */
    function unpause(address contractAddress) external onlyRole(PAUSE_ADMIN_ROLE) {
        PauseRecord storage record = pauses[contractAddress];
        
        if (!record.isActive) {
            revert ContractNotPaused(contractAddress);
        }
        
        // Call unpause on target
        try IPausable(contractAddress).unpause() {
            // Success
        } catch {
            revert UnpauseFailed(contractAddress);
        }
        
        // Update record
        record.isActive = false;
        
        // Remove from active list
        _removeFromActiveList(contractAddress);
        
        emit ContractUnpaused(contractAddress, block.timestamp);
    }
    
    /**
     * @notice Update default pause duration
     */
    function setDefaultPauseDuration(uint256 duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (duration > MAX_PAUSE_DURATION) {
            revert InvalidReport();
        }
        defaultPauseDuration = duration;
        emit PauseDurationUpdated(duration);
    }
    
    /**
     * @notice Check if a contract is currently paused by this guardian
     */
    function isPaused(address contractAddress) external view returns (bool) {
        return pauses[contractAddress].isActive && 
               pauses[contractAddress].expiresAt > block.timestamp;
    }
    
    /**
     * @notice Get pause details
     */
    function getPauseDetails(address contractAddress) external view returns (PauseRecord memory) {
        return pauses[contractAddress];
    }
    
    /**
     * @notice Get all active pauses
     */
    function getActivePauses() external view returns (address[] memory) {
        return activePauseList;
    }
    
    /**
     * @notice Get count of active pauses
     */
    function getActivePauseCount() external view returns (uint256) {
        return activePauseList.length;
    }
    
    /**
     * @notice Check if report has been used
     */
    function isReportUsed(bytes32 reportHash) external view returns (bool) {
        return usedReports[reportHash];
    }
    
    /**
     * @notice Remove from active list (internal)
     */
    function _removeFromActiveList(address contractAddress) internal {
        uint256 index = 0;
        bool found = false;
        
        for (uint256 i = 0; i < activePauseList.length; i++) {
            if (activePauseList[i] == contractAddress) {
                index = i;
                found = true;
                break;
            }
        }
        
        if (!found) return;
        
        uint256 lastIndex = activePauseList.length - 1;
        if (index != lastIndex) {
            activePauseList[index] = activePauseList[lastIndex];
        }
        
        activePauseList.pop();
    }
}
