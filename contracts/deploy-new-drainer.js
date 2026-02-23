const hre = require("hardhat");

const VAULT = "0x22650892Ce8db57fCDB48AE8b3508F52420A727A";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const SimpleDrainer = await hre.ethers.getContractFactory("SimpleDrainer");
  const drainer = await SimpleDrainer.deploy(VAULT);
  await drainer.waitForDeployment();
  
  console.log("SimpleDrainer deployed:", await drainer.getAddress());
  console.log("Target:", await drainer.target());
  console.log("Owner:", await drainer.owner());
}

main().catch(console.error);
