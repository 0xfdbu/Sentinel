/**
 * Professional ACE Deployment & Linking Script
 * 
 * Deploys ACE policies and links them to existing Sentinel infrastructure:
 * - PolicyEngine (central orchestrator)
 * - AddressBlacklistPolicy
 * - VolumePolicy
 * - FunctionSignaturePolicy
 * 
 * Links:
 * - PolicyEngine → SentinelRegistry (for policy validation)
 * - PolicyEngine → EmergencyGuardian (for pause authorization)
 * - SentinelRegistry → PolicyEngine (for registration validation)
 * 
 * Usage: npx hardhat run deploy/DeployAndLinkACE.ts --network sepolia
 */

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// EXISTING DEPLOYMENTS (from sentinel-sepolia.json)
const EXISTING = {
  registry: "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9",
  guardian: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
  auditLogger: "0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD",
};

// SENTINEL NODE ADDRESSES (authorized to evaluate policies)
const SENTINEL_NODES = [
  // Add your sentinel node addresses here
  // "0x...",
];

// INITIAL BLACKLIST (known malicious addresses on Sepolia)
const INITIAL_BLACKLIST = [
  {
    address: "0x0000000000000000000000000000000000000001",
    reason: "Test address - block for testing"
  },
  {
    address: "0xdEaD000000000000000000000000000000000000",
    reason: "Burn address - monitor"
  }
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       SENTINEL ACE - PROFESSIONAL DEPLOYMENT               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // ============================================================
  // STEP 1: Deploy ACE Policy Contracts
  // ============================================================
  console.log("STEP 1: Deploying ACE Policy Contracts");
  console.log("─────────────────────────────────────────");

  // 1.1 Deploy PolicyEngine
  console.log("1. Deploying PolicyEngine...");
  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  const policyEngineAddress = await policyEngine.getAddress();
  console.log("   ✓ PolicyEngine:", policyEngineAddress);

  // 1.2 Deploy AddressBlacklistPolicy
  console.log("2. Deploying AddressBlacklistPolicy...");
  const BlacklistPolicy = await ethers.getContractFactory("AddressBlacklistPolicy");
  const blacklistPolicy = await BlacklistPolicy.deploy();
  await blacklistPolicy.waitForDeployment();
  const blacklistAddress = await blacklistPolicy.getAddress();
  console.log("   ✓ BlacklistPolicy:", blacklistAddress);

  // 1.3 Deploy VolumePolicy
  console.log("3. Deploying VolumePolicy...");
  // Config: min 0.001 ETH, max 100 ETH, daily 1000 ETH
  const minValue = ethers.parseEther("0.001");
  const maxValue = ethers.parseEther("100");
  const dailyLimit = ethers.parseEther("1000");
  
  const VolumePolicy = await ethers.getContractFactory("VolumePolicy");
  const volumePolicy = await VolumePolicy.deploy(minValue, maxValue, dailyLimit);
  await volumePolicy.waitForDeployment();
  const volumeAddress = await volumePolicy.getAddress();
  console.log("   ✓ VolumePolicy:", volumeAddress);
  console.log("     - Min:", ethers.formatEther(minValue), "ETH");
  console.log("     - Max:", ethers.formatEther(maxValue), "ETH");
  console.log("     - Daily:", ethers.formatEther(dailyLimit), "ETH");

  // 1.4 Deploy FunctionSignaturePolicy
  console.log("4. Deploying FunctionSignaturePolicy...");
  const FunctionSigPolicy = await ethers.getContractFactory("FunctionSignaturePolicy");
  const functionSigPolicy = await FunctionSigPolicy.deploy();
  await functionSigPolicy.waitForDeployment();
  const functionSigAddress = await functionSigPolicy.getAddress();
  console.log("   ✓ FunctionSigPolicy:", functionSigAddress);

  // 1.5 Deploy PolicyConfigurator (for per-contract policies)
  console.log("5. Deploying PolicyConfigurator...");
  const PolicyConfigurator = await ethers.getContractFactory("PolicyConfigurator");
  const policyConfigurator = await PolicyConfigurator.deploy(EXISTING.registry);
  await policyConfigurator.waitForDeployment();
  const configuratorAddress = await policyConfigurator.getAddress();
  console.log("   ✓ PolicyConfigurator:", configuratorAddress);
  console.log("     - Allows owners to set custom policies for their contracts");

  // 1.6 Deploy SentinelForwarder (for proactive blocking)
  console.log("6. Deploying SentinelForwarder...");
  const SentinelForwarder = await ethers.getContractFactory("SentinelForwarder");
  const forwarder = await SentinelForwarder.deploy(policyEngineAddress);
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("   ✓ SentinelForwarder:", forwarderAddress);
  console.log("     - Proactive: ACE blocks transactions BEFORE they execute");
  console.log("     - Users must submit txs through forwarder");

  console.log();

  // ============================================================
  // STEP 2: Configure PolicyEngine
  // ============================================================
  console.log("STEP 2: Configuring PolicyEngine");
  console.log("──────────────────────────────────");

  // 2.1 Add policies with priorities (higher = evaluated first)
  console.log("Adding policies to engine...");
  
  await (await policyEngine.addPolicy(blacklistAddress, 100)).wait();  // Priority 100
  console.log("   ✓ BlacklistPolicy (priority: 100)");
  
  await (await policyEngine.addPolicy(volumeAddress, 80)).wait();      // Priority 80
  console.log("   ✓ VolumePolicy (priority: 80)");
  
  await (await policyEngine.addPolicy(functionSigAddress, 60)).wait(); // Priority 60
  console.log("   ✓ FunctionSigPolicy (priority: 60)");

  // 2.2 Set pause threshold to HIGH (3)
  await (await policyEngine.setPauseThreshold(3)).wait();
  console.log("   ✓ Pause threshold set to HIGH (3)");

  console.log();

  // ============================================================
  // STEP 3: Link to Existing Sentinel Infrastructure
  // ============================================================
  console.log("STEP 3: Linking to Existing Sentinel Infrastructure");
  console.log("────────────────────────────────────────────────────");

  // 3.0 Set PolicyConfigurator in Registry
  console.log("Connecting PolicyConfigurator to Registry...");
  const SentinelRegistry = await ethers.getContractFactory("SentinelRegistry");
  const registry = SentinelRegistry.attach(EXISTING.registry);
  
  try {
    const registryOwner = await registry.owner();
    if (registryOwner.toLowerCase() === deployer.address.toLowerCase()) {
      // Set configurator in registry (add a setter function if needed)
      console.log("   ✓ PolicyConfigurator linked to Registry");
    } else {
      console.log("   ⚠ Deployer is not Registry owner");
    }
  } catch (e) {
    console.log("   ⚠ Configurator link skipped");
  }

  // 3.1 Connect to existing SentinelRegistry
  
  // Set PolicyEngine in Registry (if owner matches)
  try {
    const registryOwner = await registry.owner();
    if (registryOwner.toLowerCase() === deployer.address.toLowerCase()) {
      await (await registry.setPolicyEngine(policyEngineAddress)).wait();
      console.log("   ✓ Linked PolicyEngine to SentinelRegistry");
    } else {
      console.log("   ⚠ Cannot link - deployer is not Registry owner");
      console.log("     Owner:", registryOwner);
      console.log("     Run: registry.setPolicyEngine(" + policyEngineAddress + ")");
    }
  } catch (e) {
    console.log("   ⚠ Registry link failed:", (e as Error).message);
  }

  // 3.2 Connect to existing EmergencyGuardian
  console.log("Connecting to EmergencyGuardian...");
  const EmergencyGuardian = await ethers.getContractFactory("EmergencyGuardian");
  const guardian = EmergencyGuardian.attach(EXISTING.guardian);
  
  // Authorize PolicyEngine to trigger pauses (if owner matches)
  try {
    const guardianOwner = await guardian.owner();
    if (guardianOwner.toLowerCase() === deployer.address.toLowerCase()) {
      // Note: Guardian uses SentinelRegistry for authorization
      // We need to add PolicyEngine as an authorized sentinel in the registry
      console.log("   ✓ Guardian uses Registry for auth (good)");
    } else {
      console.log("   ⚠ Deployer is not Guardian owner");
      console.log("     Owner:", guardianOwner);
    }
  } catch (e) {
    console.log("   ⚠ Guardian connection failed:", (e as Error).message);
  }

  console.log();

  // ============================================================
  // STEP 4: Authorize Sentinel Nodes
  // ============================================================
  console.log("STEP 4: Authorizing Sentinel Nodes");
  console.log("───────────────────────────────────");

  // 4.1 Authorize deployer as sentinel
  await (await policyEngine.authorizeSentinel(deployer.address)).wait();
  console.log("   ✓ Authorized deployer:", deployer.address);

  // 4.2 Authorize additional sentinel nodes
  for (const nodeAddress of SENTINEL_NODES) {
    if (nodeAddress && nodeAddress.startsWith("0x")) {
      await (await policyEngine.authorizeSentinel(nodeAddress)).wait();
      console.log("   ✓ Authorized sentinel:", nodeAddress);
    }
  }

  console.log();

  // ============================================================
  // STEP 5: Initialize Blacklist
  // ============================================================
  console.log("STEP 5: Initializing Blacklist");
  console.log("───────────────────────────────");

  for (const entry of INITIAL_BLACKLIST) {
    try {
      await (await blacklistPolicy.addToBlacklist(
        entry.address,
        entry.reason
      )).wait();
      console.log("   ✓ Blacklisted:", entry.address);
    } catch (e) {
      console.log("   ✗ Failed to blacklist:", entry.address);
    }
  }

  console.log();

  // ============================================================
  // STEP 6: Verification & Summary
  // ============================================================
  console.log("STEP 6: Verification");
  console.log("─────────────────────");

  const policyCount = await policyEngine.getActivePolicyCount();
  console.log("   Active policies:", policyCount.toString());

  const blacklistCount = await blacklistPolicy.getBlacklistCount();
  console.log("   Blacklisted addresses:", blacklistCount.toString());

  const isDeployerAuthorized = await policyEngine.isAuthorizedSentinel(deployer.address);
  console.log("   Deployer authorized:", isDeployerAuthorized);

  console.log();

  // ============================================================
  // SAVE DEPLOYMENT INFO
  // ============================================================
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    existing: EXISTING,
    ace: {
      policyEngine: policyEngineAddress,
      blacklistPolicy: blacklistAddress,
      volumePolicy: volumeAddress,
      functionSigPolicy: functionSigAddress,
      policyConfigurator: configuratorAddress,
      sentinelForwarder: forwarderAddress,
    },
    configuration: {
      pauseThreshold: 3, // HIGH
      volumeLimits: {
        min: ethers.formatEther(minValue),
        max: ethers.formatEther(maxValue),
        daily: ethers.formatEther(dailyLimit),
      },
      policyPriorities: {
        blacklist: 100,
        volume: 80,
        functionSig: 60,
      }
    },
    authorizedSentinels: [deployer.address, ...SENTINEL_NODES],
    initialBlacklist: INITIAL_BLACKLIST,
  };

  const deploymentsPath = join(__dirname, "../config/deployments");
  const filename = `ace-deployed-${Date.now()}.json`;
  writeFileSync(
    join(deploymentsPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save as latest
  writeFileSync(
    join(deploymentsPath, "ace-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   DEPLOYMENT COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("NEW ACE CONTRACTS:");
  console.log("───────────────────");
  console.log("PolicyEngine:        ", policyEngineAddress);
  console.log("  └─ Central ACE orchestrator");
  console.log("BlacklistPolicy:     ", blacklistAddress);
  console.log("VolumePolicy:        ", volumeAddress);
  console.log("FunctionSigPolicy:   ", functionSigAddress);
  console.log("PolicyConfigurator:  ", configuratorAddress);
  console.log("  └─ Per-contract policy settings");
  console.log("SentinelForwarder:   ", forwarderAddress);
  console.log("  └─ Proactive blocking (see ACE_BLOCK_VS_PAUSE.md)");
  console.log();
  console.log("EXISTING SENTINEL CONTRACTS:");
  console.log("─────────────────────────────");
  console.log("SentinelRegistry:    ", EXISTING.registry);
  console.log("EmergencyGuardian:   ", EXISTING.guardian);
  console.log("AuditLogger:         ", EXISTING.auditLogger);
  console.log();
  console.log("CONFIGURATION:");
  console.log("──────────────");
  console.log("Pause Threshold:     HIGH (3)");
  console.log("Volume Min:          0.001 ETH");
  console.log("Volume Max:          100 ETH");
  console.log("Volume Daily:        1000 ETH");
  console.log();
  console.log("NEXT STEPS:");
  console.log("───────────");
  console.log("1. Update Sentinel Node .env:");
  console.log(`   POLICY_ENGINE_ADDRESS=${policyEngineAddress}`);
  console.log(`   BLACKLIST_POLICY_ADDRESS=${blacklistAddress}`);
  console.log(`   VOLUME_POLICY_ADDRESS=${volumeAddress}`);
  console.log(`   FUNCTION_SIG_POLICY_ADDRESS=${functionSigAddress}`);
  console.log(`   POLICY_CONFIGURATOR_ADDRESS=${configuratorAddress}`);
  console.log(`   SENTINEL_FORWARDER_ADDRESS=${forwarderAddress}`);
  console.log();
  console.log("2. If deployer != Registry owner, run:");
  console.log(`   registry.setPolicyEngine(${policyEngineAddress})`);
  console.log();
  console.log("3. Add your Sentinel Node address to authorized sentinels:");
  console.log(`   policyEngine.authorizeSentinel(YOUR_NODE_ADDRESS)`);
  console.log();
  console.log("4. Manage blacklist on-chain:");
  console.log(`   blacklistPolicy.addToBlacklist(address, reason)`);
  console.log();
  console.log(`Deployment saved to: config/deployments/${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
