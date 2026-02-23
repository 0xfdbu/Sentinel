const hre = require("hardhat");

const VAULT_ADDRESS = "0x22650892Ce8db57fCDB48AE8b3508F52420A727A";

async function main() {
  const provider = new hre.ethers.JsonRpcProvider("https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH");
  
  console.log("Checking vault at:", VAULT_ADDRESS);
  
  // Check if there's code at the address
  const code = await provider.getCode(VAULT_ADDRESS);
  console.log("Code length:", code.length);
  console.log("Has code:", code.length > 2);
  
  // Check balance
  const balance = await provider.getBalance(VAULT_ADDRESS);
  console.log("Vault balance:", hre.ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
