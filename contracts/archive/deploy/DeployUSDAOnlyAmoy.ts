/**
 * USDA Stablecoin Deployment for Amoy (Light Version)
 * 
 * Uses existing PolicyEngine and deploys only USDAStablecoin
 * 
 * Usage: POLICY_ENGINE=0x... npx hardhat run deploy/DeployUSDAOnlyAmoy.ts --network amoy
 */

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// CCIP ROUTER
const CCIP_ROUTER = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  amoy: 16281711391670634445n,
};

// INITIAL CONFIGURATION
const CONFIG = {
  mintCap: ethers.parseUnits("1000000000", 6),
  dailyMintLimit: ethers.parseUnits("10000000", 6),
  bridgeFeeBps: 30,
};

// SEPOLIA USDA ADDRESS
const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║        USDA DEPLOYMENT - AMOY (Light)                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AMOY");
  console.log();

  // Get PolicyEngine from environment or use a lightweight one
  const policyEngineAddress = process.env.POLICY_ENGINE;
  
  if (!policyEngineAddress) {
    console.log("⚠ Please set POLICY_ENGINE environment variable");
    console.log("Or run full deployment with more AMOY");
    console.log();
    console.log("Usage:");
    console.log("  POLICY_ENGINE=0x... npx hardhat run deploy/DeployUSDAOnlyAmoy.ts --network amoy");
    return;
  }

  console.log("Using PolicyEngine:", policyEngineAddress);
  console.log("CCIP Router:", CCIP_ROUTER);
  console.log();

  // ============================================================
  // Deploy USDAStablecoin
  // ============================================================
  console.log("Deploying USDAStablecoin...");
  console.log("─────────────────────────────");

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = await USDAStablecoin.deploy(
    policyEngineAddress,
    deployer.address,
    CCIP_ROUTER,
    CONFIG.mintCap,
    CONFIG.dailyMintLimit
  );
  await stablecoin.waitForDeployment();
  
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("✓ USDAStablecoin deployed:", stablecoinAddress);
  console.log();

  // ============================================================
  // Configure Stablecoin
  // ============================================================
  console.log("Configuring Stablecoin...");
  console.log("─────────────────────────────");

  await (await stablecoin.setBridgeFee(CONFIG.bridgeFeeBps)).wait();
  console.log("✓ Bridge fee set:", CONFIG.bridgeFeeBps / 100, "%");

  await (await stablecoin.setFeeCollector(deployer.address)).wait();
  console.log("✓ Fee collector set");

  await (await stablecoin.setACEEnforcement(true)).wait();
  console.log("✓ ACE enforcement enabled");
  console.log();

  // ============================================================
  // Link to Sepolia
  // ============================================================
  console.log("Linking to Sepolia...");
  console.log("───────────────────────");

  await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.sepolia, true)).wait();
  console.log("✓ Sepolia chain allowed");

  await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA, true)).wait();
  console.log("✓ Sepolia USDA allowed as sender");

  await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA)).wait();
  console.log("✓ Sepolia remote stablecoin set");
  console.log();

  // ============================================================
  // Test Mint
  // ============================================================
  console.log("Test Mint...");
  console.log("──────────────");

  try {
    const testMintAmount = ethers.parseUnits("1000", 6);
    await (await stablecoin.mint(deployer.address, testMintAmount)).wait();
    console.log("✓ Test mint:", ethers.formatUnits(testMintAmount, 6), "USDA");
    
    const balance = await stablecoin.balanceOf(deployer.address);
    console.log("  Balance:", ethers.formatUnits(balance, 6), "USDA");
  } catch (e: any) {
    console.log("⚠ Test mint failed:", e.message);
  }
  console.log();

  // ============================================================
  // SAVE DEPLOYMENT INFO
  // ============================================================
  const deploymentInfo = {
    network: network.name,
    chainId: chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      usdaStablecoin: stablecoinAddress,
      policyEngine: policyEngineAddress,
      ccipRouter: CCIP_ROUTER,
    },
    configuration: {
      mintCap: ethers.formatUnits(CONFIG.mintCap, 6),
      dailyMintLimit: ethers.formatUnits(CONFIG.dailyMintLimit, 6),
      bridgeFeeBps: CONFIG.bridgeFeeBps,
      decimals: 6,
      symbol: "USDA",
      name: "USDA Stablecoin",
    },
    crossChain: {
      sepoliaUsda: SEPOLIA_USDA,
      sepoliaChainSelector: CHAIN_SELECTORS.sepolia.toString(),
      amoyChainSelector: CHAIN_SELECTORS.amoy.toString(),
    },
    aceEnabled: true,
  };

  const deploymentsPath = join(__dirname, "../config/deployments");
  const filename = `usda-stablecoin-amoy-${Date.now()}.json`;
  writeFileSync(join(deploymentsPath, filename), JSON.stringify(deploymentInfo, null, 2));
  writeFileSync(join(deploymentsPath, "usda-stablecoin-amoy-latest.json"), JSON.stringify(deploymentInfo, null, 2));

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              AMOY DEPLOYMENT COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("USDA STABLECOIN (AMOY):");
  console.log("───────────────────────────");
  console.log("Address:", stablecoinAddress);
  console.log();
  console.log("CROSS-CHAIN BRIDGE ACTIVE!");
  console.log("Sepolia USDA:", SEPOLIA_USDA);
  console.log("Amoy USDA:", stablecoinAddress);
  console.log();
  console.log("To bridge Sepolia → Amoy:");
  console.log(`  stablecoin.bridgeToChain(${CHAIN_SELECTORS.amoy}n, recipient, amount)`);
  console.log();
  console.log("Next step: Link Sepolia to Amoy");
  console.log(`  AMOY_USDA=${stablecoinAddress} npx hardhat run deploy/SetupSepoliaForCrossChain.ts --network sepolia`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
