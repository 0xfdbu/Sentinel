const hre = require("hardhat");

const VAULT = "0x22650892Ce8db57fCDB48AE8b3508F52420A727A";

async function main() {
  // Try public Sepolia RPC
  const publicProvider = new hre.ethers.JsonRpcProvider("https://rpc.sepolia.org");
  
  console.log("Checking via public RPC...");
  const code = await publicProvider.getCode(VAULT);
  console.log("Code at address:", code.substring(0, 100) + "...");
  
  const balance = await publicProvider.getBalance(VAULT);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Also check via Tenderly
  console.log("\nChecking via Tenderly...");
  const tenderlyProvider = new hre.ethers.JsonRpcProvider("https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH");
  const tBalance = await tenderlyProvider.getBalance(VAULT);
  console.log("Balance:", hre.ethers.formatEther(tBalance), "ETH");
}

main().catch(console.error);
