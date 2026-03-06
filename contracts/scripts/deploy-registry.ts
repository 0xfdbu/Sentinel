/**
 * Deploy Sentinel Registry
 * 
 * New deployment for fresh wallet
 */

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     DEPLOY SENTINEL REGISTRY                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // Deploy SentinelRegistry
  console.log("Deploying SentinelRegistry...");
  const SentinelRegistry = await ethers.getContractFactory("SentinelRegistry");
  const registry = await SentinelRegistry.deploy();
  await registry.waitForDeployment();
  
  const registryAddress = await registry.getAddress();
  console.log("✓ SentinelRegistry deployed:", registryAddress);
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      registry: registryAddress
    }
  };

  const configPath = join(__dirname, "../config/deployments");
  writeFileSync(
    join(configPath, "registry-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     DEPLOYMENT COMPLETE                                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("New SentinelRegistry:", registryAddress);
  console.log();
  console.log("Next steps:");
  console.log("1. Update frontend with new registry address");
  console.log("2. Deploy Guardian contract (optional)");
  console.log("3. Authorize Sentinel nodes");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
