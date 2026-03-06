/**
 * Deploy Sentinel Bank Vault with PoR Integration
 * 
 * Deploys the complete PoR system:
 * 1. SentinelBankVault (stablecoin vault)
 * 2. Configures ACE policies
 * 3. Sets up CRE oracle
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-sentinel-bank.ts --network sepolia
 */

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

// Sepolia addresses
const ADDRESSES = {
  // Chainlink Price Feeds (Sepolia)
  ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  
  // Existing Sentinel contracts
  policyEngine: "0x62CC29A58404631B7db65CE14E366F63D3B96B16",
  guardian: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
  registry: "0x774B96F8d892A1e4482B52b3d255Fa269136A0E9",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🏦 DEPLOYING SENTINEL BANK VAULT                     ║');
  console.log('║     With Proof of Reserves + ACE Integration             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // STEP 1: Deploy SentinelBankVault
  // ═══════════════════════════════════════════════════════════
  console.log('STEP 1: Deploying SentinelBankVault...');
  console.log('──────────────────────────────────────────────────────────');
  
  const SentinelBankVault = await ethers.getContractFactory("SentinelBankVault");
  
  // Deploy with CRE oracle set to deployer initially
  // (Can be changed later to the actual CRE oracle address)
  const vault = await SentinelBankVault.deploy(
    ADDRESSES.ethUsdPriceFeed,
    ADDRESSES.policyEngine,
    ADDRESSES.guardian,
    deployer.address // Initial CRE oracle (deployer)
  );
  
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  
  console.log('✓ SentinelBankVault deployed:', vaultAddress);
  console.log('  - Price Feed (ETH/USD):', ADDRESSES.ethUsdPriceFeed);
  console.log('  - Policy Engine:', ADDRESSES.policyEngine);
  console.log('  - Guardian:', ADDRESSES.guardian);
  console.log('  - CRE Oracle:', deployer.address, '(deployer - can be updated)');
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // STEP 2: Register Vault on SentinelRegistry
  // ═══════════════════════════════════════════════════════════
  console.log('STEP 2: Registering vault on SentinelRegistry...');
  console.log('──────────────────────────────────────────────────────────');
  
  const Registry = await ethers.getContractFactory("SentinelRegistry");
  const registry = Registry.attach(ADDRESSES.registry);
  
  const isRegistered = await registry.isRegistered(vaultAddress);
  if (!isRegistered) {
    const tx = await registry.register(
      vaultAddress,
      "Sentinel Bank Vault - USDA Stablecoin with PoR",
      { value: ethers.parseEther("0.01") }
    );
    await tx.wait();
    console.log('✓ Vault registered with 0.01 ETH stake');
  } else {
    console.log('⚠ Vault already registered');
  }
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // STEP 3: Configure ACE Policies (via PolicyConfigurator)
  // ═══════════════════════════════════════════════════════════
  console.log('STEP 3: Configuring ACE policies...');
  console.log('──────────────────────────────────────────────────────────');
  
  const configuratorAddress = "0x3927702dC8af845BC67d0f19b01Ad62F68851124"; // Fixed configurator
  const Configurator = await ethers.getContractFactory("PolicyConfigurator");
  const configurator = Configurator.attach(configuratorAddress);
  
  try {
    // Enable policies for vault
    const tx1 = await configurator.enablePolicies(vaultAddress);
    await tx1.wait();
    console.log('✓ Policies enabled for vault');
    
    // Set volume limits (max 10 ETH per transaction)
    const tx2 = await configurator.setVolumeLimits(
      vaultAddress,
      ethers.parseEther("0.001"),  // min: 0.001 ETH
      ethers.parseEther("10"),     // max: 10 ETH
      ethers.parseEther("100")     // daily: 100 ETH
    );
    await tx2.wait();
    console.log('✓ Volume limits set: 0.001 - 10 ETH (daily: 100 ETH)');
  } catch (error: any) {
    console.log('⚠ Policy configuration skipped:', error.message.slice(0, 100));
  }
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // STEP 4: Verify Deployment
  // ═══════════════════════════════════════════════════════════
  console.log('STEP 4: Verifying deployment...');
  console.log('──────────────────────────────────────────────────────────');
  
  // Check price feed
  const price = await vault.previewMint(ethers.parseEther("1"));
  console.log(`✓ Price Feed working: 1 ETH = $${ethers.formatUnits(price, 18)} USDA`);
  
  // Check stats
  const stats = await vault.getVaultStats();
  console.log('✓ Vault stats accessible');
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // STEP 5: Save Deployment
  // ═══════════════════════════════════════════════════════════
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      vault: vaultAddress,
      priceFeed: ADDRESSES.ethUsdPriceFeed,
      policyEngine: ADDRESSES.policyEngine,
      guardian: ADDRESSES.guardian,
      registry: ADDRESSES.registry,
    },
    configuration: {
      creOracle: deployer.address,
      volumeLimits: {
        min: "0.001",
        max: "10",
        daily: "100"
      }
    }
  };
  
  const deploymentPath = join(__dirname, '../config/deployments/sentinel-bank-latest.json');
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('✓ Deployment saved to:', deploymentPath);
  console.log('');
  
  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🎉 DEPLOYMENT COMPLETE                               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Sentinel Bank Vault:', vaultAddress);
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Start Mock Bank API:');
  console.log('     cd bank-api && npm start');
  console.log('');
  console.log('  2. Start PoR Listener:');
  console.log('     cd sentinel-node && npx ts-node scripts/por-listener.ts');
  console.log('');
  console.log('  3. Test mint (in another terminal):');
  console.log(`     cast send ${vaultAddress} "requestMint()" --value 0.01ether --rpc-url $SEPOLIA_RPC --private-key $PRIVATE_KEY`);
  console.log('');
  console.log('Environment Variables:');
  console.log(`  export VAULT_ADDRESS=${vaultAddress}`);
  console.log(`  export SENTINEL_PRIVATE_KEY=${process.env.SENTINEL_PRIVATE_KEY || '<your_key>'}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
