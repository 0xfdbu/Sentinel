import { ethers } from "hardhat";

/**
 * Deploy USDAStablecoinV3 with LINK-based CCIP bridging
 * This follows Chainlink best practices and should work reliably
 */

async function main() {
  console.log("=".repeat(70));
  console.log("DEPLOY USDA STABLECOIN V3 (LINK-BASED CCIP)");
  console.log("=".repeat(70));
  
  const [deployer] = await ethers.getSigners();
  console.log("\n🔑 Deployer:", deployer.address);
  
  // Sepolia configuration
  const config = {
    policyEngine: process.env.POLICY_ENGINE || deployer.address, // Use deployer if no policy engine
    guardian: process.env.GUARDIAN || deployer.address,
    ccipRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    mintCap: ethers.parseUnits("1000000000", 6), // 1B USDA
    dailyMintLimit: ethers.parseUnits("10000000", 6) // 10M USDA/day
  };
  
  console.log("\n📋 Configuration:");
  console.log("  Policy Engine:", config.policyEngine);
  console.log("  Guardian:", config.guardian);
  console.log("  CCIP Router:", config.ccipRouter);
  console.log("  LINK Token:", config.linkToken);
  console.log("  Mint Cap:", ethers.formatUnits(config.mintCap, 6), "USDA");
  console.log("  Daily Limit:", ethers.formatUnits(config.dailyMintLimit, 6), "USDA");
  
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
  
  console.log("\n✅ USDAStablecoinV3 deployed!");
  console.log("  Address:", usdaAddress);
  console.log("  Tx:", usda.deploymentTransaction()?.hash);
  
  // Set up Arbitrum remote
  const ARBITRUM_SELECTOR = 3478487238524512106n;
  const ARBITRUM_USDA_V2 = "0x7e2e8Ea8aCE3FE85aed208638d8d3aC93E3eeca6"; // Current Arbitrum V2
  
  console.log("\n🔗 Configuring Arbitrum remote...");
  const setRemoteTx = await usda.setRemoteStablecoin(ARBITRUM_SELECTOR, ARBITRUM_USDA_V2);
  await setRemoteTx.wait();
  console.log("  Arbitrum remote set:", ARBITRUM_USDA_V2);
  
  // Grant MINTER_ROLE to Vault V2
  const VAULT_V2 = "0xDBF3C1D3CEC639C0a9Ed3d40946076a9Bc042c45";
  console.log("\n🔑 Granting MINTER_ROLE to Vault V2...");
  const grantTx = await usda.grantRole(await usda.MINTER_ROLE(), VAULT_V2);
  await grantTx.wait();
  console.log("  Vault V2 can now mint USDA V3");
  
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log("\nNext steps:");
  console.log("1. Update Vault V2 to point to new USDA V3");
  console.log("2. Deploy USDA V3 on Arbitrum with Sepolia remote");
  console.log("3. Test bridge with LINK fees");
  console.log("4. Update frontend addresses");
  
  console.log("\n📋 Add to .env:");
  console.log(`VITE_USDA_STABLECOIN_ADDRESS_V3=${usdaAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
