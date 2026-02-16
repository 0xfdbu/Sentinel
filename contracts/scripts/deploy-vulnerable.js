// Deploy VulnerableVault for testing Sentinel
const hre = require("hardhat");

async function main() {
  console.log("Deploying VulnerableVault to Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy VulnerableVault
  const VulnerableVault = await hre.ethers.getContractFactory("VulnerableVault");
  const vault = await VulnerableVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("\n✅ VulnerableVault deployed to:", vaultAddress);
  console.log("\nContract Details:");
  console.log("  - Network: Sepolia");
  console.log("  - Address:", vault.address);
  console.log("  - Explorer: https://sepolia.etherscan.io/address/" + vault.address);
  console.log("\n⚠️  This contract is INTENTIONALLY VULNERABLE for testing!");
  console.log("   It contains reentrancy vulnerabilities in the withdraw() function.");

  // Verify contract on Etherscan (optional, might fail if key not set)
  try {
    console.log("\nVerifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: vaultAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    console.log("⚠️  Verification skipped or failed:", error.message);
  }

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "sepolia",
    contract: "VulnerableVault",
    address: vaultAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    vulnerable: true,
    vulnerabilities: [
      "Reentrancy in withdraw()",
      "No access control on emergencyWithdraw()",
      "Unchecked return value in riskyTransfer()"
    ]
  };
  
  fs.writeFileSync(
    './deployments/vulnerable-vault-sepolia.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to: deployments/vulnerable-vault-sepolia.json");
  
  return vaultAddress;
}

main()
  .then((address) => {
    console.log("\n🎯 You can now test Sentinel by scanning:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
