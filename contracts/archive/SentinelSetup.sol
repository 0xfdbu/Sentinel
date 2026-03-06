// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SentinelSetup
 * @notice Simplified setup contract for Sentinel guardian configuration
 * @dev
 *   - Register contracts for protection
 *   - Grant guardian permissions on policies
 *   - View current setup status
 */
contract SentinelSetup is AccessControl {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Contract references
    address public registry;
    address public policyEngine;
    address public volumePolicy;
    address public blacklistPolicy;
    address public guardian; // EmergencyGuardian proxy
    
    // Setup status
    struct ContractConfig {
        address contractAddr;
        string name;
        bool isRegistered;
        bool guardianHasPermissions;
    }
    
    mapping(address => ContractConfig) public configs;
    address[] public protectedContracts;
    
    // Events
    event ContractRegistered(address indexed contractAddr, string name);
    event GuardianGranted(address indexed contractAddr, address indexed guardian);
    event SetupComplete(address indexed contractAddr);
    
    // Errors
    error AlreadyRegistered();
    error InvalidAddress();
    
    constructor(
        address _registry,
        address _policyEngine,
        address _volumePolicy,
        address _blacklistPolicy,
        address _guardian,
        address admin
    ) {
        if (
            _registry == address(0) ||
            _policyEngine == address(0) ||
            _volumePolicy == address(0) ||
            _blacklistPolicy == address(0) ||
            _guardian == address(0)
        ) revert InvalidAddress();
        
        registry = _registry;
        policyEngine = _policyEngine;
        volumePolicy = _volumePolicy;
        blacklistPolicy = _blacklistPolicy;
        guardian = _guardian;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }
    
    /**
     * @notice Register a contract and grant guardian all permissions
     * @param contractAddr The contract to protect (e.g., USDA stablecoin)
     * @param name Human-readable name
     */
    function registerAndGrant(
        address contractAddr,
        string calldata name
    ) external onlyRole(ADMIN_ROLE) {
        if (contractAddr == address(0)) revert InvalidAddress();
        if (configs[contractAddr].isRegistered) revert AlreadyRegistered();
        
        // Register in SentinelRegistry (stake ETH)
        (bool registered, ) = registry.call{value: 0.01 ether}(
            abi.encodeWithSelector(
                bytes4(keccak256("register(address,string)")),
                contractAddr,
                name
            )
        );
        
        // Store config
        configs[contractAddr] = ContractConfig({
            contractAddr: contractAddr,
            name: name,
            isRegistered: registered,
            guardianHasPermissions: false
        });
        protectedContracts.push(contractAddr);
        
        emit ContractRegistered(contractAddr, name);
        
        // Grant permissions
        _grantAllPermissions(contractAddr);
    }
    
    /**
     * @notice Grant all permissions to guardian on a contract
     */
    function _grantAllPermissions(address contractAddr) internal {
        // Grant SENTINEL_ROLE on PolicyEngine
        (bool success1, ) = policyEngine.call(
            abi.encodeWithSelector(
                bytes4(keccak256("grantRole(bytes32,address)")),
                keccak256("SENTINEL_ROLE"),
                guardian
            )
        );
        
        // Grant POLICY_MANAGER_ROLE on VolumePolicy
        (bool success2, ) = volumePolicy.call(
            abi.encodeWithSelector(
                bytes4(keccak256("grantRole(bytes32,address)")),
                keccak256("POLICY_MANAGER_ROLE"),
                guardian
            )
        );
        
        // Grant BLACKLIST_MANAGER_ROLE on BlacklistPolicy
        (bool success3, ) = blacklistPolicy.call(
            abi.encodeWithSelector(
                bytes4(keccak256("grantRole(bytes32,address)")),
                keccak256("BLACKLIST_MANAGER_ROLE"),
                guardian
            )
        );
        
        // Grant PAUSER_ROLE on the target contract (if it has one)
        (bool success4, ) = contractAddr.call(
            abi.encodeWithSelector(
                bytes4(keccak256("grantRole(bytes32,address)")),
                keccak256("PAUSER_ROLE"),
                guardian
            )
        );
        
        configs[contractAddr].guardianHasPermissions = 
            success1 || success2 || success3 || success4;
        
        emit GuardianGranted(contractAddr, guardian);
    }
    
    /**
     * @notice Check setup status for a contract
     */
    function getStatus(address contractAddr) external view returns (ContractConfig memory) {
        return configs[contractAddr];
    }
    
    /**
     * @notice Get all protected contracts
     */
    function getProtectedContracts() external view returns (address[] memory) {
        return protectedContracts;
    }
    
    /**
     * @notice Update contract addresses
     */
    function updateAddresses(
        address _registry,
        address _policyEngine,
        address _volumePolicy,
        address _blacklistPolicy,
        address _guardian
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registry = _registry;
        policyEngine = _policyEngine;
        volumePolicy = _volumePolicy;
        blacklistPolicy = _blacklistPolicy;
        guardian = _guardian;
    }
    
    receive() external payable {}
}
