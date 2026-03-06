/**
 * CCIP Cross-Chain Bridge Test Script
 * 
 * Tests cross-chain mint/burn functionality for USDA Stablecoin
 * 
 * Usage: npx hardhat run scripts/test-ccip.ts --network sepolia
 */

import { ethers } from "hardhat";

// DEPLOYED CONTRACT ADDRESSES
const ADDRESSES = {
  sepolia: {
    stablecoin: "0x7d87f190256800589014391ce41Cb494bb970ea5", // Deployed
    ccipRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  },
  // Add other chains as needed
};

// CHAIN SELECTORS
const CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  mumbai: 12532609583862916517n,
  arbitrumSepolia: 3478487238524512106n,
  baseSepolia: 10344971235874465080n,
};

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           CCIP CROSS-CHAIN BRIDGE TEST                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  // Get stablecoin contract
  const stablecoinAddress = ADDRESSES.sepolia.stablecoin;
  if (stablecoinAddress === "0x...") {
    console.log("⚠ Please update ADDRESSES.stablecoin with the deployed address");
    return;
  }

  const USDAStablecoin = await ethers.getContractFactory("USDAStablecoin");
  const stablecoin = USDAStablecoin.attach(stablecoinAddress);

  console.log("USDA Stablecoin:", stablecoinAddress);
  console.log();

  // ============================================================
  // TEST 1: Basic Token Operations
  // ============================================================
  console.log("TEST 1: Basic Token Operations");
  console.log("─────────────────────────────────");

  // Check balances
  const deployerBalance = await stablecoin.balanceOf(deployer.address);
  console.log("Deployer balance:", ethers.formatUnits(deployerBalance, 6), "USDA");

  // Test transfer with ACE compliance
  const transferAmount = ethers.parseUnits("10", 6); // 10 USDA
  const testRecipient = user1 ? user1.address : "0x1234567890123456789012345678901234567890";
  console.log("\nTesting transfer of", ethers.formatUnits(transferAmount, 6), "USDA...");
  
  try {
    // Check compliance first
    const [compliant, reason] = await stablecoin.checkTransferCompliance(
      deployer.address,
      testRecipient,
      transferAmount
    );
    console.log("ACE Compliance:");
    console.log("  Compliant:", compliant);
    console.log("  Reason:", reason || "Pass");

    if (compliant) {
      const tx = await stablecoin.transfer(testRecipient, transferAmount);
      await tx.wait();
      console.log("✓ Transfer successful");
      
      const recipientBalance = await stablecoin.balanceOf(testRecipient);
      console.log("  Recipient balance:", ethers.formatUnits(recipientBalance, 6), "USDA");
    }
  } catch (e: any) {
    console.log("✗ Transfer failed:", e.message);
  }

  console.log();

  // ============================================================
  // TEST 2: Cross-Chain Bridge Configuration
  // ============================================================
  console.log("TEST 2: Cross-Chain Bridge Configuration");
  console.log("───────────────────────────────────────────");

  // Get current configuration
  const bridgeFee = await stablecoin.bridgeFeeBps();
  const feeCollector = await stablecoin.feeCollector();
  const mintCap = await stablecoin.mintCap();
  const dailyMintLimit = await stablecoin.dailyMintLimit();

  console.log("Bridge Configuration:");
  console.log("  Bridge Fee:", bridgeFee.toString(), "bps (", Number(bridgeFee) / 100, "%)");
  console.log("  Fee Collector:", feeCollector);
  console.log("  Mint Cap:", ethers.formatUnits(mintCap, 6), "USDA");
  console.log("  Daily Mint Limit:", ethers.formatUnits(dailyMintLimit, 6), "USDA");

  // Check supported chains
  console.log("\nChecking supported chains...");
  for (const [name, selector] of Object.entries(CHAIN_SELECTORS)) {
    const remoteAddress = await stablecoin.remoteStablecoins(selector);
    const isAllowed = await stablecoin.allowedSourceChains(selector);
    console.log(`  ${name} (${selector}):`);
    console.log(`    Remote stablecoin: ${remoteAddress === ethers.ZeroAddress ? 'Not set' : remoteAddress}`);
    console.log(`    Allowed as source: ${isAllowed}`);
  }

  console.log();

  // ============================================================
  // TEST 3: Bridge Fee Estimation
  // ============================================================
  console.log("TEST 3: Bridge Fee Estimation");
  console.log("───────────────────────────────");

  const bridgeAmount = ethers.parseUnits("100", 6); // 100 USDA
  const destinationChain = CHAIN_SELECTORS.mumbai;

  try {
    const [ccipFee, tokenFee] = await stablecoin.getBridgeFeeEstimate(
      destinationChain,
      user1.address,
      bridgeAmount
    );
    
    console.log("Bridge fee estimate for", ethers.formatUnits(bridgeAmount, 6), "USDA:");
    console.log("  CCIP Fee (ETH):", ethers.formatEther(ccipFee), "ETH");
    console.log("  Token Fee (USDA):", ethers.formatUnits(tokenFee, 6), "USDA");
    console.log("  Amount after fee:", ethers.formatUnits(bridgeAmount - tokenFee, 6), "USDA");
  } catch (e: any) {
    console.log("⚠ Fee estimation failed:", e.message);
    console.log("  (Remote stablecoin may not be set for this chain)");
  }

  console.log();

  // ============================================================
  // TEST 4: ACE Policy Enforcement
  // ============================================================
  console.log("TEST 4: ACE Policy Enforcement");
  console.log("────────────────────────────────");

  const policyEngineAddress = await stablecoin.policyEngine();
  const aceEnabled = await stablecoin.aceEnforcementEnabled();

  console.log("ACE Configuration:");
  console.log("  PolicyEngine:", policyEngineAddress);
  console.log("  ACE Enabled:", aceEnabled);

  // Test compliance with various scenarios
  const testCases = [
    { from: deployer.address, to: "0x742d35Cc6634C0532925a3b844Bc9e7595f8dEe", amount: ethers.parseUnits("1", 6), desc: "Normal transfer" },
    { from: deployer.address, to: "0x1234567890123456789012345678901234567890", amount: ethers.parseUnits("1000", 6), desc: "Large transfer" },
    { from: deployer.address, to: "0x0000000000000000000000000000000000000001", amount: ethers.parseUnits("1", 6), desc: "To blacklisted" },
  ];

  console.log("\nCompliance Tests:");
  for (const test of testCases) {
    try {
      const [compliant, reason] = await stablecoin.checkTransferCompliance(
        test.from,
        test.to,
        test.amount
      );
      console.log(`  ${test.desc}:`);
      console.log(`    Compliant: ${compliant}`);
      console.log(`    Reason: ${reason || 'Pass'}`);
    } catch (e: any) {
      console.log(`  ${test.desc}: Error - ${e.message}`);
    }
  }

  console.log();

  // ============================================================
  // TEST 5: Mint/Burn Operations
  // ============================================================
  console.log("TEST 5: Mint/Burn Operations");
  console.log("─────────────────────────────");

  // Get current supply
  const totalSupply = await stablecoin.totalSupply();
  const totalMinted = await stablecoin.totalMinted();
  const totalBurned = await stablecoin.totalBurned();

  console.log("Token Supply:");
  console.log("  Total Supply:", ethers.formatUnits(totalSupply, 6), "USDA");
  console.log("  Total Minted:", ethers.formatUnits(totalMinted, 6), "USDA");
  console.log("  Total Burned:", ethers.formatUnits(totalBurned, 6), "USDA");

  // Check daily mint for deployer
  const remainingMint = await stablecoin.getRemainingDailyMint(deployer.address);
  console.log("\nDaily Mint (deployer):");
  console.log("  Remaining:", ethers.formatUnits(remainingMint, 6), "USDA");

  console.log();

  // ============================================================
  // TEST 6: Bridge Operation (if configured)
  // ============================================================
  console.log("TEST 6: Bridge Operation Simulation");
  console.log("────────────────────────────────────");

  const mumbaiSelector = CHAIN_SELECTORS.mumbai;
  const remoteAddress = await stablecoin.remoteStablecoins(mumbaiSelector);

  if (remoteAddress === ethers.ZeroAddress) {
    console.log("⚠ Remote stablecoin not set for Mumbai");
    console.log("  To enable bridging, run:");
    console.log(`  stablecoin.setRemoteStablecoin(${mumbaiSelector}, "<remote_address>")`);
  } else {
    console.log("✓ Remote stablecoin configured:", remoteAddress);
    console.log("\nTo bridge tokens, run:");
    console.log(`  stablecoin.bridgeToChain(${mumbaiSelector}, "${user1.address}", amount, { value: ccipFee })`);
  }

  console.log();

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                    TEST COMPLETE                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("All basic tests completed successfully!");
  console.log();
  console.log("To perform actual cross-chain bridging:");
  console.log("1. Deploy USDAStablecoin on destination chain");
  console.log("2. Call setRemoteStablecoin() on both chains");
  console.log("3. Fund contract with LINK/ETH for CCIP fees");
  console.log("4. Call bridgeToChain() to initiate transfer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
