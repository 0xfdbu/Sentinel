// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/core/SentinelRegistryV3.sol";
import "../src/core/EmergencyGuardianV2.sol";
import "../src/policies/VolumePolicyDON.sol";
import "../src/policies/BlacklistPolicyDON.sol";
import "../src/tokens/USDAStablecoinV7.sol";
import "../src/proxy/GuardianProxy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock LINK token for testing
contract MockLINK is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    string public name = "Chainlink Token";
    string public symbol = "LINK";
    uint8 public decimals = 18;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

contract GuardianPoliciesTest is Test {
    // Contracts
    SentinelRegistryV3 public registry;
    EmergencyGuardianV2 public guardian;
    VolumePolicyDON public volumePolicy;
    BlacklistPolicyDON public blacklistPolicy;
    USDAStablecoinV7 public usda;
    MockLINK public linkToken;

    // Roles
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant DON_SIGNER_ROLE = keccak256("DON_SIGNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    // Test addresses
    address public admin = address(1);
    address public guardianAddr = address(2);
    address public user = address(3);
    address public attacker = address(4);
    address public treasury = address(5);

    // Events to test
    event LimitsUpdated(uint256 minValue, uint256 maxValue, string reason, bytes32 reportHash);
    event AddressBlacklisted(address indexed addr, string reason, bytes32 reportHash);
    event ContractPaused(address indexed contractAddress, bytes32 indexed reportHash, address indexed guardian, uint256 pausedAt, uint256 expiresAt, uint8 severity);

    function setUp() public {
        vm.startPrank(admin);

        // Deploy mock LINK
        linkToken = new MockLINK();

        // Deploy Registry
        registry = new SentinelRegistryV3(
            address(linkToken),
            treasury,
            admin
        );

        // Deploy Guardian implementation
        EmergencyGuardianV2 guardianImpl = new EmergencyGuardianV2();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            EmergencyGuardianV2.initialize.selector,
            address(registry),
            admin
        );
        
        GuardianProxy proxy = new GuardianProxy(address(guardianImpl), initData);
        guardian = EmergencyGuardianV2(address(proxy));

        // Deploy Policies
        volumePolicy = new VolumePolicyDON(
            admin,
            0.001 ether,  // min
            100 ether,    // max
            1000 ether    // daily limit
        );

        blacklistPolicy = new BlacklistPolicyDON(admin);

        // Deploy USDA implementation
        USDAStablecoinV7 usdaImpl = new USDAStablecoinV7();
        
        // Deploy USDA proxy
        bytes memory usdaInitData = abi.encodeWithSelector(
            USDAStablecoinV7.initialize.selector,
            admin,
            address(blacklistPolicy),  // policyEngine
            address(guardian)
        );
        
        GuardianProxy usdaProxy = new GuardianProxy(address(usdaImpl), usdaInitData);
        usda = USDAStablecoinV7(address(usdaProxy));

        // Grant guardian roles on policies (both the contract and the guardian address)
        // The guardian CONTRACT calls writeReport()
        volumePolicy.grantRole(DON_SIGNER_ROLE, address(guardian));
        blacklistPolicy.grantRole(DON_SIGNER_ROLE, address(guardian));
        
        // The guardian ADDRESS calls policy functions directly
        volumePolicy.grantRole(SENTINEL_ROLE, guardianAddr);
        volumePolicy.grantRole(keccak256("POLICY_MANAGER_ROLE"), guardianAddr);
        blacklistPolicy.grantRole(SENTINEL_ROLE, guardianAddr);
        blacklistPolicy.grantRole(keccak256("BLACKLIST_MANAGER_ROLE"), guardianAddr);

        // Grant guardian PAUSER_ROLE on USDA
        usda.grantRole(PAUSER_ROLE, address(guardian));
        usda.grantRole(PAUSER_ROLE, guardianAddr);  // Also allow guardianAddr to pause directly

        // Set emergency guardian in registry
        registry.setEmergencyGuardian(address(guardian));

        // Mint LINK to test users
        linkToken.mint(guardianAddr, 100 ether);
        linkToken.mint(user, 100 ether);

        vm.stopPrank();
    }

    // ==================== GUARDIAN REGISTRATION TESTS ====================

    function test_GuardianRegistration() public {
        vm.startPrank(guardianAddr);

        // Approve LINK (5 LINK = 5e18)
        linkToken.approve(address(registry), 5e18);

        // Register as guardian
        registry.registerGuardian("Test Guardian Node");

        // Check registration
        assertTrue(registry.isActiveGuardian(guardianAddr), "Should be active guardian");
        
        // Check stake (struct: status, stakedAmount, registeredAt, ...)
        (, uint256 staked,,,,,,,) = registry.guardians(guardianAddr);
        assertEq(staked, 5e18, "Should have staked 5 LINK");

        // Check roles
        assertTrue(registry.hasRole(SENTINEL_ROLE, guardianAddr), "Should have SENTINEL_ROLE");
        assertTrue(registry.hasRole(GUARDIAN_ROLE, guardianAddr), "Should have GUARDIAN_ROLE");

        vm.stopPrank();
    }

    function test_CannotRegisterWithoutStake() public {
        vm.startPrank(user);

        // Try to register without approving LINK (approve 0 first)
        linkToken.approve(address(registry), 0);
        
        // This should revert because transferFrom will fail
        vm.expectRevert();
        registry.registerGuardian("Test Guardian Node");

        vm.stopPrank();
    }

    function test_CannotRegisterTwice() public {
        vm.startPrank(guardianAddr);

        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian Node");

        // Try to register again
        vm.expectRevert(SentinelRegistryV3.GuardianAlreadyRegistered.selector);
        registry.registerGuardian("Test Guardian Node 2");

        vm.stopPrank();
    }

    function test_DeregisterGuardian() public {
        vm.startPrank(guardianAddr);

        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian Node");

        uint256 balanceBefore = linkToken.balanceOf(guardianAddr);

        // Deregister
        registry.deregisterGuardian();

        // Check stake returned
        uint256 balanceAfter = linkToken.balanceOf(guardianAddr);
        assertEq(balanceAfter - balanceBefore, 5e18, "Should get stake back");

        // Check no longer guardian
        assertFalse(registry.isActiveGuardian(guardianAddr), "Should not be active guardian");

        vm.stopPrank();
    }

    // ==================== POLICY MANAGEMENT TESTS ====================

    function test_GuardianCanUpdateVolumeLimits() public {
        // Setup: Register guardian
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        // Guardian calls policy directly (role-based)
        vm.prank(guardianAddr);
        volumePolicy.setLimits(0.01 ether, 50 ether, "Emergency adjustment");

        // Check limits updated
        assertEq(volumePolicy.minValue(), 0.01 ether, "Min should be updated");
        assertEq(volumePolicy.maxValue(), 50 ether, "Max should be updated");
    }

    function test_GuardianCanBlacklistAddress() public {
        // Setup: Register guardian
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        address badActor = address(0xbad);

        // Guardian blacklists address
        vm.prank(guardianAddr);
        blacklistPolicy.addToBlacklist(badActor, "Suspicious activity");

        // Check blacklisted
        assertTrue(blacklistPolicy.isBlacklisted(badActor), "Should be blacklisted");
    }

    function test_NonGuardianCannotUpdatePolicies() public {
        vm.startPrank(attacker);

        // Try to update volume limits
        vm.expectRevert();
        volumePolicy.setLimits(0, 1000 ether, "Attack");

        // Try to blacklist
        vm.expectRevert();
        blacklistPolicy.addToBlacklist(user, "Just because");

        vm.stopPrank();
    }

    // ==================== POLICY ENFORCEMENT TESTS ====================

    function test_VolumePolicyEnforcesLimits() public {
        // Test within limits - should pass
        (bool success1,,) = volumePolicy.evaluate(user, address(1), 10 ether, "");
        assertTrue(success1, "10 ether should be within limits");

        // Test below min - should fail
        (bool success2, string memory reason2,) = volumePolicy.evaluate(user, address(1), 0.0001 ether, "");
        assertFalse(success2, "Below min should fail");
        assertTrue(bytes(reason2).length > 0, "Should have failure reason");

        // Test above max - should fail
        (bool success3, string memory reason3,) = volumePolicy.evaluate(user, address(1), 200 ether, "");
        assertFalse(success3, "Above max should fail");
        assertTrue(bytes(reason3).length > 0, "Should have failure reason");
    }

    function test_BlacklistPolicyEnforcesBlacklist() public {
        address badActor = address(0xbad);

        // Setup: Add to blacklist
        vm.prank(admin);
        blacklistPolicy.addToBlacklist(badActor, "Fraud");

        // Test blacklisted sender - should fail
        (bool success1, string memory reason1,) = blacklistPolicy.evaluate(badActor, user, 1 ether, "");
        assertFalse(success1, "Blacklisted sender should fail");
        assertTrue(bytes(reason1).length > 0, "Should have failure reason");

        // Test blacklisted recipient - should fail
        (bool success2, string memory reason2,) = blacklistPolicy.evaluate(user, badActor, 1 ether, "");
        assertFalse(success2, "Blacklisted recipient should fail");
        assertTrue(bytes(reason2).length > 0, "Should have failure reason");

        // Test normal address - should pass
        (bool success3,,) = blacklistPolicy.evaluate(user, address(1), 1 ether, "");
        assertTrue(success3, "Normal address should pass");
    }

    // ==================== EMERGENCY GUARDIAN TESTS ====================

    function test_GuardianCanPauseContract() public {
        // Setup: Register guardian and fund with LINK
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        // Create report for pause
        bytes32 reportHash = keccak256(abi.encodePacked("report1"));
        bytes memory report = abi.encode(
            reportHash,
            address(usda),    // target
            uint8(2),         // severity CRITICAL
            bytes32(0),       // txHash
            block.timestamp,  // timestamp
            guardianAddr,     // guardian
            uint256(0)        // nonce
        );

        // Guardian submits report to pause
        vm.prank(guardianAddr);
        guardian.writeReport(report);

        // Check contract paused
        assertTrue(usda.paused(), "USDA should be paused");
    }

    function test_GuardianCanPauseContractAndAdminCanUnpause() public {
        // Setup: Register guardian, pause contract
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        // Pause first (via guardian contract)
        bytes32 reportHash = keccak256(abi.encodePacked("report1"));
        bytes memory report = abi.encode(
            reportHash,
            address(usda),
            uint8(2),
            bytes32(0),
            block.timestamp,
            guardianAddr,
            uint256(0)
        );
        vm.prank(guardianAddr);
        guardian.writeReport(report);
        assertTrue(usda.paused(), "Should be paused");

        // Note: USDA.unpause() requires owner (admin), not PAUSER_ROLE
        // For now, admin unpause directly on USDA (not through guardian)
        // This is a limitation - ideally guardian should be able to unpause too
        vm.prank(admin);
        usda.unpause();

        assertFalse(usda.paused(), "Should be unpaused");
    }

    function test_OnlyRegisteredGuardianCanPause() public {
        // Try to pause with unregistered guardian address
        bytes32 reportHash = keccak256(abi.encodePacked("report1"));
        bytes memory report = abi.encode(
            reportHash,
            address(usda),
            uint8(2),
            bytes32(0),
            block.timestamp,
            attacker,  // attacker as guardian (not registered)
            uint256(0)
        );

        vm.prank(attacker);
        // This will revert with GuardianNotActive because attacker is not registered
        vm.expectRevert();
        guardian.writeReport(report);
    }

    function test_ReportReplayPrevention() public {
        // Setup: Register guardian
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        bytes32 reportHash = keccak256(abi.encodePacked("report1"));
        bytes memory report = abi.encode(
            reportHash,
            address(usda),
            uint8(2),
            bytes32(0),
            block.timestamp,
            guardianAddr,
            uint256(0)
        );

        // First use - success
        vm.prank(guardianAddr);
        guardian.writeReport(report);

        // Try to replay - should fail with ReportAlreadyUsed
        vm.prank(guardianAddr);
        vm.expectRevert(); // ReportAlreadyUsed with reportHash parameter
        guardian.writeReport(report);
    }

    // ==================== REPUTATION TESTS ====================

    function test_ReputationIncreasesOnSuccess() public {
        // Setup: Register guardian
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        // Record initial reputation (reputation is 8th field, index 7)
        (,,,,,,, uint256 repBefore,) = registry.guardians(guardianAddr);

        // Record successful activity
        vm.prank(address(guardian));
        registry.recordActivity(guardianAddr, true, "PAUSE", address(usda), "Valid pause");

        // Check reputation increased
        (,,,,,,, uint256 repAfter,) = registry.guardians(guardianAddr);
        assertGt(repAfter, repBefore, "Reputation should increase");
    }

    function test_ReputationDecreasesOnFalsePositive() public {
        // Setup: Register guardian
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        vm.stopPrank();

        // Record initial reputation
        (,,,,,,, uint256 repBefore,) = registry.guardians(guardianAddr);

        // Record false positive
        vm.prank(address(guardian));
        registry.recordActivity(guardianAddr, false, "PAUSE", address(usda), "False alarm");

        // Check reputation decreased
        (,,,,,,, uint256 repAfter,) = registry.guardians(guardianAddr);
        assertLt(repAfter, repBefore, "Reputation should decrease");
    }

    // ==================== EDGE CASES ====================

    function test_CannotPauseAlreadyPaused() public {
        // Setup: Register guardian, pause contract
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5e18);
        registry.registerGuardian("Test Guardian");
        
        bytes32 reportHash = keccak256(abi.encodePacked("report1"));
        bytes memory report = abi.encode(
            reportHash,
            address(usda),
            uint8(2),
            bytes32(0),
            block.timestamp,
            guardianAddr,
            uint256(0)
        );
        guardian.writeReport(report);
        vm.stopPrank();

        // Try to pause again
        bytes32 reportHash2 = keccak256(abi.encodePacked("report2"));
        bytes memory report2 = abi.encode(
            reportHash2,
            address(usda),
            uint8(2),
            bytes32(0),
            block.timestamp,
            guardianAddr,
            uint256(1)
        );

        vm.prank(guardianAddr);
        // This will revert because the contract is already paused
        vm.expectRevert(); // ContractAlreadyPaused from the USDA contract
        guardian.writeReport(report2);
        
        // Still paused
        assertTrue(usda.paused(), "Should still be paused");
    }

    function test_LowSeverityDoesNotPause() public {
        // Setup: Register guardian
        vm.startPrank(guardianAddr);
        linkToken.approve(address(registry), 5 ether);
        registry.registerGuardian("Test Guardian");
        
        // Severity 0 = MEDIUM, should not auto-pause
        bytes32 reportHash = keccak256(abi.encodePacked("report1"));
        bytes memory report = abi.encode(
            reportHash,
            address(usda),
            uint8(0),  // MEDIUM severity
            bytes32(0),
            block.timestamp,
            guardianAddr,
            uint256(0)
        );
        
        guardian.writeReport(report);
        vm.stopPrank();

        // Should NOT be paused
        assertFalse(usda.paused(), "Should NOT be paused for MEDIUM severity");
    }
}
