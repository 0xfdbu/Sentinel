/**
 * Link Arbitrum Sepolia to Sepolia for Cross-Chain Bridging
 * 
 * Usage: npx hardhat run deploy/LinkArbitrumToSepolia.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

// SEPOLIA USDA ADDRESS
const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  arbitrumSepolia: 3478487238524512106n,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     LINK ARBITRUM SEPOLIA TO SEPOLIA                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  // Read Arbitrum Sepolia address from deployment file
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "../config/deployments/usda-stablecoin-arbitrum-sepolia-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.log("⚠ Arbitrum Sepolia deployment file not found");
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const arbitrumSepoliaUsdaAddress = deployment.contracts.usdaStablecoin;

  console.log("Linking Arbitrum Sepolia USDA to Sepolia...");
  console.log("─────────────────────────────────────────────");
  console.log("Sepolia USDA:", SEPOLIA_USDA);
  console.log("Arbitrum Sepolia USDA:", arbitrumSepoliaUsdaAddress);
  console.log("Sepolia Chain Selector:", CHAIN_SELECTORS.sepolia.toString());
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(arbitrumSepoliaUsdaAddress);

  // Check current configuration
  console.log("Current Configuration:");
  const currentRemote = await stablecoin.remoteStablecoins(CHAIN_SELECTORS.sepolia);
  console.log("  Remote stablecoin:", currentRemote === ethers.ZeroAddress ? "Not set" : currentRemote);
  
  const isSourceAllowed = await stablecoin.allowedSourceChains(CHAIN_SELECTORS.sepolia);
  console.log("  Sepolia allowed as source:", isSourceAllowed);
  
  const isSenderAllowed = await stablecoin.allowedSenders(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA);
  console.log("  Sepolia USDA allowed as sender:", isSenderAllowed);
  console.log();

  // Set Sepolia as allowed source chain
  if (!isSourceAllowed) {
    console.log("Setting Sepolia as allowed source chain...");
    await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.sepolia, true)).wait();
    console.log("✓ Sepolia chain allowed as source");
  }

  // Set Sepolia USDA as allowed sender
  if (!isSenderAllowed) {
    console.log("Setting Sepolia USDA as allowed sender...");
    await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA, true)).wait();
    console.log("✓ Sepolia USDA allowed as sender");
  }

  // Set Sepolia remote stablecoin
  if (currentRemote === ethers.ZeroAddress) {
    console.log("Setting Sepolia remote stablecoin...");
    await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA)).wait();
    console.log("✓ Sepolia remote stablecoin set");
  }

  console.log();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         ARBITRUM SEPOLIA LINKING COMPLETE                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("✅ BIDIRECTIONAL CROSS-CHAIN BRIDGE IS NOW ACTIVE!");
  console.log();
  console.log("Bridge Configuration:");
  console.log("  Sepolia USDA:", SEPOLIA_USDA);
  console.log("  Arbitrum Sepolia USDA:", arbitrumSepoliaUsdaAddress);
  console.log();
  console.log("To bridge Arbitrum Sepolia → Sepolia:");
  console.log(`  await stablecoin.bridgeToChain(${CHAIN_SELECTORS.sepolia}n, "0xRecipient", ethers.parseUnits("100", 6), { value: ethers.parseEther("0.001") })`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
