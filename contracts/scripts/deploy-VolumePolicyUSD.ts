import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// Chainlink ETH/USD Price Feed on Sepolia
const ETH_USD_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// Policy limits in USD (18 decimals)
// Example: 1000 * 1e18 = $1,000 USD
const MIN_VALUE_USD = ethers.parseEther("0.01");    // $0.01 minimum
const MAX_VALUE_USD = ethers.parseEther("10000");   // $10,000 maximum per tx
const DAILY_LIMIT_USD = ethers.parseEther("50000"); // $50,000 daily limit

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     DEPLOYING VOLUMEPOLICYUSD WITH CHAINLINK FEED          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();
  console.log("Configuration:");
  console.log("  Price Feed:", ETH_USD_PRICE_FEED);
  console.log("  Min Value: $", ethers.formatEther(MIN_VALUE_USD), "USD");
  console.log("  Max Value: $", ethers.formatEther(MAX_VALUE_USD), "USD");
  console.log("  Daily Limit: $", ethers.formatEther(DAILY_LIMIT_USD), "USD");
  console.log();

  // Deploy VolumePolicyUSD
  console.log("Deploying VolumePolicyUSD...");
  const VolumePolicyUSD = await ethers.getContractFactory("VolumePolicyUSD");
  const volumePolicyUSD = await VolumePolicyUSD.deploy(
    ETH_USD_PRICE_FEED,
    MIN_VALUE_USD,
    MAX_VALUE_USD,
    DAILY_LIMIT_USD
  );
  await volumePolicyUSD.waitForDeployment();
  const address = await volumePolicyUSD.getAddress();
  console.log("✓ VolumePolicyUSD deployed to:", address);
  console.log();

  // Get initial price
  const price = await volumePolicyUSD.getETHPriceInUSD();
  console.log("Current ETH Price from Chainlink: $", ethers.formatEther(price), "USD");
  
  // Show conversion examples
  const info = await volumePolicyUSD.getPriceInfo();
  console.log();
  console.log("Conversion Examples:");
  console.log("  1 ETH = $", ethers.formatEther(info.example1ETHInUSD), "USD");
  console.log("  $1000 USD =", ethers.formatEther(info.example1000USDInETH), "ETH");
  console.log();

  // Save deployment info
  const deploymentInfo = {
    contract: "VolumePolicyUSD",
    network: "sepolia",
    chainId: 11155111,
    address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    configuration: {
      priceFeed: ETH_USD_PRICE_FEED,
      minValueUSD: ethers.formatEther(MIN_VALUE_USD),
      maxValueUSD: ethers.formatEther(MAX_VALUE_USD),
      dailyLimitUSD: ethers.formatEther(DAILY_LIMIT_USD)
    },
    initialPrice: ethers.formatEther(price)
  };

  const deploymentsPath = join(__dirname, "../config/deployments");
  writeFileSync(
    join(deploymentsPath, "volume-policy-usd.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment saved to: config/deployments/volume-policy-usd.json");
  console.log();
  console.log("Next steps:");
  console.log("  1. Add this policy to PolicyEngine:");
  console.log(`     policyEngine.addPolicy(${address}, 80)`);
  console.log("  2. Verify contract on Etherscan:");
  console.log(`     npx hardhat verify --network sepolia ${address} ${ETH_USD_PRICE_FEED} ${MIN_VALUE_USD} ${MAX_VALUE_USD} ${DAILY_LIMIT_USD}`);
  console.log();
  console.log("VolumePolicyUSD Features:");
  console.log("  ✓ Volume limits in USD (not just ETH)");
  console.log("  ✓ Chainlink Price Feed integration");
  console.log("  ✓ Stale price protection");
  console.log("  ✓ ETH ↔ USD conversion helpers");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
