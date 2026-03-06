/**
 * Sentinel Bank Vault V2 Deployment Script
 * 
 * Deploys new Vault that mints USDA V2 tokens
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Sentinel Bank Vault V2...");
  console.log("Deployer:", deployer.address);

  // Configuration
  const CONFIG = {
    priceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD Sepolia
    policyEngine: "0x62CC29A58404631B7db65CE14E366F63D3B96B16",
    guardian: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
    creOracle: "0x9Eb4168b419F2311DaeD5eD8E072513520178f0C", // Deployer as oracle
    usdaToken: "0xCe732efd9A98DCC9956CC2f86a272E0a14789274", // USDA V2
  };

  console.log("\nConfiguration:");
  console.log("  Price Feed:", CONFIG.priceFeed);
  console.log("  Policy Engine:", CONFIG.policyEngine);
  console.log("  Guardian:", CONFIG.guardian);
  console.log("  CRE Oracle:", CONFIG.creOracle);
  console.log("  USDA Token:", CONFIG.usdaToken);

  // Deploy Vault V2
  const Vault = await ethers.getContractFactory("SentinelBankVaultV2");
  const vault = await Vault.deploy(
    CONFIG.priceFeed,
    CONFIG.policyEngine,
    CONFIG.guardian,
    CONFIG.creOracle,
    CONFIG.usdaToken
  );

  await vault.waitForDeployment();
  
  const vaultAddress = await vault.getAddress();
  console.log("\n✅ Vault V2 deployed!");
  console.log("  Address:", vaultAddress);
  console.log("  Transaction:", vault.deploymentTransaction()?.hash);

  // Verify configuration
  console.log("\nVerifying configuration...");
  const usdaToken = await vault.usdaToken();
  const creOracle = await vault.creOracle();
  console.log("  USDA Token:", usdaToken);
  console.log("  CRE Oracle:", creOracle);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("VAULT V2 DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Network: Sepolia");
  console.log("Vault V2 Address:", vaultAddress);
  console.log("USDA V2 Token:", CONFIG.usdaToken);
  console.log("\nKey Features:");
  console.log("  ✓ Mints USDA V2 tokens (not internal token)");
  console.log("  ✓ PoR verification via CRE");
  console.log("  ✓ ACE compliance checks");
  console.log("  ✓ Guardian pause integration");
  console.log("\nNext Steps:");
  console.log("  1. Update API server with new Vault address");
  console.log("  2. Grant MINTER_ROLE to Vault on USDA V2");
  console.log("  3. Test mint flow");
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
