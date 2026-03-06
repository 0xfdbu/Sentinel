/**
 * Link Sepolia to Arbitrum Sepolia for Cross-Chain Bridging
 * 
 * Usage: ARBITRUM_SEPOLIA_USDA=0x... npx hardhat run deploy/LinkSepoliaToArbitrum.ts --network sepolia
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
  console.log("║     LINK SEPOLIA TO ARBITRUM SEPOLIA                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  // Get ARBITRUM_SEPOLIA_USDA from environment
  const ARBITRUM_SEPOLIA_USDA = process.env.ARBITRUM_SEPOLIA_USDA;
  
  if (!ARBITRUM_SEPOLIA_USDA) {
    console.log("⚠ Please set ARBITRUM_SEPOLIA_USDA environment variable");
    console.log();
    console.log("Usage:");
    console.log("  ARBITRUM_SEPOLIA_USDA=0x... npx hardhat run deploy/LinkSepoliaToArbitrum.ts --network sepolia");
    return;
  }

  console.log("Linking Sepolia USDA to Arbitrum Sepolia...");
  console.log("─────────────────────────────────────────────");
  console.log("Sepolia USDA:", SEPOLIA_USDA);
  console.log("Arbitrum Sepolia USDA:", ARBITRUM_SEPOLIA_USDA);
  console.log("Arbitrum Sepolia Chain Selector:", CHAIN_SELECTORS.arbitrumSepolia.toString());
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(SEPOLIA_USDA);

  // Check current configuration
  console.log("Current Configuration:");
  const currentRemote = await stablecoin.remoteStablecoins(CHAIN_SELECTORS.arbitrumSepolia);
  console.log("  Remote stablecoin:", currentRemote === ethers.ZeroAddress ? "Not set" : currentRemote);
  
  const isSourceAllowed = await stablecoin.allowedSourceChains(CHAIN_SELECTORS.arbitrumSepolia);
  console.log("  Arbitrum Sepolia allowed as source:", isSourceAllowed);
  
  const isSenderAllowed = await stablecoin.allowedSenders(CHAIN_SELECTORS.arbitrumSepolia, ARBITRUM_SEPOLIA_USDA);
  console.log("  Arbitrum Sepolia USDA allowed as sender:", isSenderAllowed);
  console.log();

  // Set Arbitrum Sepolia as allowed source chain
  if (!isSourceAllowed) {
    console.log("Setting Arbitrum Sepolia as allowed source chain...");
    await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.arbitrumSepolia, true)).wait();
    console.log("✓ Arbitrum Sepolia chain allowed as source");
  }

  // Set Arbitrum Sepolia USDA as allowed sender
  if (!isSenderAllowed) {
    console.log("Setting Arbitrum Sepolia USDA as allowed sender...");
    await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.arbitrumSepolia, ARBITRUM_SEPOLIA_USDA, true)).wait();
    console.log("✓ Arbitrum Sepolia USDA allowed as sender");
  }

  // Set Arbitrum Sepolia remote stablecoin
  if (currentRemote === ethers.ZeroAddress) {
    console.log("Setting Arbitrum Sepolia remote stablecoin...");
    await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.arbitrumSepolia, ARBITRUM_SEPOLIA_USDA)).wait();
    console.log("✓ Arbitrum Sepolia remote stablecoin set");
  }

  console.log();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              SEPOLIA LINKING COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("✅ CROSS-CHAIN BRIDGE IS NOW ACTIVE!");
  console.log();
  console.log("Bridge Configuration:");
  console.log("  Sepolia USDA:", SEPOLIA_USDA);
  console.log("  Arbitrum Sepolia USDA:", ARBITRUM_SEPOLIA_USDA);
  console.log();
  console.log("To bridge Sepolia → Arbitrum Sepolia:");
  console.log(`  await stablecoin.bridgeToChain(${CHAIN_SELECTORS.arbitrumSepolia}n, "0xRecipient", ethers.parseUnits("100", 6), { value: ethers.parseEther("0.01") })`);
  console.log();
  console.log("To bridge Arbitrum Sepolia → Sepolia:");
  console.log(`  await stablecoin.bridgeToChain(${CHAIN_SELECTORS.sepolia}n, "0xRecipient", ethers.parseUnits("100", 6), { value: ethers.parseEther("0.01") })`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
