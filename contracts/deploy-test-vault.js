#!/usr/bin/env node
/**
 * Deploy Sentinel Test Vault
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   npx hardhat run deploy-test-vault.js --network sepolia
 */

const hre = require("hardhat");

// Configuration
const CONFIG = {
  // DemoToken already deployed on Sepolia
  DEMO_TOKEN: "0x6CEcD1FC8691840C76A173bf807b3d28dF75204e",
};

async function main() {
  console.log("🚀 Deploying SentinelTestVault to Sepolia\n");

  // Check prerequisites
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.error("❌ ERROR: Set PRIVATE_KEY environment variable");
    console.log("\nExample:");
    console.log("  export PRIVATE_KEY=0xabc123...");
    process.exit(1);
  }

  // Verify we're on sepolia
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Current network: ${network.name} (chainId: ${network.chainId})`);
  
  if (network.chainId !== 11155111n) {
    console.error("❌ ERROR: Not on Sepolia!");
    console.log("Run with: npx hardhat run deploy-test-vault.js --network sepolia");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  if (balance < hre.ethers.parseEther("0.001")) {
    console.error("❌ Insufficient balance. Get Sepolia ETH from:");
    console.log("  https://faucets.chain.link/");
    process.exit(1);
  }

  // Deploy
  console.log("📄 Compiling and deploying SentinelTestVault...");
  console.log(`   Asset (DemoToken): ${CONFIG.DEMO_TOKEN}`);
  console.log(`   Admin: ${deployer.address}\n`);

  const SentinelTestVault = await hre.ethers.getContractFactory("SentinelTestVault");
  const vault = await SentinelTestVault.deploy(
    CONFIG.DEMO_TOKEN,
    deployer.address  // Admin is the deployer
  );

  await vault.waitForDeployment();
  const address = await vault.getAddress();

  console.log(`✅ SUCCESS!`);
  console.log(`   Contract: ${address}`);
  console.log(`   Tx Hash: ${vault.deploymentTransaction().hash}\n`);

  // Get PAUSER_ROLE bytes32
  const pauserRole = await vault.PAUSER_ROLE();
  console.log(`   PAUSER_ROLE: ${pauserRole}`);
  console.log(`   Has PAUSER_ROLE (deployer): ${await vault.hasRole(pauserRole, deployer.address)}\n`);

  // Save deployment info
  const fs = require("fs");
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    vault: address,
    asset: CONFIG.DEMO_TOKEN,
    admin: deployer.address,
    pauserRole: pauserRole,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    `./deployments/test-vault-sepolia.json`,
    JSON.stringify(deployment, null, 2)
  );

  console.log("💾 Deployment saved to: deployments/test-vault-sepolia.json\n");
  
  console.log("📋 NEXT STEPS:");
  console.log("   1. Use this contract address in the Sentinel UI:");
  console.log(`      ${address}`);
  console.log("   2. Grant PAUSER_ROLE to the Sentinel contract after registration");
  console.log("   3. The vault is ready for testing!\n");

  // Verification command
  console.log("🔍 Verify command:");
  console.log(`   npx hardhat verify --network sepolia ${address} ${CONFIG.DEMO_TOKEN} ${deployer.address}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
