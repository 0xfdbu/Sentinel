import { ethers } from "hardhat";

/**
 * Deploy USDAStablecoinV3 on Arbitrum Sepolia
 */

async function main() {
  console.log("=".repeat(70));
  console.log("DEPLOY USDA STABLECOIN V3 ON ARBITRUM SEPOLIA");
  console.log("=".repeat(70));
  
  const [deployer] = await ethers.getSigners();
  console.log("\n🔑 Deployer:", deployer.address);
  
  // Arbitrum Sepolia configuration
  const config = {
    policyEngine: process.env.POLICY_ENGINE || deployer.address,
    guardian: process.env.GUARDIAN || deployer.address,
    ccipRouter: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
    linkToken: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E", // Arbitrum Sepolia LINK
    mintCap: ethers.parseUnits("1000000000", 6),
    dailyMintLimit: ethers.parseUnits("10000000", 6)
  };
  
  console.log("\n📋 Configuration:");
  console.log("  Policy Engine:", config.policyEngine);
  console.log("  Guardian:", config.guardian);
  console.log("  CCIP Router:", config.ccipRouter);
  console.log("  LINK Token:", config.linkToken);
  
  // Deploy V3
  console.log("\n🚀 Deploying USDAStablecoinV3...");
  
  const USDAFactory = await ethers.getContractFactory("USDAStablecoinV3");
  const usda = await USDAFactory.deploy(
    config.policyEngine,
    config.guardian,
    config.ccipRouter,
    config.linkToken,
    config.mintCap,
    config.dailyMintLimit
  );
  
  await usda.waitForDeployment();
  const usdaAddress = await usda.getAddress();
  
  console.log("\n✅ USDAStablecoinV3 deployed on Arbitrum!");
  console.log("  Address:", usdaAddress);
  console.log("  Tx:", usda.deploymentTransaction()?.hash);
  
  // Set up Sepolia remote
  const SEPOLIA_SELECTOR = 16015286601757825753n;
  const SEPOLIA_USDA_V3 = "0xD39Ad078Daac04D58B6CC0d59dB9dBF8cA692c86"; // The one we just deployed
  
  console.log("\n🔗 Configuring Sepolia remote...");
  const setRemoteTx = await usda.setRemoteStablecoin(SEPOLIA_SELECTOR, SEPOLIA_USDA_V3);
  await setRemoteTx.wait();
  console.log("  Sepolia remote set:", SEPOLIA_USDA_V3);
  
  console.log("\n" + "=".repeat(70));
  console.log("ARBITRUM DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  
  console.log("\n📋 Addresses:");
  console.log(`  Sepolia V3: ${SEPOLIA_USDA_V3}`);
  console.log(`  Arbitrum V3: ${usdaAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
