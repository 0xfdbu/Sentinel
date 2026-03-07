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

interface IUSDAFreezer {
    function isFrozen(address user) external view returns (bool);
}

/**
 * @title USDAStablecoinV8
 * @notice USDA Stablecoin V8 with Chainlink ACE + Individual Address Freezing
 * @dev 
 *   - Inherits PolicyProtected for ACE compliance
 *   - Inherits OwnableUpgradeable for TokenAdminRegistry compatibility
 *   - Adds individual address freezing via USDAFreezer
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
    
    /// @notice USDA Freezer contract address (NEW in V8)
    address public freezer;
    
    // ============ Events ============
    event TokenPoolSet(address indexed tokenPool);
    event SentinelGuardianSet(address indexed guardian);
    event FreezerSet(address indexed freezer);
    event SentinelPauserRoleGranted(address indexed guardian);
    event AddressBlockedByFreezer(address indexed from, address indexed to);
    
    // ============ Errors ============
    error InvalidAddress();
    error InvalidAmount();
    error AddressFrozen(address user);
    
    // ============ Constructor ============
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    /**
     * @notice Initialize the contract
     * @param initialOwner The initial owner (also becomes DEFAULT_ADMIN_ROLE)
     * @param policyEngine The Chainlink ACE PolicyEngine address
     * @param guardian The Sentinel Guardian address (can be granted PAUSER_ROLE later)
     * @param _freezer The USDA Freezer address (NEW in V8)
     */
    function initialize(
        address initialOwner,
        address policyEngine,
        address guardian,
        address _freezer
    ) public initializer {
        if (initialOwner == address(0)) revert InvalidAddress();
        if (policyEngine == address(0)) revert InvalidAddress();
        
        // Initialize parent contracts
        __ERC20_init("USDA Stablecoin", "USDA");
        __ERC20Burnable_init();
        __Ownable_init();
        _transferOwnership(initialOwner);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __PolicyProtected_init(initialOwner, policyEngine);
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(UPGRADER_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        // Note: PAUSER_ROLE is NOT granted here - use grantSentinelPauserRole() after deployment
        
        // Store guardian for reference
        sentinelGuardian = guardian;
        emit SentinelGuardianSet(guardian);
        
        // Set freezer (NEW in V8)
        freezer = _freezer;
        emit FreezerSet(_freezer);
    }
    
    // ============ Freezer Integration (NEW in V8) ============
    
    /**
     * @notice Modifier to check if address is frozen
     */
    modifier notFrozen(address user) {
        if (freezer != address(0) && IUSDAFreezer(freezer).isFrozen(user)) {
            revert AddressFrozen(user);
        }
        _;
    }
    
    /**
     * @notice Override transfer to check freezer
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        notFrozen(msg.sender) 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @notice Override transferFrom to check freezer
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        notFrozen(from) 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @notice Check if an address is frozen
     * @param user Address to check
     */
    function isFrozen(address user) external view returns (bool) {
        if (freezer == address(0)) return false;
        return IUSDAFreezer(freezer).isFrozen(user);
    }
    
    /**
     * @notice Set the freezer contract address (admin only)
     * @param _freezer New freezer address
     */
    function setFreezer(address _freezer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_freezer == address(0)) revert InvalidAddress();
        freezer = _freezer;
        emit FreezerSet(_freezer);
    }
    
    // ============ V7 Functions ============
    
    /**
     * @notice Mint tokens with ACE policy check
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
        runPolicy 
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
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (guardian == address(0)) revert InvalidAddress();
        
        _grantRole(PAUSER_ROLE, guardian);
        sentinelGuardian = guardian;
        
        emit SentinelPauserRoleGranted(guardian);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function setTokenPool(address _tokenPool) external onlyOwner {
        if (_tokenPool == address(0)) revert InvalidAddress();
        tokenPool = _tokenPool;
        emit TokenPoolSet(_tokenPool);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    // ============ UUPS Upgrade Authorization ============
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
