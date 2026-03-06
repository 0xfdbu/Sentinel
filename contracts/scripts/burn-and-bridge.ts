/**
 * Burn excess supply and test cross-chain bridge
 * 
 * Reduces supply to 100 USDA and tests bridging to Arbitrum Sepolia
 * 
 * Usage: npx hardhat run scripts/burn-and-bridge.ts --network sepolia
 */

import { ethers } from "hardhat";

// ADDRESSES
const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";
const ARBITRUM_SEPOLIA_USDA = "0xF3Afa65b8FB4BE87B2b01404E008C6b77bEB5292";

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  arbitrumSepolia: 3478487238524512106n,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     BURN & BRIDGE TEST                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(SEPOLIA_USDA);

  // Check current balance
  const currentBalance = await stablecoin.balanceOf(deployer.address);
  console.log("Current balance:", ethers.formatUnits(currentBalance, 6), "USDA");
  console.log("Total supply:", ethers.formatUnits(await stablecoin.totalSupply(), 6), "USDA");
  console.log();

  // Burn excess to get to 100 USDA
  const targetBalance = ethers.parseUnits("100", 6);
  if (currentBalance > targetBalance) {
    const burnAmount = currentBalance - targetBalance;
    console.log("Burning excess supply...");
    console.log("Amount to burn:", ethers.formatUnits(burnAmount, 6), "USDA");
    
    const tx = await stablecoin.burn(burnAmount);
    await tx.wait();
    console.log("✓ Burn successful");
    
    const newBalance = await stablecoin.balanceOf(deployer.address);
    console.log("New balance:", ethers.formatUnits(newBalance, 6), "USDA");
    console.log("New total supply:", ethers.formatUnits(await stablecoin.totalSupply(), 6), "USDA");
  } else {
    console.log("Balance already at or below 100 USDA, no burn needed");
  }
  console.log();

  // Get bridge fee estimate
  console.log("Getting bridge fee estimate...");
  const bridgeAmount = ethers.parseUnits("10", 6); // Bridge 10 USDA
  
  try {
    const [ccipFee, bridgeFee] = await stablecoin.getBridgeFeeEstimate(
      CHAIN_SELECTORS.arbitrumSepolia,
      deployer.address,
      bridgeAmount
    );
    
    console.log("Bridge fee estimate:");
    console.log("  CCIP Fee:", ethers.formatEther(ccipFee), "ETH");
    console.log("  Bridge Fee (USDA):", ethers.formatUnits(bridgeFee, 6), "USDA");
    console.log("  Amount to receive:", ethers.formatUnits(bridgeAmount - bridgeFee, 6), "USDA");
    console.log();

    // Check if we have enough for CCIP fee
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    console.log("ETH balance:", ethers.formatEther(ethBalance), "ETH");
    
    if (ethBalance < ccipFee) {
      console.log("⚠ Insufficient ETH for CCIP fee");
      return;
    }

    // Execute bridge
    console.log("Executing bridge to Arbitrum Sepolia...");
    console.log("Amount:", ethers.formatUnits(bridgeAmount, 6), "USDA");
    console.log("Destination:", deployer.address);
    
    const bridgeTx = await stablecoin.bridgeToChain(
      CHAIN_SELECTORS.arbitrumSepolia,
      deployer.address,
      bridgeAmount,
      { value: ccipFee }
    );
    
    console.log("Bridge transaction submitted:", bridgeTx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await bridgeTx.wait();
    console.log("✓ Bridge transaction confirmed!");
    console.log("  Block:", receipt?.blockNumber);
    console.log("  Gas used:", receipt?.gasUsed.toString());
    
    // Check new balance
    const finalBalance = await stablecoin.balanceOf(deployer.address);
    console.log();
    console.log("Sepolia balance after bridge:", ethers.formatUnits(finalBalance, 6), "USDA");
    console.log();
    console.log("Tokens are being bridged to Arbitrum Sepolia!");
    console.log("Check CCIP Explorer: https://ccip.chain.link/");
    
  } catch (e: any) {
    console.log("✗ Bridge failed:", e.message);
    if (e.data) {
      console.log("Error data:", e.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
