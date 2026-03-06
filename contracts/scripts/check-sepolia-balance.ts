import { ethers } from "hardhat";

const SEPOLIA_USDA = "0x7d87f190256800589014391ce41Cb494bb970ea5";

async function main() {
  const [deployer] = await ethers.getSigners();
  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(SEPOLIA_USDA);

  const balance = await stablecoin.balanceOf(deployer.address);
  const totalSupply = await stablecoin.totalSupply();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     SEPOLIA BALANCE                                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("Address:", deployer.address);
  console.log("Balance:", ethers.formatUnits(balance, 6), "USDA");
  console.log("Total Supply:", ethers.formatUnits(totalSupply, 6), "USDA");
}

main().then(() => process.exit(0)).catch(console.error);
