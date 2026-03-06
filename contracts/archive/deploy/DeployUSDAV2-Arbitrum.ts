/**
 * USDA V2 Deployment Script - Arbitrum Sepolia
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying USDA V2 on Arbitrum Sepolia...");
  console.log("Deployer:", deployer.address);

  // Arbitrum Sepolia configuration
  const CONFIG = {
    policyEngine: "0xfE9dF59f292098962E7C6FA7F2630FaE44E94798", // Arb PolicyEngine
    guardian: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1", // Same Guardian
    ccipRouter: "0x2a9c5afb0d0e4bab2bcdae109ec4b0c4be15a165", // Arb CCIP Router
    mintCap: ethers.parseUnits("1000000000", 6), // 1B USDA
    dailyMintLimit: ethers.parseUnits("10000000", 6), // 10M USDA/day
  };

  console.log("\nConfiguration:");
  console.log("  PolicyEngine:", CONFIG.policyEngine);
  console.log("  Guardian:", CONFIG.guardian);
  console.log("  CCIP Router:", CONFIG.ccipRouter);

  // Deploy USDA V2
  const USDA = await ethers.getContractFactory("USDAStablecoinV2");
  const usda = await USDA.deploy(
    CONFIG.policyEngine,
    CONFIG.guardian,
    CONFIG.ccipRouter,
    CONFIG.mintCap,
    CONFIG.dailyMintLimit
  );

  await usda.waitForDeployment();
  
  const usdaAddress = await usda.getAddress();
  console.log("\n✅ USDA V2 deployed on Arbitrum Sepolia!");
  console.log("  Address:", usdaAddress);

  // Verify roles
  console.log("\nVerifying roles...");
  const hasGuardianRole = await usda.hasRole(await usda.PAUSER_ROLE(), CONFIG.guardian);
  console.log("  Guardian has PAUSER_ROLE:", hasGuardianRole);

  // Link to Sepolia
  console.log("\nSetting up Sepolia bridge...");
  const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n;
  const SEPOLIA_USDA_V2 = "0xCe732efd9A98DCC9956CC2f86a272E0a14789274";
  
  try {
    const tx = await usda.setRemoteStablecoin(SEPOLIA_CHAIN_SELECTOR, SEPOLIA_USDA_V2);
    await tx.wait();
    console.log("  Sepolia bridge configured ✓");
  } catch (error) {
    console.log("  Sepolia bridge setup failed (may need to do manually)");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("ARB SEPOLIA DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("USDA V2 Address:", usdaAddress);
  console.log("Update DEPLOYMENT_SUMMARY.md with this address!");
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
