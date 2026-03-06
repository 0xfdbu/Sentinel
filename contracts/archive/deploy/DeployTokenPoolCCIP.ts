import { ethers } from "hardhat";

/**
 * Deploy CCIP TokenPool Infrastructure
 * Following Chainlink CRE template exactly
 */

// CCIP Configuration - Sepolia
const SEPOLIA_CONFIG = {
  chainSelector: 16015286601757825753n,
  router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
  rmnProxy: "0xba3f6251de62dED61Ff98590cB2fDf6871FbB991",
  registryModule: "0x62e731218d0D47305aba2BE3751E7EE9E5520790",
  tokenAdminRegistry: "0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82",
  linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  rpc: "https://ethereum-sepolia-rpc.publicnode.com"
};

// CCIP Configuration - Arbitrum Sepolia
const ARBITRUM_CONFIG = {
  chainSelector: 3478487238524512106n,
  router: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
  rmnProxy: "0xAc8CFc3762a979628334a0E4C1026244498E821b",
  registryModule: "0x97300785aF1edE1343DB6d90706A35CF14aA3d81",
  tokenAdminRegistry: "0xA92053a4a3922084d992fD2835bdBa4caC6877e6",
  linkToken: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
  rpc: "https://arbitrum-sepolia-rpc.publicnode.com"
};

// BurnMintTokenPool ABI (from @chainlink/contracts-ccip)
const TOKEN_POOL_ABI = [
  "constructor(address token, uint8 decimals, address[] allowlist, address rmnProxy, address router)",
  "function applyChainUpdates(uint64[] remoteChainSelectorsToRemove, tuple(uint64 remoteChainSelector, bytes[] remotePoolAddresses, bytes remoteTokenAddress, tuple(bool isEnabled, uint128 capacity, uint128 rate) outboundRateLimiterConfig, tuple(bool isEnabled, uint128 capacity, uint128 rate) inboundRateLimiterConfig)[] updates)",
  "function getSupportedChains() view returns (uint64[])",
  "function isSupportedChain(uint64 chainSelector) view returns (bool)"
];

// TokenAdminRegistry ABI
const TOKEN_ADMIN_REGISTRY_ABI = [
  "function registerAdminViaOwner(address token)",
  "function acceptAdminRole(address token)",
  "function setPool(address token, address pool)",
  "function getPool(address token) view returns (address)"
];

// RegistryModuleOwnerCustom ABI
const REGISTRY_MODULE_ABI = [
  "function registerAdminViaOwner(address token)"
];

// Stablecoin ABI
const STABLECOIN_ABI = [
  "function grantMintAndBurnRoles(address account)",
  "function mint(address to, uint256 amount)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function BURNER_ROLE() view returns (bytes32)"
];

async function deployTokenPool(
  config: typeof SEPOLIA_CONFIG,
  tokenAddress: string,
  wallet: ethers.Wallet,
  chainName: string
): Promise<string> {
  console.log(`\n📍 Deploying TokenPool on ${chainName}...`);
  
  // For this deployment, we'll use a factory pattern
  // In production, you'd compile and deploy from @chainlink/contracts-ccip
  
  // First, let's check if we need to install the package
  console.log("  Token:", tokenAddress);
  console.log("  Router:", config.router);
  console.log("  RMN Proxy:", config.rmnProxy);
  
  // Note: In a real deployment, you would:
  // 1. npm install @chainlink/contracts-ccip
  // 2. Import BurnMintTokenPool
  // 3. Deploy using hardhat
  
  // For now, we'll use a placeholder and note that manual deployment is needed
  console.log("\n  ⚠️  TokenPool deployment requires @chainlink/contracts-ccip package");
  console.log("     Please run: npm install @chainlink/contracts-ccip");
  
  return "0x"; // Placeholder
}

async function setupTokenPool(
  config: typeof SEPOLIA_CONFIG,
  tokenAddress: string,
  poolAddress: string,
  wallet: ethers.Wallet,
  chainName: string
) {
  console.log(`\n📍 Setting up TokenPool on ${chainName}...`);
  
  const provider = new ethers.JsonRpcProvider(config.rpc);
  const connectedWallet = wallet.connect(provider);
  
  // 1. Grant mint/burn roles to pool
  console.log("  1. Granting mint/burn roles to pool...");
  const token = new ethers.Contract(tokenAddress, STABLECOIN_ABI, connectedWallet);
  const tx1 = await token.grantMintAndBurnRoles(poolAddress);
  await tx1.wait();
  console.log("     ✅ Roles granted");
  
  // 2. Register with TokenAdminRegistry
  console.log("  2. Registering with TokenAdminRegistry...");
  const registryModule = new ethers.Contract(config.registryModule, REGISTRY_MODULE_ABI, connectedWallet);
  const tx2 = await registryModule.registerAdminViaOwner(tokenAddress);
  await tx2.wait();
  console.log("     ✅ Registered");
  
  // 3. Accept admin role
  console.log("  3. Accepting admin role...");
  const registry = new ethers.Contract(config.tokenAdminRegistry, TOKEN_ADMIN_REGISTRY_ABI, connectedWallet);
  const tx3 = await registry.acceptAdminRole(tokenAddress);
  await tx3.wait();
  console.log("     ✅ Admin role accepted");
  
  // 4. Set pool
  console.log("  4. Setting pool in registry...");
  const tx4 = await registry.setPool(tokenAddress, poolAddress);
  await tx4.wait();
  console.log("     ✅ Pool set");
}

async function configureCrossChainRoute(
  localConfig: typeof SEPOLIA_CONFIG,
  remoteConfig: typeof ARBITRUM_CONFIG,
  localPool: string,
  remotePool: string,
  remoteToken: string,
  wallet: ethers.Wallet,
  routeName: string
) {
  console.log(`\n🔗 Configuring route: ${routeName}...`);
  
  const provider = new ethers.JsonRpcProvider(localConfig.rpc);
  const connectedWallet = wallet.connect(provider);
  
  const pool = new ethers.Contract(localPool, TOKEN_POOL_ABI, connectedWallet);
  
  // Build chain update
  const remotePoolAddresses = [ethers.zeroPadValue(remotePool, 32)];
  const remoteTokenAddress = ethers.zeroPadValue(remoteToken, 32);
  
  const updates = [{
    remoteChainSelector: remoteConfig.chainSelector,
    remotePoolAddresses: remotePoolAddresses,
    remoteTokenAddress: remoteTokenAddress,
    outboundRateLimiterConfig: {
      isEnabled: false,
      capacity: 0,
      rate: 0
    },
    inboundRateLimiterConfig: {
      isEnabled: false,
      capacity: 0,
      rate: 0
    }
  }];
  
  const tx = await pool.applyChainUpdates([], updates);
  await tx.wait();
  console.log("  ✅ Route configured");
}

async function main() {
  console.log("=".repeat(70));
  console.log("DEPLOY CCIP TOKEN POOL INFRASTRUCTURE");
  console.log("=".repr(70));
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set");
  }
  
  const wallet = new ethers.Wallet(privateKey);
  console.log("\n🔑 Deployer:", wallet.address);
  
  // Deploy stablecoin V4 first
  console.log("\n🚀 Step 1: Deploy USDAStablecoinV4 on Sepolia...");
  console.log("   (Using hardhat deploy script)");
  
  console.log("\n🚀 Step 2: Deploy USDAStablecoinV4 on Arbitrum...");
  console.log("   (Using hardhat deploy script)");
  
  console.log("\n🚀 Step 3: Deploy TokenPool on Sepolia...");
  console.log("   ⚠️  Requires @chainlink/contracts-ccip");
  
  console.log("\n🚀 Step 4: Deploy TokenPool on Arbitrum...");
  console.log("   ⚠️  Requires @chainlink/contracts-ccip");
  
  console.log("\n🚀 Step 5: Configure cross-chain routes...");
  
  console.log("\n" + "=".repeat(70));
  console.log("IMPORTANT: Manual Steps Required");
  console.log("=".repeat(70));
  console.log(`
1. Install CCIP contracts:
   cd sentinel/contracts
   npm install @chainlink/contracts-ccip

2. Compile contracts:
   npx hardhat compile

3. Deploy TokenPool on Sepolia:
   - Use BurnMintTokenPool from @chainlink/contracts-ccip
   - Constructor: (token, 6 decimals, [], rmnProxy, router)

4. Deploy TokenPool on Arbitrum:
   - Same as above

5. Run setup script:
   npx hardhat run deploy/SetupTokenPools.ts --network sepolia
   npx hardhat run deploy/SetupTokenPools.ts --network arbitrumSepolia

6. Configure routes:
   npx hardhat run deploy/ConfigureRoutes.ts --network sepolia
   npx hardhat run deploy/ConfigureRoutes.ts --network arbitrumSepolia
`);
}

main().catch(console.error);
