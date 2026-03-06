/**
 * Cross-Chain Linking Script
 * 
 * Links Sepolia and Mumbai USDA contracts for CCIP bridging
 * 
 * Usage: npx hardhat run deploy/LinkCrossChain.ts --network sepolia
 */

import { ethers } from "hardhat";

// ADDRESSES
const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";
const AMOY_USDA = process.env.AMOY_USDA || ""; // Set after Amoy deployment

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  amoy: 16281711391670634445n,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           CROSS-CHAIN LINKING                              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  const isSepolia = network.chainId === 11155111n;
  const isAmoy = network.chainId === 80002n;

  if (!isSepolia && !isAmoy) {
    console.log("⚠ Please run this script on Sepolia or Amoy");
    return;
  }

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  
  if (isSepolia) {
    console.log("Linking Sepolia USDA to Amoy...");
    console.log("─────────────────────────────────────");
    
    if (!AMOY_USDA) {
      console.log("⚠ Please set AMOY_USDA environment variable");
      console.log("Example: AMOY_USDA=0x... npx hardhat run deploy/LinkCrossChain.ts --network sepolia");
      return;
    }

    const stablecoin = USDAStablecoin.attach(SEPOLIA_USDA);

    // Set Amoy as allowed source chain
    console.log("Setting Amoy as allowed source chain...");
    await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.amoy, true)).wait();
    console.log("✓ Amoy chain allowed");

    // Set Amoy USDA as allowed sender
    console.log("Setting Amoy USDA as allowed sender...");
    await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.amoy, AMOY_USDA, true)).wait();
    console.log("✓ Amoy USDA allowed as sender");

    // Set Amoy remote stablecoin
    console.log("Setting Amoy remote stablecoin...");
    await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.amoy, AMOY_USDA)).wait();
    console.log("✓ Amoy remote stablecoin set:", AMOY_USDA);

    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║              SEPOLIA LINKING COMPLETE                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();
    console.log("Cross-chain bridge is now ACTIVE!");
    console.log();
    console.log("To bridge from Sepolia to Amoy:");
    console.log(`  stablecoin.bridgeToChain(${CHAIN_SELECTORS.amoy}, recipient, amount)`);

  } else if (isAmoy) {
    console.log("Linking Amoy USDA to Sepolia...");
    console.log("─────────────────────────────────────");

    // Read Amoy address from deployment file
    const fs = require("fs");
    const path = require("path");
    const deploymentPath = path.join(__dirname, "../config/deployments/usda-stablecoin-amoy-latest.json");
    
    if (!fs.existsSync(deploymentPath)) {
      console.log("⚠ Amoy deployment file not found");
      return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const amoyUsdaAddress = deployment.contracts.usdaStablecoin;

    const stablecoin = USDAStablecoin.attach(amoyUsdaAddress);

    // Set Sepolia as allowed source chain
    console.log("Setting Sepolia as allowed source chain...");
    await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.sepolia, true)).wait();
    console.log("✓ Sepolia chain allowed");

    // Set Sepolia USDA as allowed sender
    console.log("Setting Sepolia USDA as allowed sender...");
    await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA, true)).wait();
    console.log("✓ Sepolia USDA allowed as sender");

    // Set Sepolia remote stablecoin
    console.log("Setting Sepolia remote stablecoin...");
    await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA)).wait();
    console.log("✓ Sepolia remote stablecoin set:", SEPOLIA_USDA);

    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║              AMOY LINKING COMPLETE                         ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();
    console.log("To bridge from Amoy to Sepolia:");
    console.log(`  stablecoin.bridgeToChain(${CHAIN_SELECTORS.sepolia}, recipient, amount)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
