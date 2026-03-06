/**
 * Check Arbitrum Sepolia USDA Balance
 * 
 * Usage: npx hardhat run scripts/check-arbitrum-balance.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

const ARBITRUM_SEPOLIA_USDA = "0xF3Afa65b8FB4BE87B2b01404E008C6b77bEB5292";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     CHECK ARBITRUM SEPOLIA BALANCE                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Address:", deployer.address);
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(ARBITRUM_SEPOLIA_USDA);

  const balance = await stablecoin.balanceOf(deployer.address);
  const totalSupply = await stablecoin.totalSupply();
  
  console.log("USDA Balance:", ethers.formatUnits(balance, 6), "USDA");
  console.log("Total Supply:", ethers.formatUnits(totalSupply, 6), "USDA");
  console.log();
  
  if (balance > 0) {
    console.log("✅ Tokens have arrived on Arbitrum Sepolia!");
  } else {
    console.log("⏳ Waiting for tokens to arrive...");
    console.log("Check CCIP Explorer: https://ccip.chain.link/");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
