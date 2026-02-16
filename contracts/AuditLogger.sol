// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuditLogger
 * @notice Immutable log of Sentinel scan results for transparency
 * @dev Stores hashed findings without revealing vulnerability details publicly
 * @author Sentinel Team
 * @track Chainlink Convergence Hackathon 2026
 */

contract AuditLogger is Ownable {
    
    /// @notice Severity levels
    enum Severity { 
        LOW,      // 0 - Informational
        MEDIUM,   // 1 - Warning
        HIGH,     // 2 - Significant risk
        CRITICAL  // 3 - Immediate danger
    }
    
    /// @notice Single scan record
    struct ScanRecord {
        address targetContract;
        bytes32 vulnerabilityHash; // Hashed for privacy
        Severity severity;
        uint256 timestamp;
        address scanner; // Sentinel that performed the scan
        uint256 blockNumber;
        string metadata; // Optional: scanner version, etc.
    }
    
    /// @notice All scan records
    ScanRecord[] public scans;
    
    /// @notice Scans per contract
    mapping(address => uint256[]) public contractScans;
    
    /// @notice Latest scan per contract
    mapping(address => uint256) public latestScan;
    
    /// @notice Scan count per contract
    mapping(address => uint256) public scanCount;
    
    /// @notice Total scans performed
    uint256 public totalScans;
    
    /// @notice Authorized Sentinel scanners
    mapping(address => bool) public authorizedScanners;
    
    /// @notice Events
    event ScanLogged(
        uint256 indexed scanId,
        address indexed target,
        bytes32 indexed vulnHash,
        Severity severity,
        uint256 timestamp
    );
    
    event ScannerAuthorized(address indexed scanner);
    event ScannerRevoked(address indexed scanner);
    
    /// @notice Errors
    error Unauthorized();
    error InvalidSeverity();
    error InvalidTarget();
    
    /// @notice Modifiers
    modifier onlyScanner() {
        if (!authorizedScanners[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Log a new scan result
     * @param target Contract that was scanned
     * @param vulnHash SHA256 hash of vulnerability details
     * @param severity Severity level (0-3)
     * @param metadata Optional metadata
     */
    function logScan(
        address target,
        bytes32 vulnHash,
        uint8 severity,
        string calldata metadata
    ) external onlyScanner returns (uint256) {
        if (target == address(0)) revert InvalidTarget();
        if (severity > 3) revert InvalidSeverity();
        
        uint256 scanId = scans.length;
        
        ScanRecord memory record = ScanRecord({
            targetContract: target,
            vulnerabilityHash: vulnHash,
            severity: Severity(severity),
            timestamp: block.timestamp,
            scanner: msg.sender,
            blockNumber: block.number,
            metadata: metadata
        });
        
        scans.push(record);
        contractScans[target].push(scanId);
        latestScan[target] = scanId;
        scanCount[target]++;
        totalScans++;
        
        emit ScanLogged(
            scanId,
            target,
            vulnHash,
            Severity(severity),
            block.timestamp
        );
        
        return scanId;
    }
    
    /**
     * @notice Simplified logScan (no metadata)
     */
    function logScan(
        address target,
        bytes32 vulnHash,
        uint8 severity
    ) external onlyScanner returns (uint256) {
        return logScan(target, vulnHash, severity, "");
    }
    
    /**
     * @notice Authorize a new scanner
     */
    function authorizeScanner(address scanner) external onlyOwner {
        authorizedScanners[scanner] = true;
        emit ScannerAuthorized(scanner);
    }
    
    /**
     * @notice Revoke a scanner
     */
    function revokeScanner(address scanner) external onlyOwner {
        authorizedScanners[scanner] = false;
        emit ScannerRevoked(scanner);
    }
    
    /**
     * @notice Get scan by ID
     */
    function getScan(uint256 scanId) external view returns (ScanRecord memory) {
        require(scanId < scans.length, "Invalid scan ID");
        return scans[scanId];
    }
    
    /**
     * @notice Get latest scan for a contract
     */
    function getLatestScan(address target) external view returns (ScanRecord memory) {
        uint256 scanId = latestScan[target];
        require(scanId < scans.length, "No scans for this contract");
        return scans[scanId];
    }
    
    /**
     * @notice Get all scans for a contract
     */
    function getContractScans(address target) external view returns (uint256[] memory) {
        return contractScans[target];
    }
    
    /**
     * @notice Get paginated scans for a contract
     */
    function getContractScansPaginated(
        address target,
        uint256 offset,
        uint256 limit
    ) external view returns (ScanRecord[] memory) {
        uint256[] storage scanIds = contractScans[target];
        uint256 total = scanIds.length;
        
        if (offset >= total) return new ScanRecord[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - offset;
        ScanRecord[] memory result = new ScanRecord[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = scans[scanIds[offset + i]];
        }
        
        return result;
    }
    
    /**
     * @notice Get all scans (paginated)
     */
    function getAllScans(uint256 offset, uint256 limit) external view returns (ScanRecord[] memory) {
        uint256 total = scans.length;
        
        if (offset >= total) return new ScanRecord[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        uint256 resultLength = end - offset;
        ScanRecord[] memory result = new ScanRecord[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = scans[offset + i];
        }
        
        return result;
    }
    
    /**
     * @notice Get scan statistics
     */
    function getStats() external view returns (
        uint256 total,
        uint256 criticalCount,
        uint256 highCount,
        uint256 mediumCount,
        uint256 lowCount
    ) {
        total = scans.length;
        
        for (uint256 i = 0; i < scans.length; i++) {
            if (scans[i].severity == Severity.CRITICAL) criticalCount++;
            else if (scans[i].severity == Severity.HIGH) highCount++;
            else if (scans[i].severity == Severity.MEDIUM) mediumCount++;
            else lowCount++;
        }
        
        return (total, criticalCount, highCount, mediumCount, lowCount);
    }
    
    /**
     * @notice Check if scanner is authorized
     */
    function isAuthorized(address scanner) external view returns (bool) {
        return authorizedScanners[scanner] || scanner == owner();
    }
}
