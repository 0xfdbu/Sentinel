/**
 * CRE Consumer Deployment Script
 * 
 * This script deploys the CREConsumer contract and configures it
 * for use with your Chainlink Functions subscription.
 * 
 * Prerequisites:
 * 1. Create a Chainlink Functions subscription at https://functions.chain.link
 * 2. Fund the subscription with LINK
 * 3. Set environment variables (see .env.example)
 */

const hre = require("hardhat");

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  // Sepolia Functions Router
  FUNCTIONS_ROUTER: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
  
  // Your subscription ID from functions.chain.link
  SUBSCRIPTION_ID: process.env.CHAINLINK_SUBSCRIPTION_ID || "YOUR_SUB_ID",
  
  // Sepolia DON ID - leave as default or update if using different network
  DON_ID: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000",
  
  // Gas limit for Functions execution
  GAS_LIMIT: 300000,
};

async function main() {
  console.log("🚀 Deploying CRE Consumer Contract...\n");

  // Validate configuration
  if (CONFIG.SUBSCRIPTION_ID === "YOUR_SUB_ID") {
    console.error("❌ ERROR: Please set CHAINLINK_SUBSCRIPTION_ID environment variable");
    console.log("\nCreate a subscription at: https://functions.chain.link/sepolia");
    console.log("Then run: export CHAINLINK_SUBSCRIPTION_ID=123");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Subscription ID: ${CONFIG.SUBSCRIPTION_ID}\n`);

  // Deploy CREConsumer
  console.log("📄 Deploying CREConsumer...");
  const CREConsumer = await hre.ethers.getContractFactory("CREConsumer");
  const creConsumer = await CREConsumer.deploy(
    CONFIG.FUNCTIONS_ROUTER,
    CONFIG.SUBSCRIPTION_ID,
    CONFIG.DON_ID
  );

  await creConsumer.waitForDeployment();
  const creAddress = await creConsumer.getAddress();

  console.log(`✅ CREConsumer deployed to: ${creAddress}`);
  console.log(`   Transaction: ${creConsumer.deploymentTransaction().hash}\n`);

  // Add contract as consumer to subscription
  console.log("🔗 Next Steps:");
  console.log("   1. Go to: https://functions.chain.link/sepolia");
  console.log(`   2. Find subscription #${CONFIG.SUBSCRIPTION_ID}`);
  console.log("   3. Click 'Add Consumer'");
  console.log(`   4. Enter address: ${creAddress}\n`);

  // Store deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    creConsumer: creAddress,
    functionsRouter: CONFIG.FUNCTIONS_ROUTER,
    subscriptionId: CONFIG.SUBSCRIPTION_ID,
    donId: CONFIG.DON_ID,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  // Save to file
  const fs = require("fs");
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    `${deploymentsDir}/cre-consumer-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📝 Deployment info saved to:");
  console.log(`   ${deploymentsDir}/cre-consumer-${hre.network.name}.json\n`);

  // Verification instructions
  if (hre.network.name === "sepolia") {
    console.log("🔍 To verify on Etherscan:");
    console.log(`   npx hardhat verify --network sepolia ${creAddress} ${CONFIG.FUNCTIONS_ROUTER} ${CONFIG.SUBSCRIPTION_ID} ${CONFIG.DON_ID}\n`);
  }

  return deploymentInfo;
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
