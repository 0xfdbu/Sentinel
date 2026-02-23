#!/usr/bin/env ts-node
/**
 * Sentinel Attack Test Script
 * 
 * This script runs a complete attack detection and auto-pause test:
 * 1. Unpauses DemoVault (if needed)
 * 2. Sends attack transaction to SimpleDrainer
 * 3. Monitors for detection and pause
 * 4. Verifies vault is protected
 */

import { ethers } from 'ethers';

// Configuration
const RPC_URL = 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH';
const PRIVATE_KEY = '0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194';

// Contract addresses
const VAULT_ADDRESS = '0x22650892Ce8db57fCDB48AE8b3508F52420A727A';
const DRAINER_ADDRESS = '0x997E47e8169b1A9112F9Bc746De6b6677c0791C0';
const GUARDIAN_ADDRESS = '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1';

// ABIs
const VAULT_ABI = [
  'function paused() view returns (bool)',
  'function unpause() external'
];

const DRAINER_ABI = [
  'function attack(uint256 amount) external'
];

const GUARDIAN_ABI = [
  'function isPaused(address) view returns (bool)'
];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           SENTINEL ATTACK TEST                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);
  const drainer = new ethers.Contract(DRAINER_ADDRESS, DRAINER_ABI, wallet);
  const guardian = new ethers.Contract(GUARDIAN_ADDRESS, GUARDIAN_ABI, provider);

  // Step 1: Check and unpause vault
  console.log('[1/4] Checking vault status...');
  const isPaused = await guardian.isPaused(VAULT_ADDRESS);
  const balance = await provider.getBalance(VAULT_ADDRESS);
  
  console.log('   Vault paused:', isPaused);
  console.log('   Balance:', ethers.formatEther(balance), 'ETH');
  
  if (isPaused) {
    console.log('   Unpausing vault...');
    try {
      const tx = await vault.unpause();
      await tx.wait();
      console.log('   ✅ Vault unpaused');
    } catch (e: any) {
      console.log('   ⚠️  Could not unpause:', e.shortMessage || 'unknown error');
    }
  } else {
    console.log('   ✅ Vault is active');
  }
  
  await sleep(2000);
  
  // Step 2: Send attack transaction
  console.log('');
  console.log('[2/4] Sending attack transaction...');
  console.log('   Target: SimpleDrainer (calls DemoVault.withdraw)');
  console.log('   Amount: 0.001 ETH');
  
  try {
    const tx = await drainer.attack(ethers.parseEther('0.001'), {
      gasLimit: 150000
    });
    console.log('   📤 TX Hash:', tx.hash);
    console.log('   ⏳ Waiting for confirmation...');
    await tx.wait();
    console.log('   ✅ Transaction confirmed');
  } catch (e: any) {
    console.log('   ⚠️  Transaction reverted:', e.shortMessage || 'execution reverted');
    console.log('   (This is expected if vault is paused or other conditions)');
  }
  
  // Step 3: Wait for detection
  console.log('');
  console.log('[3/4] Waiting for Sentinel detection...');
  console.log('   ⏳ Monitoring for ~60 seconds...');
  console.log('   Check logs: tail -f /tmp/sentinel-nohup.log');
  
  await sleep(60000);
  
  // Step 4: Verify protection
  console.log('');
  console.log('[4/4] Verifying protection...');
  
  const isPausedAfter = await guardian.isPaused(VAULT_ADDRESS);
  const balanceAfter = await provider.getBalance(VAULT_ADDRESS);
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      RESULTS                                   ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║ Vault paused:', isPausedAfter ? '✅ YES (PROTECTED)' : '❌ NO', '         ║');
  console.log('║ Balance:', ethers.formatEther(balanceAfter), 'ETH                    ║');
  console.log('║                                                                ║');
  
  if (isPausedAfter) {
    console.log('║ ✅ SUCCESS: Attack detected and blocked!                       ║');
    console.log('║ ✅ Vault protected by Sentinel + CRE + xAI                     ║');
  } else {
    console.log('║ ⚠️  Vault not paused - check logs for errors                   ║');
  }
  
  console.log('╚════════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
