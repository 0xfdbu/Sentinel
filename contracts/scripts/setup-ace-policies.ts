/**
 * Setup ACE Policies for USDA Stablecoin
 * 
 * - Set 10k USD daily volume limit
 * - Add test blacklisted addresses
 * 
 * Usage: npx hardhat run scripts/setup-ace-policies.ts --network sepolia
 */

import { ethers } from "hardhat";

// SEPOLIA ADDRESSES (from ace-latest.json)
const VOLUME_POLICY = "0x294D88d76D1c8e4d6b127dC87f1838766310E9d0";
const BLACKLIST_POLICY = "0x12984048eA07BE79850B47154a9fE993b74552F4";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     SETUP ACE POLICIES                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log();

  // ============================================================
  // 1. Setup Volume Policy - 10k USD daily limit
  // ============================================================
  console.log("STEP 1: Setting Volume Policy Limits");
  console.log("─────────────────────────────────────");
  
  const VolumePolicy = await ethers.getContractFactory("VolumePolicy");
  const volumePolicy = VolumePolicy.attach(VOLUME_POLICY);
  
  // Set daily limit to 10,000 USD (in wei, 6 decimals for USDA)
  const dailyLimit = ethers.parseUnits("10000", 6);
  
  console.log("Setting daily volume limit to 10,000 USD...");
  await (await volumePolicy.setDailyLimit(dailyLimit)).wait();
  console.log("✓ Daily volume limit set:", ethers.formatUnits(dailyLimit, 6), "USD");
  
  // Set min/max values
  const minValue = ethers.parseUnits("0.01", 6); // 0.01 USD
  const maxValue = ethers.parseUnits("5000", 6);  // 5000 USD per tx
  
  await (await volumePolicy.setLimits(minValue, maxValue)).wait();
  console.log("✓ Min transaction:", ethers.formatUnits(minValue, 6), "USD");
  console.log("✓ Max transaction:", ethers.formatUnits(maxValue, 6), "USD");
  console.log();

  // ============================================================
  // 2. Add Blacklisted Addresses
  // ============================================================
  console.log("STEP 2: Adding Blacklisted Addresses");
  console.log("─────────────────────────────────────");
  
  const BlacklistPolicy = await ethers.getContractFactory("AddressBlacklistPolicy");
  const blacklistPolicy = BlacklistPolicy.attach(BLACKLIST_POLICY);
  
  // Test blacklisted addresses (known scam/test addresses)
  const blacklistedAddresses = [
    {
      address: "0x0000000000000000000000000000000000000001",
      reason: "Test blacklisted address - do not use"
    },
    {
      address: "0xdead000000000000000000000000000000000000",
      reason: "Burn address - suspicious activity"
    }
  ];
  
  for (const entry of blacklistedAddresses) {
    try {
      const isBlacklisted = await blacklistPolicy.isBlacklisted(entry.address);
      if (!isBlacklisted) {
        await (await blacklistPolicy.addToBlacklist(entry.address, entry.reason)).wait();
        console.log("✓ Blacklisted:", entry.address);
        console.log("  Reason:", entry.reason);
      } else {
        console.log("⚠ Already blacklisted:", entry.address);
      }
    } catch (e: any) {
      console.log("✗ Failed to blacklist:", entry.address, e.message);
    }
  }
  
  // Check blacklist count
  const blacklistCount = await blacklistPolicy.getBlacklistCount();
  console.log();
  console.log("Total blacklisted addresses:", blacklistCount.toString());
  console.log();

  // ============================================================
  // 3. Summary
  // ============================================================
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     ACE POLICIES CONFIGURED                                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Volume Limits:");
  console.log("  Daily Limit: 10,000 USD");
  console.log("  Min Transaction: 0.01 USD");
  console.log("  Max Transaction: 5,000 USD");
  console.log();
  console.log("Blacklist:");
  console.log("  Total entries:", blacklistCount.toString());
  console.log();
  console.log("These policies will now be enforced on all USDA transfers!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
