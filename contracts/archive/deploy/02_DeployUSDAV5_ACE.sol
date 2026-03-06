// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Chainlink ACE
import {PolicyEngine} from "@chainlink-ace/policy-management/core/PolicyEngine.sol";
import {Policy} from "@chainlink-ace/policy-management/core/Policy.sol";
import {PausePolicy} from "@chainlink-ace/policy-management/policies/PausePolicy.sol";

// Sentinel Contracts
import {USDAStablecoinV5} from "../src/tokens/USDAStablecoinV5.sol";

/**
 * @title DeployUSDAStablecoinV5
 * @notice Deploys USDA V5 with Chainlink ACE integration
 * @dev Uses UUPS proxy pattern for upgradeability
 */
contract DeployUSDAStablecoinV5 is Script {
    // Configuration
    uint256 public constant INITIAL_MINT_CAP = 1_000_000_000 * 10**6; // 1B USDA
    uint256 public constant DAILY_MINT_LIMIT = 1_000_000 * 10**6;     // 1M USDA per day
    
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPK);
        
        // Get configuration from environment or use defaults
        address guardian = vm.envOr("SENTINEL_GUARDIAN", deployer);
        
        console.log("========================================");
        console.log("Deploying USDA Stablecoin V5");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Guardian (PAUSER_ROLE):", guardian);
        console.log("");
        
        vm.startBroadcast(deployerPK);
        
        // ========================================
        // 1. Deploy Chainlink ACE PolicyEngine
        // ========================================
        console.log("1. Deploying Chainlink ACE PolicyEngine...");
        
        PolicyEngine policyEngineImpl = new PolicyEngine();
        bytes memory policyEngineData = abi.encodeWithSelector(
            PolicyEngine.initialize.selector,
            true,  // defaultAllow = true (allow by default)
            deployer
        );
        ERC1967Proxy policyEngineProxy = new ERC1967Proxy(
            address(policyEngineImpl),
            policyEngineData
        );
        PolicyEngine policyEngine = PolicyEngine(address(policyEngineProxy));
        
        console.log("   PolicyEngine Proxy:", address(policyEngine));
        console.log("   PolicyEngine Impl:", address(policyEngineImpl));
        
        // ========================================
        // 2. Deploy PausePolicy
        // ========================================
        console.log("");
        console.log("2. Deploying PausePolicy...");
        
        PausePolicy pausePolicyImpl = new PausePolicy();
        bytes memory pausePolicyConfig = abi.encode(false); // Not paused by default
        bytes memory pausePolicyData = abi.encodeWithSelector(
            Policy.initialize.selector,
            address(policyEngine),
            deployer,
            pausePolicyConfig
        );
        ERC1967Proxy pausePolicyProxy = new ERC1967Proxy(
            address(pausePolicyImpl),
            pausePolicyData
        );
        PausePolicy pausePolicy = PausePolicy(address(pausePolicyProxy));
        
        console.log("   PausePolicy Proxy:", address(pausePolicy));
        console.log("   PausePolicy Impl:", address(pausePolicyImpl));
        
        // ========================================
        // 3. Deploy USDA V5 Implementation
        // ========================================
        console.log("");
        console.log("3. Deploying USDA V5 Implementation...");
        
        USDAStablecoinV5 usdaImpl = new USDAStablecoinV5();
        
        console.log("   USDA V5 Impl:", address(usdaImpl));
        
        // ========================================
        // 4. Deploy USDA V5 Proxy
        // ========================================
        console.log("");
        console.log("4. Deploying USDA V5 Proxy...");
        
        bytes memory usdaInitData = abi.encodeWithSelector(
            USDAStablecoinV5.initialize.selector,
            deployer,                           // initialOwner
            address(policyEngine),              // policyEngine
            guardian,                           // guardian (for reference only, PAUSER_ROLE granted later via Sentinel Registry)
            INITIAL_MINT_CAP,                   // initialMintCap
            DAILY_MINT_LIMIT                    // dailyMintLimit
        );
        
        ERC1967Proxy usdaProxy = new ERC1967Proxy(
            address(usdaImpl),
            usdaInitData
        );
        USDAStablecoinV5 usda = USDAStablecoinV5(address(usdaProxy));
        
        console.log("   USDA V5 Proxy:", address(usda));
        console.log("   USDA V5 Impl:", address(usdaImpl));
        
        // ========================================
        // 5. Attach Policies to USDA
        // ========================================
        console.log("");
        console.log("5. Attaching PausePolicy to USDA functions...");
        
        // Attach pause policy to transfer
        policyEngine.addPolicy(
            address(usda),
            usda.transfer.selector,
            address(pausePolicy),
            new bytes32[](0)
        );
        
        // Attach pause policy to mint
        policyEngine.addPolicy(
            address(usda),
            usda.mint.selector,
            address(pausePolicy),
            new bytes32[](0)
        );
        
        // Attach pause policy to burn
        policyEngine.addPolicy(
            address(usda),
            usda.burn.selector,
            address(pausePolicy),
            new bytes32[](0)
        );
        
        console.log("   PausePolicy attached to: transfer, mint, burn");
        
        vm.stopBroadcast();
        
        // ========================================
        // Summary
        // ========================================
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("");
        console.log("Chainlink ACE:");
        console.log("  PolicyEngine Proxy: ", address(policyEngine));
        console.log("  PausePolicy Proxy:  ", address(pausePolicy));
        console.log("");
        console.log("USDA Stablecoin V5:");
        console.log("  Proxy (Use this):   ", address(usda));
        console.log("  Implementation:     ", address(usdaImpl));
        console.log("");
        console.log("Configuration:");
        console.log("  Mint Cap:          ", INITIAL_MINT_CAP / 1e6, "USDA");
        console.log("  Daily Mint Limit:  ", DAILY_MINT_LIMIT / 1e6, "USDA");
        console.log("  Guardian:          ", guardian);
        console.log("  Owner:             ", deployer);
        console.log("");
        console.log("Roles:");
        console.log("  DEFAULT_ADMIN_ROLE: ", deployer);
        console.log("  PAUSER_ROLE:        ", deployer, " (Guardian will be added via Sentinel Registry)");
        console.log("  MINTER_ROLE:        ", deployer);
        console.log("  BURNER_ROLE:        ", deployer);
        console.log("  UPGRADER_ROLE:      ", deployer);
        console.log("");
        console.log("Environment Variables:");
        console.log("  export USDA_V5_PROXY=", address(usda));
        console.log("  export POLICY_ENGINE=", address(policyEngine));
        console.log("  export PAUSE_POLICY=", address(pausePolicy));
        console.log("");
    }
}
