// Deploy all Sentinel contracts to Sepolia
const hre = require("hardhat");

async function main() {
  console.log("Deploying Sentinel contracts to Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy SentinelRegistry
  console.log("\n📄 Deploying SentinelRegistry...");
  const SentinelRegistry = await hre.ethers.getContractFactory("SentinelRegistry");
  const registry = await SentinelRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ SentinelRegistry deployed to:", registryAddress);

  // Deploy EmergencyGuardian
  console.log("\n🛡️  Deploying EmergencyGuardian...");
  const EmergencyGuardian = await hre.ethers.getContractFactory("EmergencyGuardian");
  const guardian = await EmergencyGuardian.deploy(registryAddress);
  await guardian.waitForDeployment();
  const guardianAddress = await guardian.getAddress();
  console.log("✅ EmergencyGuardian deployed to:", guardianAddress);

  // Deploy AuditLogger
  console.log("\n📋 Deploying AuditLogger...");
  const AuditLogger = await hre.ethers.getContractFactory("AuditLogger");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.waitForDeployment();
  const auditLoggerAddress = await auditLogger.getAddress();
  console.log("✅ AuditLogger deployed to:", auditLoggerAddress);

  // Set up permissions
  console.log("\n⚙️  Setting up permissions...");
  
  // Authorize Guardian in Registry
  await registry.authorizeSentinel(guardianAddress);
  console.log("✅ Guardian authorized in Registry");

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      registry: registryAddress,
      guardian: guardianAddress,
      auditLogger: auditLoggerAddress
    }
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './deployments/sentinel-sepolia.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📦 Deployment info saved to: deployments/sentinel-sepolia.json");
  
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("Registry:   ", registryAddress);
  console.log("Guardian:   ", guardianAddress);
  console.log("AuditLogger:", auditLoggerAddress);
  console.log("=".repeat(60));

  // Verify contracts
  console.log("\n🔍 Verifying contracts on Etherscan...");
  
  await new Promise(r => setTimeout(r, 30000)); // Wait 30s for propagation
  
  try {
    await hre.run("verify:verify", {
      address: registryAddress,
      constructorArguments: [],
    });
    console.log("✅ Registry verified");
  } catch (e) {
    console.log("⚠️  Registry verification failed:", e.message);
  }
  
  try {
    await hre.run("verify:verify", {
      address: guardianAddress,
      constructorArguments: [registryAddress],
    });
    console.log("✅ Guardian verified");
  } catch (e) {
    console.log("⚠️  Guardian verification failed:", e.message);
  }
  
  try {
    await hre.run("verify:verify", {
      address: auditLoggerAddress,
      constructorArguments: [],
    });
    console.log("✅ AuditLogger verified");
  } catch (e) {
    console.log("⚠️  AuditLogger verification failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
