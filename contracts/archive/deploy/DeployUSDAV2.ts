/**
 * USDA V2 Deployment Script
 * 
 * Deploys new USDA with PAUSER_ROLE support
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying USDA V2 with PAUSER_ROLE support...");
  console.log("Deployer:", deployer.address);

  // Sepolia configuration
  const CONFIG = {
    policyEngine: "0x62CC29A58404631B7db65CE14E366F63D3B96B16",
    guardian: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
    ccipRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    mintCap: ethers.parseUnits("1000000000", 6), // 1B USDA
    dailyMintLimit: ethers.parseUnits("10000000", 6), // 10M USDA/day
  };

  console.log("\nConfiguration:");
  console.log("  PolicyEngine:", CONFIG.policyEngine);
  console.log("  Guardian:", CONFIG.guardian);
  console.log("  CCIP Router:", CONFIG.ccipRouter);
  console.log("  Mint Cap:", ethers.formatUnits(CONFIG.mintCap, 6), "USDA");
  console.log("  Daily Mint Limit:", ethers.formatUnits(CONFIG.dailyMintLimit, 6), "USDA");

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
  console.log("\n✅ USDA V2 deployed!");
  console.log("  Address:", usdaAddress);
  console.log("  Transaction:", usda.deploymentTransaction()?.hash);

  // Verify roles are set correctly
  console.log("\nVerifying roles...");
  const PAUSER_ROLE = await usda.PAUSER_ROLE();
  const hasGuardianRole = await usda.hasRole(PAUSER_ROLE, CONFIG.guardian);
  console.log("  PAUSER_ROLE:", PAUSER_ROLE);
  console.log("  Guardian has PAUSER_ROLE:", hasGuardianRole);

  // Set up remote stablecoin for Arbitrum Sepolia
  console.log("\nSetting up Arbitrum Sepolia bridge...");
  const ARBITRUM_CHAIN_SELECTOR = 3478487238524512106n;
  const ARBITRUM_USDA = "0xF3Afa65b8FB4BE87B2b01404E008C6b77bEB5292"; // Old USDA on Arb
  
  try {
    const tx = await usda.setRemoteStablecoin(ARBITRUM_CHAIN_SELECTOR, ARBITRUM_USDA);
    await tx.wait();
    console.log("  Arbitrum bridge configured ✓");
  } catch (error) {
    console.log("  Arbitrum bridge setup skipped (will need to be done manually)");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Network: Sepolia");
  console.log("USDA V2 Address:", usdaAddress);
  console.log("\nKey Features:");
  console.log("  ✓ PAUSER_ROLE (Guardian can pause without full ownership)");
  console.log("  ✓ AccessControl (separate roles for mint/pause/admin)");
  console.log("  ✓ CCIP Bridge enabled");
  console.log("  ✓ ACE Policy enforcement");
  console.log("  ✓ OpenZeppelin Pausable");
  console.log("\nNext Steps:");
  console.log("  1. Update frontend .env with new address");
  console.log("  2. Verify on Etherscan");
  console.log("  3. Register with Sentinel Guardian");
  console.log("  4. Test pause functionality");
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
