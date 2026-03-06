/**
 * Burn excess on Arbitrum Sepolia and bridge back to Sepolia
 * 
 * Usage: npx hardhat run scripts/burn-and-bridge-back.ts --network arbitrumSepolia
 */

import { ethers } from "hardhat";

const ARBITRUM_SEPOLIA_USDA = "0xF3Afa65b8FB4BE87B2b01404E008C6b77bEB5292";

const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  arbitrumSepolia: 3478487238524512106n,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     BURN & BRIDGE BACK TO SEPOLIA                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network: Arbitrum Sepolia");
  console.log("Address:", deployer.address);
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(ARBITRUM_SEPOLIA_USDA);

  // Check current balance
  const currentBalance = await stablecoin.balanceOf(deployer.address);
  console.log("Current balance:", ethers.formatUnits(currentBalance, 6), "USDA");
  
  // Burn excess to get to 100 USDA
  const targetBalance = ethers.parseUnits("100", 6);
  if (currentBalance > targetBalance) {
    const burnAmount = currentBalance - targetBalance;
    console.log("Burning excess supply...");
    console.log("Amount to burn:", ethers.formatUnits(burnAmount, 6), "USDA");
    
    const tx = await stablecoin.burn(burnAmount);
    await tx.wait();
    console.log("✓ Burn successful");
  }
  
  const newBalance = await stablecoin.balanceOf(deployer.address);
  console.log("Balance after burn:", ethers.formatUnits(newBalance, 6), "USDA");
  console.log();

  // Bridge back to Sepolia
  const bridgeAmount = ethers.parseUnits("5", 6); // Bridge 5 USDA back
  console.log("Bridging", ethers.formatUnits(bridgeAmount, 6), "USDA back to Sepolia...");
  
  try {
    const [ccipFee] = await stablecoin.getBridgeFeeEstimate(
      CHAIN_SELECTORS.sepolia,
      deployer.address,
      bridgeAmount
    );
    
    console.log("CCIP Fee:", ethers.formatEther(ccipFee), "ETH");
    
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    console.log("ETH balance:", ethers.formatEther(ethBalance), "ETH");
    
    if (ethBalance < ccipFee) {
      console.log("⚠ Insufficient ETH for CCIP fee");
      return;
    }

    const bridgeTx = await stablecoin.bridgeToChain(
      CHAIN_SELECTORS.sepolia,
      deployer.address,
      bridgeAmount,
      { value: ccipFee }
    );
    
    console.log("Bridge transaction submitted:", bridgeTx.hash);
    const receipt = await bridgeTx.wait();
    
    console.log("✓ Bridge transaction confirmed!");
    console.log("  Block:", receipt?.blockNumber);
    
    const finalBalance = await stablecoin.balanceOf(deployer.address);
    console.log("Arbitrum Sepolia balance after bridge:", ethers.formatUnits(finalBalance, 6), "USDA");
    console.log();
    console.log("Tokens are being bridged back to Sepolia!");
    
  } catch (e: any) {
    console.log("✗ Bridge failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
