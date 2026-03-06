/**
 * USDA Stablecoin Deployment Script
 * 
 * Deploys ACE-compliant stablecoin with CCIP support
 * 
 * Usage: npx hardhat run deploy/DeployUSDAStablecoin.ts --network sepolia
 */

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// EXISTING DEPLOYMENTS
const EXISTING = {
  policyEngine: "0x62CC29A58404631B7db65CE14E366F63D3B96B16",
  guardian: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
  registry: "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9",
};

// CCIP ROUTER ADDRESSES (mainnet)
const CCIP_ROUTERS = {
  ethereum: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D", // Mainnet
  sepolia: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", // Sepolia testnet
  polygon: "0x849c5ED5a80F5B408Dd4969b8c3099fb53c298D0", // Polygon mainnet
  arbitrum: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8", // Arbitrum mainnet
  base: "0x673aa85bB42cd8Bd6745b9455b3a7995564D9dBd", // Base mainnet
};

// CHAIN SELECTORS (CCIP)
const CHAIN_SELECTORS = {
  ethereum: 5009297550715157269n,
  sepolia: 16015286601757825753n,
  polygon: 4051577828743386545n,
  arbitrum: 4949039107694359620n,
  base: 15971525489660198786n,
  optimism: 3734403246176062136n,
  avalanche: 6433500567565415381n,
};

// INITIAL CONFIGURATION
const CONFIG = {
  mintCap: ethers.parseUnits("1000000000", 6), // 1 billion USDA
  dailyMintLimit: ethers.parseUnits("10000000", 6), // 10 million per day
  bridgeFeeBps: 30, // 0.3%
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           USDA STABLECOIN DEPLOYMENT                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // Determine CCIP router based on chain
  let ccipRouter: string;
  if (chainId === 11155111n) {
    ccipRouter = CCIP_ROUTERS.sepolia;
    console.log("Using Sepolia CCIP Router");
  } else if (chainId === 1n) {
    ccipRouter = CCIP_ROUTERS.ethereum;
    console.log("Using Ethereum Mainnet CCIP Router");
  } else if (chainId === 137n) {
    ccipRouter = CCIP_ROUTERS.polygon;
    console.log("Using Polygon CCIP Router");
  } else {
    console.log("⚠ Unknown chain, please set CCIP router manually");
    ccipRouter = "0x0000000000000000000000000000000000000000";
  }
  
  console.log("CCIP Router:", ccipRouter);
  console.log();

  // ============================================================
  // STEP 1: Deploy USDAStablecoin
  // ============================================================
  console.log("STEP 1: Deploying USDAStablecoin");
  console.log("───────────────────────────────────");

  console.log("Deploying with configuration:");
  console.log("  - PolicyEngine:", EXISTING.policyEngine);
  console.log("  - Guardian:", EXISTING.guardian);
  console.log("  - CCIP Router:", ccipRouter);
  console.log("  - Mint Cap:", ethers.formatUnits(CONFIG.mintCap, 6), "USDA");
  console.log("  - Daily Mint Limit:", ethers.formatUnits(CONFIG.dailyMintLimit, 6), "USDA");
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = await USDAStablecoin.deploy(
    EXISTING.policyEngine,
    EXISTING.guardian,
    ccipRouter,
    CONFIG.mintCap,
    CONFIG.dailyMintLimit
  );
  await stablecoin.waitForDeployment();
  
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("✓ USDAStablecoin deployed:", stablecoinAddress);
  console.log();

  // ============================================================
  // STEP 2: Configure Stablecoin
  // ============================================================
  console.log("STEP 2: Configuring Stablecoin");
  console.log("────────────────────────────────");

  // Set bridge fee
  await (await stablecoin.setBridgeFee(CONFIG.bridgeFeeBps)).wait();
  console.log("✓ Bridge fee set:", CONFIG.bridgeFeeBps / 100, "%");

  // Set fee collector to deployer
  await (await stablecoin.setFeeCollector(deployer.address)).wait();
  console.log("✓ Fee collector set:", deployer.address);

  console.log();

  // ============================================================
  // STEP 3: Link to ACE Policies
  // ============================================================
  console.log("STEP 3: Linking to ACE Policies");
  console.log("─────────────────────────────────");

  // Register stablecoin in PolicyEngine as authorized contract
  const PolicyEngine = await ethers.getContractFactory("PolicyEngine");
  const policyEngine = PolicyEngine.attach(EXISTING.policyEngine);
  
  try {
    await (await policyEngine.authorizeSentinel(stablecoinAddress)).wait();
    console.log("✓ Stablecoin authorized as sentinel in PolicyEngine");
  } catch (e: any) {
    console.log("⚠ Could not authorize stablecoin (may already be authorized):", e.message);
  }

  // Enable ACE enforcement by default
  await (await stablecoin.setACEEnforcement(true)).wait();
  console.log("✓ ACE enforcement enabled");

  console.log();

  // ============================================================
  // STEP 4: Setup Cross-Chain Configuration
  // ============================================================
  console.log("STEP 4: Setting Up Cross-Chain Configuration");
  console.log("───────────────────────────────────────────────");

  // Add supported destination chains (example for Sepolia)
  if (chainId === 11155111n) {
    // On Sepolia, we can bridge to other testnets
    // For now, just log the configuration
    console.log("Available destination chains (Sepolia):");
    console.log("  - Mumbai (Polygon testnet):", CHAIN_SELECTORS.polygon);
    console.log("  - Arbitrum Sepolia:", CHAIN_SELECTORS.arbitrum);
    console.log("  - Base Sepolia:", CHAIN_SELECTORS.base);
    console.log();
    console.log("To enable bridging, call setRemoteStablecoin() for each chain:");
    console.log("  stablecoin.setRemoteStablecoin(chainSelector, remoteStablecoinAddress)");
  }

  console.log();

  // ============================================================
  // STEP 5: Test Mint (Optional)
  // ============================================================
  console.log("STEP 5: Test Operations");
  console.log("─────────────────────────");

  // Mint a small amount for testing
  const testMintAmount = ethers.parseUnits("1000", 6); // 1000 USDA
  try {
    await (await stablecoin.mint(deployer.address, testMintAmount)).wait();
    console.log("✓ Test mint:", ethers.formatUnits(testMintAmount, 6), "USDA");
    
    const balance = await stablecoin.balanceOf(deployer.address);
    console.log("  Deployer balance:", ethers.formatUnits(balance, 6), "USDA");
  } catch (e: any) {
    console.log("⚠ Test mint failed:", e.message);
  }

  // Check ACE compliance for a transfer
  try {
    const [compliant, reason] = await stablecoin.checkTransferCompliance.staticCall(
      deployer.address,
      "0x0000000000000000000000000000000000000001",
      ethers.parseUnits("100", 6)
    );
    console.log("✓ ACE compliance check:");
    console.log("  Compliant:", compliant);
    console.log("  Reason:", reason || "N/A");
  } catch (e: any) {
    console.log("⚠ ACE check failed:", e.message);
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
      policyEngine: EXISTING.policyEngine,
      guardian: EXISTING.guardian,
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
    chainSelectors: Object.fromEntries(
      Object.entries(CHAIN_SELECTORS).map(([k, v]) => [k, v.toString()])
    ),
    ccipRouters: CCIP_ROUTERS,
    aceEnabled: true,
  };

  const deploymentsPath = join(__dirname, "../config/deployments");
  const filename = `usda-stablecoin-${Date.now()}.json`;
  writeFileSync(
    join(deploymentsPath, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save as latest
  writeFileSync(
    join(deploymentsPath, "usda-stablecoin-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                 DEPLOYMENT COMPLETE                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("USDA STABLECOIN:");
  console.log("─────────────────");
  console.log("Address:", stablecoinAddress);
  console.log("Name: USDA Stablecoin");
  console.log("Symbol: USDA");
  console.log("Decimals: 6");
  console.log();
  console.log("CONFIGURATION:");
  console.log("───────────────");
  console.log("Mint Cap:", ethers.formatUnits(CONFIG.mintCap, 6), "USDA");
  console.log("Daily Mint Limit:", ethers.formatUnits(CONFIG.dailyMintLimit, 6), "USDA");
  console.log("Bridge Fee:", CONFIG.bridgeFeeBps / 100, "%");
  console.log("ACE Enforcement: Enabled");
  console.log();
  console.log("ACE INTEGRATION:");
  console.log("─────────────────");
  console.log("PolicyEngine:", EXISTING.policyEngine);
  console.log("Guardian:", EXISTING.guardian);
  console.log("CCIP Router:", ccipRouter);
  console.log();
  console.log("NEXT STEPS:");
  console.log("───────────");
  console.log("1. Update frontend .env:");
  console.log(`   VITE_USDA_STABLECOIN_ADDRESS=${stablecoinAddress}`);
  console.log();
  console.log("2. Configure remote chains for bridging:");
  console.log(`   stablecoin.setRemoteStablecoin(chainSelector, remoteAddress)`);
  console.log();
  console.log("3. Mint initial supply:");
  console.log(`   stablecoin.mint(recipient, amount)`);
  console.log();
  console.log("4. Test ACE compliance:");
  console.log(`   stablecoin.checkTransferCompliance(from, to, amount)`);
  console.log();
  console.log(`Deployment saved to: config/deployments/${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
