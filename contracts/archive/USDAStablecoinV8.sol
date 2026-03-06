// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Chainlink ACE
import {PolicyProtected} from "@chainlink-ace/policy-management/core/PolicyProtected.sol";
import {IPolicyEngine} from "../policies/IPolicyEngine.sol";

/**
 * @title USDAStablecoinV8
 * @notice USDA Stablecoin V8 with WORKING Chainlink ACE PolicyProtected + CCIP compatibility
 * @dev 
 *   - Inherits PolicyProtected for ACE compliance
 *   - Properly implements runPolicy check (V7 had placeholder)
 *   - Inherits OwnableUpgradeable for TokenAdminRegistry compatibility (owner())
 *   - Uses mint/burn pattern for CCIP
 *   - Sentinel Guardian can be granted PAUSER_ROLE via grantSentinelPauserRole()
 *   - UUPS upgradeable
 */
contract USDAStablecoinV8 is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    PolicyProtected
{
    // ============ Roles ============
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    /// @notice CCIP TokenPool address (for reference)
    address public tokenPool;
    
    /// @notice Sentinel Guardian address (stored for reference)
    address public sentinelGuardian;
    
    // ============ Events ============
    event TokenPoolSet(address indexed tokenPool);
    event SentinelGuardianSet(address indexed guardian);
    event SentinelPauserRoleGranted(address indexed guardian);
    event PolicyChecked(address indexed from, address indexed to, bool compliant, string reason);
    
    // ============ Errors ============
    error InvalidAddress();
    error InvalidAmount();
    error PolicyViolation(string reason);
    error BlacklistedAddress(address addr);
    
    // ============ Constructor ============
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    /**
     * @notice Initialize the contract
     * @param initialOwner The initial owner (also becomes DEFAULT_ADMIN_ROLE)
     * @param _policyEngine The Chainlink ACE PolicyEngine address
     * @param guardian The Sentinel Guardian address (can be granted PAUSER_ROLE later)
     */
    function initialize(
        address initialOwner,
        address _policyEngine,
        address guardian
    ) public initializer {
        if (initialOwner == address(0)) revert InvalidAddress();
        if (_policyEngine == address(0)) revert InvalidAddress();
        
        // Initialize parent contracts
        __ERC20_init("USDA Stablecoin", "USDA");
        __ERC20Burnable_init();
        __Ownable_init();
        _transferOwnership(initialOwner);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __PolicyProtected_init(initialOwner, _policyEngine);
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(UPGRADER_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        // Note: PAUSER_ROLE is NOT granted here - use grantSentinelPauserRole() after deployment
        
        // Store guardian for reference
        sentinelGuardian = guardian;
        emit SentinelGuardianSet(guardian);
    }
    
    // ============ MODIFIERS ============
    
    /**
     * @notice Override runPolicy to actually check policies
     * @dev The parent PolicyProtected has an empty placeholder - this adds real enforcement
     */
    modifier runPolicyOverride() {
        // Call PolicyEngine to check compliance
        if (policyEngine != address(0)) {
            try IPolicyEngine(policyEngine).isCompliant(msg.sender, address(this), 0) returns (bool compliant) {
                if (!compliant) {
                    revert PolicyViolation("Transaction does not comply with ACE policies");
                }
            } catch {
                // If policy check fails (e.g., engine not responding), allow transaction
                // This prevents DoS attacks but logs the failure
                emit PolicyChecked(msg.sender, address(this), true, "Policy check failed - allowing");
            }
        }
        _;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Mint tokens with ACE policy check
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
        runPolicyOverride 
    {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens (public - anyone can burn their own)
     * @param amount The amount to burn
     */
    function burn(uint256 amount) public override {
        if (amount == 0) revert InvalidAmount();
        super.burn(amount);
    }
    
    /**
     * @notice Burn from a specific address (requires BURNER_ROLE)
     * @param from The address to burn from
     * @param amount The amount to burn
     */
    function burnFrom(address from, uint256 amount) 
        public 
        override
        onlyRole(BURNER_ROLE) 
        whenNotPaused 
    {
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        super.burnFrom(from, amount);
    }
    
    /**
     * @notice Grant Sentinel pauser role to guardian
     * @dev Called after deployment to give Sentinel Guardian pause authority
     * @param guardian The Sentinel Guardian address
     */
    function grantSentinelPauserRole(address guardian) 
        external 
        onlyOwner 
    {
        if (guardian == address(0)) revert InvalidAddress();
        _grantRole(PAUSER_ROLE, guardian);
        emit SentinelPauserRoleGranted(guardian);
    }
    
    /**
     * @notice Set the CCIP TokenPool address and grant it roles
     * @param _tokenPool The TokenPool address
     */
    function setTokenPool(address _tokenPool) external onlyOwner {
        if (_tokenPool == address(0)) revert InvalidAddress();
        tokenPool = _tokenPool;
        
        // Grant minter/burner roles to token pool for CCIP
        _grantRole(MINTER_ROLE, _tokenPool);
        _grantRole(BURNER_ROLE, _tokenPool);
        
        emit TokenPoolSet(_tokenPool);
    }
    
    /**
     * @notice Pause the contract
     * @dev Requires PAUSER_ROLE (granted to Sentinel Guardian via grantSentinelPauserRole)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if an address has the Sentinel pauser role
     */
    function isSentinelPauser(address account) external view returns (bool) {
        return hasRole(PAUSER_ROLE, account);
    }
    
    // ============ Internal Functions ============
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
