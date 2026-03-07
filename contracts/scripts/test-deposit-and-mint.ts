/**
 * Test ETH Deposit and Trigger Mint Workflow
 * 
 * Usage: npx hardhat run scripts/test-deposit-and-mint.ts --network sepolia
 */

import { ethers } from "hardhat";

const VAULT_ADDRESS = '0x12fe97b889158380e1D94b69718F89E521b38c11';
const USDA_TOKEN = '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45';

const VAULT_ABI = [
  'function depositETH() payable returns (bytes32 mintRequestId, uint256 depositIndex)',
  'function getChainlinkPrice() view returns (uint256)',
  'function userDeposits(address user, uint256 index) view returns (uint256 ethAmount, uint256 usdaMinted, uint256 ethPriceAtDeposit, uint256 timestamp, bool active, bool mintCompleted)',
  'event ETHDeposited(address indexed user, uint256 ethAmount, uint256 ethPrice, bytes32 mintRequestId, uint256 depositIndex)'
];

const USDA_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)'
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Check balances
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
  
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  const usda = new ethers.Contract(USDA_TOKEN, USDA_ABI, signer);
  
  const usdaBalanceBefore = await usda.balanceOf(signer.address);
  const decimals = await usda.decimals();
  console.log(`USDA Balance Before: ${ethers.formatUnits(usdaBalanceBefore, decimals)} USDA`);
  
  // Get ETH price
  const ethPrice = await vault.getChainlinkPrice();
  console.log(`Current ETH Price: $${ethers.formatUnits(ethPrice, 8)}`);
  
  // Deposit 0.001 ETH
  const depositAmount = ethers.parseEther("0.001");
  console.log(`\nDepositing ${ethers.formatEther(depositAmount)} ETH...`);
  
  const tx = await vault.depositETH({
    value: depositAmount,
    gasLimit: 300000
  });
  
  console.log(`Transaction: ${tx.hash}`);
  console.log("Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log(`✓ Confirmed in block ${receipt?.blockNumber}`);
  
  // Parse ETHDeposited event
  const eventSignature = 'ETHDeposited(address,uint256,uint256,bytes32,uint256)';
  const eventTopic = ethers.id(eventSignature);
  
  const eventLog = receipt?.logs.find((log: any) => 
    log.topics[0]?.toLowerCase() === eventTopic.toLowerCase()
  );
  
  if (!eventLog) {
    console.error("✗ ETHDeposited event not found!");
    return;
  }
  
  // Decode event
  const data = eventLog.data;
  const ethAmount = BigInt('0x' + data.slice(2, 66));
  const price = BigInt('0x' + data.slice(66, 130));
  const mintRequestId = '0x' + data.slice(130, 194);
  const depositIndex = BigInt('0x' + data.slice(194, 258));
  
  console.log("\n=== ETHDeposited Event ===");
  console.log(`User: ${signer.address}`);
  console.log(`ETH Amount: ${ethers.formatEther(ethAmount)} ETH`);
  console.log(`ETH Price: $${ethers.formatUnits(price, 8)}`);
  console.log(`Mint Request ID: ${mintRequestId}`);
  console.log(`Deposit Index: ${depositIndex}`);
  
  // Calculate expected USDA
  const expectedUSDA = (ethAmount * price) / BigInt(10 ** 18) / BigInt(10 ** (18 - Number(decimals)));
  console.log(`Expected USDA: ${ethers.formatUnits(expectedUSDA, decimals)} USDA`);
  
  console.log("\n=== Next Steps ===");
  console.log("The ETHDeposited event has been emitted.");
  console.log("In production, the Chainlink DON would automatically trigger the workflow.");
  console.log("\nTo manually trigger the CRE workflow, run:");
  console.log(`cd ../ && cre workflow simulate ./workflows/eth-por-unified --target local-simulation`);
  console.log("\nOr wait for the sentinel-node to detect the event and trigger it.");
  
  // Check deposit details
  const deposit = await vault.userDeposits(signer.address, depositIndex);
  console.log("\n=== Deposit Details ===");
  console.log(`ETH Amount: ${ethers.formatEther(deposit.ethAmount)} ETH`);
  console.log(`USDA Minted: ${ethers.formatUnits(deposit.usdaMinted, decimals)} USDA`);
  console.log(`Mint Completed: ${deposit.mintCompleted}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
