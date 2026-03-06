/**
 * Setup Sepolia for Cross-Chain Bridging
 * 
 * Configures Sepolia USDA to be ready for cross-chain bridging
 * Run this after deploying on Amoy
 * 
 * Usage: AMOY_USDA=0x... npx hardhat run deploy/SetupSepoliaForCrossChain.ts --network sepolia
 */

import { ethers } from "hardhat";

// SEPOLIA USDA ADDRESS
const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  amoy: 16281711391670634445n,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     SETUP SEPOLIA FOR CROSS-CHAIN BRIDGING                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  // Get AMOY_USDA from environment
  const AMOY_USDA = process.env.AMOY_USDA;
  
  if (!AMOY_USDA) {
    console.log("⚠ Please set AMOY_USDA environment variable");
    console.log();
    console.log("Usage:");
    console.log("  AMOY_USDA=0x... npx hardhat run deploy/SetupSepoliaForCrossChain.ts --network sepolia");
    console.log();
    console.log("To deploy on Amoy first (you'll need AMOY testnet MATIC):");
    console.log("  npx hardhat run deploy/DeployUSDAStablecoinMumbai.ts --network amoy");
    return;
  }

  console.log("Linking Sepolia USDA to Amoy...");
  console.log("─────────────────────────────────────");
  console.log("Sepolia USDA:", SEPOLIA_USDA);
  console.log("Amoy USDA:", AMOY_USDA);
  console.log("Amoy Chain Selector:", CHAIN_SELECTORS.amoy.toString());
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(SEPOLIA_USDA);

  // Check current configuration
  console.log("Current Configuration:");
  const currentRemote = await stablecoin.remoteStablecoins(CHAIN_SELECTORS.amoy);
  console.log("  Remote stablecoin on Amoy:", currentRemote === ethers.ZeroAddress ? "Not set" : currentRemote);
  
  const isSourceAllowed = await stablecoin.allowedSourceChains(CHAIN_SELECTORS.amoy);
  console.log("  Amoy allowed as source:", isSourceAllowed);
  
  const isSenderAllowed = await stablecoin.allowedSenders(CHAIN_SELECTORS.amoy, AMOY_USDA);
  console.log("  Amoy USDA allowed as sender:", isSenderAllowed);
  console.log();

  // Set Amoy as allowed source chain
  if (!isSourceAllowed) {
    console.log("Setting Amoy as allowed source chain...");
    await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.amoy, true)).wait();
    console.log("✓ Amoy chain allowed as source");
  }

  // Set Amoy USDA as allowed sender
  if (!isSenderAllowed) {
    console.log("Setting Amoy USDA as allowed sender...");
    await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.amoy, AMOY_USDA, true)).wait();
    console.log("✓ Amoy USDA allowed as sender");
  }

  // Set Amoy remote stablecoin
  if (currentRemote === ethers.ZeroAddress) {
    console.log("Setting Amoy remote stablecoin...");
    await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.amoy, AMOY_USDA)).wait();
    console.log("✓ Amoy remote stablecoin set");
  }

  console.log();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              SEPOLIA SETUP COMPLETE                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Cross-chain bridge is now ACTIVE!");
  console.log();
  console.log("Bridge Configuration:");
  console.log("  Sepolia USDA:", SEPOLIA_USDA);
  console.log("  Amoy USDA:", AMOY_USDA);
  console.log("  Amoy Chain Selector:", CHAIN_SELECTORS.amoy.toString());
  console.log();
  console.log("To bridge from Sepolia to Amoy:");
  console.log(`  await stablecoin.bridgeToChain(${CHAIN_SELECTORS.amoy}n, "0xRecipient", ethers.parseUnits("100", 6), { value: ethers.parseEther("0.01") })`);
  console.log();
  console.log("To bridge from Amoy to Sepolia:");
  console.log("  Run the same setup script on Amoy network:");
  console.log("    npx hardhat run deploy/SetupSepoliaForCrossChain.ts --network amoy");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
