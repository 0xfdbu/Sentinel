/**
 * USDA Stablecoin Deployment Script for Mumbai (Polygon Testnet)
 * 
 * Deploys ACE-compliant stablecoin with CCIP support on Mumbai
 * 
 * Usage: npx hardhat run deploy/DeployUSDAStablecoinMumbai.ts --network amoy
 */

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// CCIP ROUTER ADDRESSES
const CCIP_ROUTERS = {
  amoy: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", // Amoy testnet (same as Sepolia for testing)
};

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  amoy: 16281711391670634445n, // Amoy testnet
};

// INITIAL CONFIGURATION
const CONFIG = {
  mintCap: ethers.parseUnits("1000000000", 6), // 1 billion USDA
  dailyMintLimit: ethers.parseUnits("10000000", 6), // 10 million per day
  bridgeFeeBps: 30, // 0.3%
};

// SEPOLIA USDA ADDRESS (to link)
const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║        USDA STABLECOIN DEPLOYMENT - AMOY                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");
  console.log();

  const ccipRouter = CCIP_ROUTERS.amoy;
  console.log("Using Amoy CCIP Router:", ccipRouter);
  console.log();

  // ============================================================
  // STEP 1: Deploy PolicyEngine (simplified for Mumbai)
  // ============================================================
  console.log("STEP 1: Deploying PolicyEngine");
  console.log("─────────────────────────────────");

  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = await PolicyEngine.deploy();
  await policyEngine.waitForDeployment();
  const policyEngineAddress = await policyEngine.getAddress();
  console.log("✓ PolicyEngine deployed:", policyEngineAddress);
  console.log();

  // ============================================================
  // STEP 2: Deploy BlacklistPolicy
  // ============================================================
  console.log("STEP 2: Deploying BlacklistPolicy");
  console.log("───────────────────────────────────");

  const BlacklistPolicy = await ethers.getContractFactory("AddressBlacklistPolicy");
  const blacklistPolicy = await BlacklistPolicy.deploy();
  await blacklistPolicy.waitForDeployment();
  const blacklistAddress = await blacklistPolicy.getAddress();
  console.log("✓ BlacklistPolicy deployed:", blacklistAddress);

  // Add blacklist policy to engine
  await (await policyEngine.addPolicy(blacklistAddress, 100)).wait();
  console.log("✓ BlacklistPolicy added to PolicyEngine");
  console.log();

  // ============================================================
  // STEP 3: Deploy USDAStablecoin
  // ============================================================
  console.log("STEP 3: Deploying USDAStablecoin");
  console.log("───────────────────────────────────");

  console.log("Deploying with configuration:");
  console.log("  - PolicyEngine:", policyEngineAddress);
  console.log("  - Guardian:", deployer.address);
  console.log("  - CCIP Router:", ccipRouter);
  console.log("  - Mint Cap:", ethers.formatUnits(CONFIG.mintCap, 6), "USDA");
  console.log("  - Daily Mint Limit:", ethers.formatUnits(CONFIG.dailyMintLimit, 6), "USDA");
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = await USDAStablecoin.deploy(
    policyEngineAddress,
    deployer.address, // Use deployer as guardian
    ccipRouter,
    CONFIG.mintCap,
    CONFIG.dailyMintLimit
  );
  await stablecoin.waitForDeployment();
  
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("✓ USDAStablecoin deployed:", stablecoinAddress);
  console.log();

  // ============================================================
  // STEP 4: Configure Stablecoin
  // ============================================================
  console.log("STEP 4: Configuring Stablecoin");
  console.log("────────────────────────────────");

  // Set bridge fee
  await (await stablecoin.setBridgeFee(CONFIG.bridgeFeeBps)).wait();
  console.log("✓ Bridge fee set:", CONFIG.bridgeFeeBps / 100, "%");

  // Set fee collector to deployer
  await (await stablecoin.setFeeCollector(deployer.address)).wait();
  console.log("✓ Fee collector set:", deployer.address);

  // Enable ACE enforcement
  await (await stablecoin.setACEEnforcement(true)).wait();
  console.log("✓ ACE enforcement enabled");

  console.log();

  // ============================================================
  // STEP 5: Link to Sepolia
  // ============================================================
  console.log("STEP 5: Linking to Sepolia");
  console.log("─────────────────────────────");

  // Set Sepolia as allowed source chain
  await (await stablecoin.setSourceChainAllowed(CHAIN_SELECTORS.sepolia, true)).wait();
  console.log("✓ Sepolia chain allowed as source");

  // Set Sepolia USDA as allowed sender
  await (await stablecoin.setSourceSenderAllowed(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA, true)).wait();
  console.log("✓ Sepolia USDA set as allowed sender");

  // Set Sepolia remote stablecoin
  await (await stablecoin.setRemoteStablecoin(CHAIN_SELECTORS.sepolia, SEPOLIA_USDA)).wait();
  console.log("✓ Sepolia remote stablecoin set:", SEPOLIA_USDA);

  console.log();

  // ============================================================
  // STEP 6: Test Mint
  // ============================================================
  console.log("STEP 6: Test Operations");
  console.log("─────────────────────────");

  const testMintAmount = ethers.parseUnits("1000", 6);
  try {
    await (await stablecoin.mint(deployer.address, testMintAmount)).wait();
    console.log("✓ Test mint:", ethers.formatUnits(testMintAmount, 6), "USDA");
    
    const balance = await stablecoin.balanceOf(deployer.address);
    console.log("  Deployer balance:", ethers.formatUnits(balance, 6), "USDA");
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
      blacklistPolicy: blacklistAddress,
      ccipRouter: ccipRouter,
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
  writeFileSync(
    join(deploymentsPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  writeFileSync(
    join(deploymentsPath, "usda-stablecoin-amoy-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              AMOY DEPLOYMENT COMPLETE                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("USDA STABLECOIN (AMOY):");
  console.log("───────────────────────────");
  console.log("Address:", stablecoinAddress);
  console.log("Name: USDA Stablecoin");
  console.log("Symbol: USDA");
  console.log("Decimals: 6");
  console.log();
  console.log("CROSS-CHAIN CONFIGURATION:");
  console.log("───────────────────────────");
  console.log("Sepolia USDA:", SEPOLIA_USDA);
  console.log("Amoy USDA:", stablecoinAddress);
  console.log("Sepolia Chain Selector:", CHAIN_SELECTORS.sepolia.toString());
  console.log("Amoy Chain Selector:", CHAIN_SELECTORS.amoy.toString());
  console.log();
  console.log("NEXT STEPS:");
  console.log("───────────");
  console.log("1. Update Sepolia contract to link Mumbai:");
  console.log(`   npx hardhat run deploy/LinkCrossChain.ts --network sepolia`);
  console.log();
  console.log("2. Test bridge from Sepolia to Mumbai:");
  console.log(`   stablecoin.bridgeToChain(${CHAIN_SELECTORS.mumbai}, recipient, amount)`);
  console.log();
  console.log(`Deployment saved to: config/deployments/${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
