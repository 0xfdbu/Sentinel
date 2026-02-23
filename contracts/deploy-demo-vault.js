#!/usr/bin/env node
/**
 * Deploy Demo Vault for Sentinel Hackathon Demo
 * 
 * This script:
 * 1. Deploys DemoVault contract
 * 2. Funds it with 0.01 ETH
 * 3. Verifies on Etherscan
 * 4. Grants PAUSER_ROLE to Guardian
 * 5. Registers with Sentinel Registry
 */

const hre = require("hardhat");

// Configuration
const CONFIG = {
  GUARDIAN_ADDRESS: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
  REGISTRY_ADDRESS: "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9",
  FUND_AMOUNT: "0.01", // ETH to deposit
};

async function main() {
  console.log("🚀 Deploying Demo Vault for Hackathon Demo\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Deploy DemoVault
  console.log("📄 Deploying DemoVault...");
  const DemoVault = await hre.ethers.getContractFactory("DemoVault");
  const vault = await DemoVault.deploy(deployer.address);
  await vault.waitForDeployment();
  
  const vaultAddress = await vault.getAddress();
  console.log(`✅ DemoVault deployed: ${vaultAddress}`);
  console.log(`   Tx: ${vault.deploymentTransaction().hash}\n`);

  // Fund the vault
  console.log(`💰 Funding vault with ${CONFIG.FUND_AMOUNT} ETH...`);
  const fundTx = await deployer.sendTransaction({
    to: vaultAddress,
    value: hre.ethers.parseEther(CONFIG.FUND_AMOUNT),
  });
  await fundTx.wait();
  console.log(`✅ Funded! Vault balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(vaultAddress))} ETH\n`);

  // Grant PAUSER_ROLE to Guardian
  console.log("🔑 Granting PAUSER_ROLE to Guardian...");
  const grantTx = await vault.grantRole(
    await vault.PAUSER_ROLE(),
    CONFIG.GUARDIAN_ADDRESS
  );
  await grantTx.wait();
  console.log(`✅ Guardian can now pause this vault\n`);

  // Deploy SimpleDrainer for demo
  console.log("📄 Deploying SimpleDrainer (attacker contract)...");
  const SimpleDrainer = await hre.ethers.getContractFactory("SimpleDrainer");
  const drainer = await SimpleDrainer.deploy(vaultAddress);
  await drainer.waitForDeployment();
  
  const drainerAddress = await drainer.getAddress();
  console.log(`✅ SimpleDrainer deployed: ${drainerAddress}`);
  console.log(`   Tx: ${drainer.deploymentTransaction().hash}\n`);

  // Save deployment info
  const fs = require("fs");
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      demoVault: vaultAddress,
      simpleDrainer: drainerAddress,
      guardian: CONFIG.GUARDIAN_ADDRESS,
      registry: CONFIG.REGISTRY_ADDRESS,
    },
    funding: {
      amount: CONFIG.FUND_AMOUNT,
      txHash: fundTx.hash,
    },
  };

  fs.writeFileSync(
    `./deployments/demo-vault-sepolia.json`,
    JSON.stringify(deployment, null, 2)
  );

  console.log("💾 Deployment saved to: deployments/demo-vault-sepolia.json\n");

  // Summary
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║            🎯 DEMO VAULT READY FOR HACKATHON             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log("📍 DemoVault:        ", vaultAddress);
  console.log("📍 SimpleDrainer:    ", drainerAddress);
  console.log("💰 Vault Balance:    ", CONFIG.FUND_AMOUNT, "ETH");
  console.log("🔐 Guardian:         ", CONFIG.GUARDIAN_ADDRESS);
  console.log("");
  console.log("🔧 NEXT STEPS:");
  console.log("   1. Register vault on Sentinel Protect page");
  console.log("   2. Verify on Etherscan");
  console.log("   3. Use SimpleDrainer to attempt attack");
  console.log("   4. Watch Guardian auto-pause!\n");

  // Verify command
  console.log("🔍 Verify command:");
  console.log(`   npx hardhat verify --network sepolia ${vaultAddress} ${deployer.address}`);
  console.log(`   npx hardhat verify --network sepolia ${drainerAddress} ${vaultAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
