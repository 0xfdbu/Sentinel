#!/usr/bin/env node
/**
 * Deploy SimpleVaultWithRoles for Sentinel Protection
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying SimpleVaultWithRoles to Sepolia\n");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ ERROR: Set PRIVATE_KEY environment variable");
    process.exit(1);
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  
  if (network.chainId !== 11155111n) {
    console.error("❌ Not on Sepolia!");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  console.log("📄 Deploying SimpleVaultWithRoles...\n");

  const SimpleVault = await hre.ethers.getContractFactory("SimpleVaultWithRoles");
  const vault = await SimpleVault.deploy();
  await vault.waitForDeployment();
  
  const address = await vault.getAddress();
  const pauserRole = await vault.PAUSER_ROLE();

  console.log(`✅ SUCCESS!`);
  console.log(`   Contract: ${address}`);
  console.log(`   PAUSER_ROLE: ${pauserRole}`);
  console.log(`   Tx Hash: ${vault.deploymentTransaction().hash}\n`);

  // Save deployment
  const fs = require("fs");
  if (!fs.existsSync('./deployments')) fs.mkdirSync('./deployments');
  
  fs.writeFileSync(
    `./deployments/simple-vault-roles-sepolia.json`,
    JSON.stringify({
      network: "sepolia",
      chainId: 11155111,
      vault: address,
      name: "SimpleVaultWithRoles",
      pauserRole: pauserRole,
      admin: deployer.address,
      deployedAt: new Date().toISOString(),
      txHash: vault.deploymentTransaction().hash,
    }, null, 2)
  );

  console.log("💾 Saved to: deployments/simple-vault-roles-sepolia.json\n");
  console.log("📋 NEXT STEPS:");
  console.log(`   1. Grant PAUSER_ROLE to Guardian: ${address}`);
  console.log(`   2. Register vault in /protect page`);
  console.log("\n🔍 Verify command:");
  console.log(`   npx hardhat verify --network sepolia ${address}\n`);

  return address;
}

main()
  .then((addr) => {
    console.log(`✅ Deployed at: ${addr}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
