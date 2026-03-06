import { ethers } from "hardhat";

// Configuration
const CONFIG = {
  sepolia: {
    chainSelector: 16015286601757825753n,
    router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    rmnProxy: "0xba3f6251de62dED61Ff98590cB2fDf6871FbB991",
    registryModule: "0x62e731218d0D47305aba2BE3751E7EE9E5520790",
    tokenAdminRegistry: "0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82",
    stablecoin: "0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6", // V4
    rpc: "https://ethereum-sepolia-rpc.publicnode.com"
  },
  arbitrumSepolia: {
    chainSelector: 3478487238524512106n,
    router: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
    rmnProxy: "0xAc8CFc3762a979628334a0E4C1026244498E821b",
    registryModule: "0x97300785aF1edE1343DB6d90706A35CF14aA3d81",
    tokenAdminRegistry: "0xA92053a4a3922084d992fD2835bdBa4caC6877e6",
    stablecoin: "0x543b8555f9284D106422F0eD7B9d25F9520a17Ad", // V4
    rpc: "https://arbitrum-sepolia-rpc.publicnode.com"
  }
};

// BurnMintTokenPool bytecode and ABI (from @chainlink/contracts-ccip)
// This is a simplified version - in production, import from the package
const TOKEN_POOL_ABI = [
  "constructor(address token, uint8 decimals, address[] allowlist, address rmnProxy, address router)",
  "function applyChainUpdates(uint64[] remoteChainSelectorsToRemove, tuple(uint64 remoteChainSelector, bytes[] remotePoolAddresses, bytes remoteTokenAddress, tuple(bool isEnabled, uint128 capacity, uint128 rate) outboundRateLimiterConfig, tuple(bool isEnabled, uint128 capacity, uint128 rate) inboundRateLimiterConfig)[] updates)",
  "function getSupportedChains() view returns (uint64[])",
  "function isSupportedChain(uint64 chainSelector) view returns (bool)"
];

// We need to compile the BurnMintTokenPool from @chainlink/contracts-ccip
async function deployTokenPool(
  config: typeof CONFIG.sepolia,
  wallet: ethers.Wallet,
  chainName: string
): Promise<string> {
  console.log(`\n📍 Deploying BurnMintTokenPool on ${chainName}...`);
  
  try {
    // Try to get the factory from the node_modules
    const TokenPoolFactory = await ethers.getContractFactory("BurnMintTokenPool");
    
    const pool = await TokenPoolFactory.deploy(
      config.stablecoin,
      6, // decimals
      [], // allowlist (empty = permissionless)
      config.rmnProxy,
      config.router
    );
    
    await pool.waitForDeployment();
    const address = await pool.getAddress();
    
    console.log(`  ✅ TokenPool deployed: ${address}`);
    return address;
  } catch (error: any) {
    console.log(`  ⚠️  Could not deploy TokenPool: ${error.message}`);
    console.log(`  Manual deployment required using Foundry/cast`);
    return "";
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("DEPLOY CCIP TOKEN POOLS");
  console.log("=".repeat(70));
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set");
  }
  
  const wallet = new ethers.Wallet(privateKey);
  console.log("\n🔑 Wallet:", wallet.address);
  
  // Deploy on Sepolia
  console.log("\n--- SEPOLIA ---");
  const sepoliaProvider = new ethers.JsonRpcProvider(CONFIG.sepolia.rpc);
  const sepoliaWallet = wallet.connect(sepoliaProvider);
  
  const sepoliaPool = await deployTokenPool(CONFIG.sepolia, sepoliaWallet, "Sepolia");
  
  // Deploy on Arbitrum
  console.log("\n--- ARBITRUM SEPOLIA ---");
  const arbProvider = new ethers.JsonRpcProvider(CONFIG.arbitrumSepolia.rpc);
  const arbWallet = wallet.connect(arbProvider);
  
  const arbitrumPool = await deployTokenPool(CONFIG.arbitrumSepolia, arbWallet, "Arbitrum Sepolia");
  
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT ADDRESSES");
  console.log("=".repeat(70));
  console.log("\nSepolia:");
  console.log(`  Stablecoin: ${CONFIG.sepolia.stablecoin}`);
  console.log(`  TokenPool: ${sepoliaPool || "MANUAL_DEPLOYMENT_NEEDED"}`);
  console.log("\nArbitrum Sepolia:");
  console.log(`  Stablecoin: ${CONFIG.arbitrumSepolia.stablecoin}`);
  console.log(`  TokenPool: ${arbitrumPool || "MANUAL_DEPLOYMENT_NEEDED"}`);
  
  if (sepoliaPool && arbitrumPool) {
    console.log("\n✅ Both TokenPools deployed!");
    console.log("\nNext: Run setup script to:");
    console.log("  - Grant mint/burn roles");
    console.log("  - Register with TokenAdminRegistry");
    console.log("  - Configure cross-chain routes");
  } else {
    console.log("\n⚠️  TokenPool deployment failed or requires manual steps.");
    console.log("   See TOKENPOOL_SETUP_GUIDE.md for manual deployment.");
  }
}

main().catch(console.error);
