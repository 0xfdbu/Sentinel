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
 * @title USDAStablecoinV10
 * @notice USDA Stablecoin V10 with FREEZE functionality + Chainlink ACE + CCIP
 * @dev 
 *   - V9 features: PolicyProtected, PAUSER_ROLE, MINTER_ROLE, BURNER_ROLE
 *   - NEW: FREEZE functionality - freeze specific addresses' funds
 *   - Frozen addresses cannot transfer, but can still receive (for seizure)
 *   - Sentinel Guardian can FREEZE addresses via FREEZER_ROLE
 */
contract USDAStablecoinV10 is 
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
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE"); // NEW: Can freeze addresses
    
    // ============ State Variables ============
    /// @notice CCIP TokenPool address (for reference)
    address public tokenPool;
    
    /// @notice Sentinel Guardian address (stored for reference)
    address public sentinelGuardian;
    
    // NEW: Freeze functionality
    mapping(address => bool) public frozen;
    address[] public frozenAddresses;
    mapping(address => uint256) private frozenIndex;
    
    // ============ Events ============
    event TokenPoolSet(address indexed tokenPool);
    event SentinelGuardianSet(address indexed guardian);
    event SentinelPauserRoleGranted(address indexed guardian);
    event PolicyChecked(address indexed from, address indexed to, bool compliant, string reason);
    
    // NEW: Freeze events
    event AddressFrozen(address indexed addr, string reason, address indexed by);
    event AddressUnfrozen(address indexed addr, address indexed by);
    event FundsFrozen(address indexed addr, uint256 amount, string reason);
    
    // ============ Errors ============
    error InvalidAddress();
    error InvalidAmount();
    error PolicyViolation(string reason);
    error AddressFrozenError(address addr);
    error NotFrozen(address addr);
    error AlreadyFrozen(address addr);
    
    // ============ Constructor ============
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    /**
     * @notice Initialize the contract
     * @param initialOwner The initial owner (also becomes DEFAULT_ADMIN_ROLE)
     * @param _policyEngine The Chainlink ACE PolicyEngine address
     * @param guardian The Sentinel Guardian address
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
        // Note: PAUSER_ROLE and FREEZER_ROLE granted via separate functions
        
        // Store guardian for reference
        sentinelGuardian = guardian;
        emit SentinelGuardianSet(guardian);
    }
    
    // ============ MODIFIERS ============
    
    /**
     * @notice Override runPolicy to check policies
     */
    modifier runPolicyOverride() {
        if (policyEngine != address(0)) {
            try IPolicyEngine(policyEngine).isCompliant(msg.sender, address(this), 0) returns (bool compliant) {
                if (!compliant) {
                    revert PolicyViolation("Transaction does not comply with ACE policies");
                }
            } catch {
                emit PolicyChecked(msg.sender, address(this), true, "Policy check failed - allowing");
            }
        }
        _;
    }
    
    /**
     * @notice Check if address is not frozen
     */
    modifier notFrozen(address addr) {
        if (frozen[addr]) revert AddressFrozenError(addr);
        _;
    }
    
    // ============ Transfer Overrides (Freeze Enforcement) ============
    
    /**
     * @notice Override _beforeTokenTransfer to enforce freeze
     * @dev Frozen addresses cannot send tokens, but can receive
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
        
        // Frozen addresses cannot SEND tokens
        if (from != address(0) && frozen[from]) {
            revert AddressFrozenError(from);
        }
    }
    
    /**
     * @notice Check if an address is frozen
     */
    function isFrozen(address addr) external view returns (bool) {
        return frozen[addr];
    }
    
    /**
     * @notice Get all frozen addresses
     */
    function getFrozenAddresses() external view returns (address[] memory) {
        return frozenAddresses;
    }
    
    /**
     * @notice Get frozen count
     */
    function getFrozenCount() external view returns (uint256) {
        return frozenAddresses.length;
    }
    
    // ============ Freeze Functions (FREEZER_ROLE) ============
    
    /**
     * @notice Freeze an address - prevents them from sending tokens
     * @param addr Address to freeze
     * @param reason Reason for freezing
     */
    function freeze(address addr, string calldata reason) external onlyRole(FREEZER_ROLE) {
        if (addr == address(0)) revert InvalidAddress();
        if (frozen[addr]) revert AlreadyFrozen(addr);
        
        frozen[addr] = true;
        frozenIndex[addr] = frozenAddresses.length;
        frozenAddresses.push(addr);
        
        emit AddressFrozen(addr, reason, msg.sender);
        
        // Also emit freeze amount event
        uint256 balance = balanceOf(addr);
        if (balance > 0) {
            emit FundsFrozen(addr, balance, reason);
        }
    }
    
    /**
     * @notice Unfreeze an address
     * @param addr Address to unfreeze
     */
    function unfreeze(address addr) external onlyRole(FREEZER_ROLE) {
        if (!frozen[addr]) revert NotFrozen(addr);
        
        // Swap and pop for gas efficiency
        uint256 index = frozenIndex[addr];
        uint256 lastIndex = frozenAddresses.length - 1;
        
        if (index != lastIndex) {
            address lastAddr = frozenAddresses[lastIndex];
            frozenAddresses[index] = lastAddr;
            frozenIndex[lastAddr] = index;
        }
        
        frozenAddresses.pop();
        delete frozenIndex[addr];
        delete frozen[addr];
        
        emit AddressUnfrozen(addr, msg.sender);
    }
    
    /**
     * @notice Batch freeze multiple addresses
     * @param addrs Addresses to freeze
     * @param reason Common reason
     */
    function batchFreeze(address[] calldata addrs, string calldata reason) external onlyRole(FREEZER_ROLE) {
        for (uint256 i = 0; i < addrs.length; i++) {
            address addr = addrs[i];
            if (addr != address(0) && !frozen[addr]) {
                frozen[addr] = true;
                frozenIndex[addr] = frozenAddresses.length;
                frozenAddresses.push(addr);
                emit AddressFrozen(addr, reason, msg.sender);
            }
        }
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Mint tokens with ACE policy check
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
     */
    function burn(uint256 amount) public override notFrozen(msg.sender) {
        if (amount == 0) revert InvalidAmount();
        super.burn(amount);
    }
    
    /**
     * @notice Burn from a specific address (requires BURNER_ROLE)
     */
    function burnFrom(address from, uint256 amount) 
        public 
        override
        onlyRole(BURNER_ROLE) 
        whenNotPaused 
        notFrozen(from)
    {
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        super.burnFrom(from, amount);
    }
    
    /**
     * @notice Transfer tokens (override to enforce freeze)
     */
    function transfer(address to, uint256 amount) 
        public 
        virtual 
        override 
        notFrozen(msg.sender) 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @notice Transfer from (override to enforce freeze)
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        virtual 
        override 
        notFrozen(from) 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    // ============ Guardian Setup Functions ============
    
    /**
     * @notice Grant Sentinel pauser role to guardian
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
     * @notice Grant Sentinel freezer role to guardian
     * @dev NEW: Allows Guardian to freeze/unfreeze addresses
     */
    function grantSentinelFreezerRole(address guardian)
        external
        onlyOwner
    {
        if (guardian == address(0)) revert InvalidAddress();
        _grantRole(FREEZER_ROLE, guardian);
    }
    
    /**
     * @notice Set the CCIP TokenPool address and grant it roles
     */
    function setTokenPool(address _tokenPool) external onlyOwner {
        if (_tokenPool == address(0)) revert InvalidAddress();
        tokenPool = _tokenPool;
        
        _grantRole(MINTER_ROLE, _tokenPool);
        _grantRole(BURNER_ROLE, _tokenPool);
        
        emit TokenPoolSet(_tokenPool);
    }
    
    /**
     * @notice Pause the contract
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
    
    /**
     * @notice Check if an address has the Sentinel freezer role
     */
    function isSentinelFreezer(address account) external view returns (bool) {
        return hasRole(FREEZER_ROLE, account);
    }
    
    // ============ Internal Functions ============
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
