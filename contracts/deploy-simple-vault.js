#!/usr/bin/env node
/**
 * Deploy SimpleVault for Sentinel Protection
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   node deploy-simple-vault.js
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying SimpleVault to Sepolia\n");

  // Check prerequisites
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
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
    console.log("Check your hardhat network configuration");
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
  console.log("📄 Compiling and deploying SimpleVault...\n");

  const SimpleVault = await hre.ethers.getContractFactory("SimpleVault");
  const vault = await SimpleVault.deploy();

  await vault.waitForDeployment();
  const address = await vault.getAddress();

  console.log(`✅ SUCCESS!`);
  console.log(`   Contract: ${address}`);
  console.log(`   Tx Hash: ${vault.deploymentTransaction().hash}\n`);

  // Get contract balance (should be 0)
  const contractBalance = await vault.getContractBalance();
  console.log(`   Contract Balance: ${hre.ethers.formatEther(contractBalance)} ETH\n`);

  // Save deployment info
  const fs = require("fs");
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    vault: address,
    name: "SimpleVault",
    admin: deployer.address,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    txHash: vault.deploymentTransaction().hash,
  };

  // Ensure deployments directory exists
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }

  fs.writeFileSync(
    `./deployments/simple-vault-sepolia.json`,
    JSON.stringify(deployment, null, 2)
  );

  console.log("💾 Deployment saved to: deployments/simple-vault-sepolia.json\n");
  
  console.log("📋 NEXT STEPS:");
  console.log("   1. Register this vault in the Sentinel /protect page:");
  console.log(`      Address: ${address}`);
  console.log("   2. Stake 0.01 ETH to register");
  console.log("   3. The vault will be monitored by Sentinel\n");

  // Verification command
  console.log("🔍 Verify command:");
  console.log(`   npx hardhat verify --network sepolia ${address}\n`);

  return address;
}

main()
  .then((address) => {
    console.log(`✅ Contract deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
