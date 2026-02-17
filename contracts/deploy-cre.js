#!/usr/bin/env node
/**
 * Deploy CRE Consumer Script
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   export CHAINLINK_SUBSCRIPTION_ID=1234
 *   npx hardhat run deploy-cre.js --network sepolia
 */

const hre = require("hardhat");

// Sepolia Functions configuration
const CONFIG = {
  FUNCTIONS_ROUTER: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
  DON_ID: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000",
};

async function main() {
  console.log("🚀 Deploying CRE Consumer to Sepolia\n");

  // Check prerequisites
  const privateKey = process.env.PRIVATE_KEY;
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID;

  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.error("❌ ERROR: Set PRIVATE_KEY environment variable");
    console.log("\nExample:");
    console.log("  export PRIVATE_KEY=0xabc123...");
    process.exit(1);
  }

  if (!subscriptionId) {
    console.error("❌ ERROR: Set CHAINLINK_SUBSCRIPTION_ID");
    console.log("\nGet your subscription ID from:");
    console.log("  https://functions.chain.link/sepolia");
    console.log("\nThen run:");
    console.log("  export CHAINLINK_SUBSCRIPTION_ID=1234");
    process.exit(1);
  }

  // Verify we're on sepolia
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Current network: ${network.name} (chainId: ${network.chainId})`);
  
  if (network.chainId !== 11155111n) {
    console.error("❌ ERROR: Not on Sepolia!");
    console.log("Run with: npx hardhat run deploy-cre.js --network sepolia");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`Subscription ID: ${subscriptionId}\n`);

  if (balance < hre.ethers.parseEther("0.001")) {
    console.error("❌ Insufficient balance. Get Sepolia ETH from:");
    console.log("  https://faucets.chain.link/");
    process.exit(1);
  }

  // Deploy
  console.log("📄 Compiling and deploying CREConsumer...");
  console.log(`   Router: ${CONFIG.FUNCTIONS_ROUTER}`);
  console.log(`   Subscription: ${subscriptionId}`);
  console.log(`   DON ID: ${CONFIG.DON_ID}\n`);

  const CREConsumer = await hre.ethers.getContractFactory("CREConsumer");
  const consumer = await CREConsumer.deploy(
    CONFIG.FUNCTIONS_ROUTER,
    subscriptionId,
    CONFIG.DON_ID
  );

  await consumer.waitForDeployment();
  const address = await consumer.getAddress();

  console.log(`✅ SUCCESS!`);
  console.log(`   Contract: ${address}`);
  console.log(`   Tx Hash: ${consumer.deploymentTransaction().hash}\n`);

  // Save deployment info
  const fs = require("fs");
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    creConsumer: address,
    functionsRouter: CONFIG.FUNCTIONS_ROUTER,
    subscriptionId: parseInt(subscriptionId),
    donId: CONFIG.DON_ID,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    `./deployments/cre-consumer-sepolia.json`,
    JSON.stringify(deployment, null, 2)
  );

  console.log("💾 Deployment saved to: deployments/cre-consumer-sepolia.json\n");
  
  console.log("📋 NEXT STEPS:");
  console.log("   1. Add this contract as consumer to your subscription:");
  console.log(`      https://functions.chain.link/sepolia/${subscriptionId}`);
  console.log("   2. Click 'Add Consumer' and enter:");
  console.log(`      ${address}`);
  console.log("   3. Fund your subscription with LINK tokens\n");

  // Verification command
  console.log("🔍 Verify command:");
  console.log(`   npx hardhat verify --network sepolia ${address} ${CONFIG.FUNCTIONS_ROUTER} ${subscriptionId} ${CONFIG.DON_ID}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });
