// Deploy PausableVulnerableVault for testing Sentinel
const hre = require("hardhat");

async function main() {
  console.log("Deploying PausableVulnerableVault to Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy PausableVulnerableVault
  // This contract is intentionally vulnerable to reentrancy attacks
  const VulnerableVault = await hre.ethers.getContractFactory("PausableVulnerableVault");
  
  // Deploy with a mock ERC20 token as the asset
  console.log("  Deploying MockERC20 token...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Mock DAI", "mDAI", 18);
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log("  MockERC20 deployed:", tokenAddress);
  
  // Deploy vault with the token as asset
  console.log("  Deploying vault...");
  const vault = await VulnerableVault.deploy(tokenAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("\n✅ PausableVulnerableVault deployed to:", vaultAddress);
  console.log("   Asset:", tokenAddress);
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
    contract: "PausableVulnerableVault",
    address: vaultAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    vulnerable: true,
    vulnerabilities: [
      "Reentrancy in withdraw() - external call before state update",
      "Missing ReentrancyGuard from OpenZeppelin",
      "Same vulnerability in redeem() function"
    ],
    tokenAddress: tokenAddress
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
