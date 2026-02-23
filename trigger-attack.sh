#!/bin/bash

# Sentinel Attack Trigger Script
# Usage: ./trigger-attack.sh
# 
# This script triggers an attack on DemoVault via SimpleDrainer
# to test Sentinel detection and auto-pause functionality.
#
# Prerequisites:
# - Sentinel Node is running (npm run dev in sentinel-node/)
# - API Server is running (npm run dev in api-server/)
# - Sepolia testnet connection available

set -e

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    SENTINEL ATTACK TRIGGER                               ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
RPC_URL="https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH"
PRIVATE_KEY="0x46a43fec110312b9cc20ab1e8f1948cf253ec37cb24875d10f3303006d1c6194"
VAULT_ADDRESS="0x22650892Ce8db57fCDB48AE8b3508F52420A727A"
DRAINER_ADDRESS="0x997E47e8169b1A9112F9Bc746De6b6677c0791C0"
GUARDIAN_ADDRESS="0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1"

echo "[1/3] Checking vault status..."
cd sentinel-node

npx ts-node -e "
import { ethers } from 'ethers';
const RPC = '$RPC_URL';
const VAULT = '$VAULT_ADDRESS';
const GUARDIAN = '$GUARDIAN_ADDRESS';
const GUARDIAN_ABI = ['function isPaused(address) view returns (bool)'];
const VAULT_ABI = ['function paused() view returns (bool)'];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const guardian = new ethers.Contract(GUARDIAN, GUARDIAN_ABI, provider);
  const vault = new ethers.Contract(VAULT, VAULT_ABI, provider);
  
  const gPaused = await guardian.isPaused(VAULT);
  const vPaused = await vault.paused();
  const bal = await provider.getBalance(VAULT);
  
  console.log('  Guardian says paused:', gPaused);
  console.log('  Vault says paused:', vPaused);
  console.log('  Balance:', ethers.formatEther(bal), 'ETH');
  
  if (gPaused || vPaused) {
    console.log('  ⚠️  Vault is PAUSED - attack will be blocked immediately');
  } else {
    console.log('  ✅ Vault is ACTIVE - ready for attack test');
  }
}
main().catch(console.error);
" 2>&1

echo ""
echo "[2/3] Triggering attack transaction..."
echo "  Target: SimpleDrainer (calls DemoVault.withdraw)"
echo "  Amount: 0.001 ETH"
echo ""

npx ts-node -e "
import { ethers } from 'ethers';
const RPC = '$RPC_URL';
const PK = '$PRIVATE_KEY';
const DRAINER = '$DRAINER_ADDRESS';
const DRAINER_ABI = ['function attack(uint256 amount) external'];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  const drainer = new ethers.Contract(DRAINER, DRAINER_ABI, wallet);
  
  console.log('  Sending attack(0.001 ETH)...');
  const tx = await drainer.attack(ethers.parseEther('0.001'), { gasLimit: 150000 });
  console.log('  📤 TX HASH:', tx.hash);
  console.log('');
  console.log('  View on Etherscan:');
  console.log('  https://sepolia.etherscan.io/tx/' + tx.hash);
  console.log('');
  console.log('  ⏳ Waiting for confirmation...');
  await tx.wait();
  console.log('  ✅ Confirmed');
}
main().catch(e => {
  console.log('  Reverted:', e.shortMessage || e.message);
  console.log('  (This is expected if vault is paused)');
});
" 2>&1

echo ""
echo "[3/3] Monitoring complete!"
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    NEXT STEPS                                            ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Watch Sentinel logs:"
echo "   tail -f /tmp/sentinel-nohup.log"
echo ""
echo "2. Look for these messages:"
echo "   🚨 SUSPICIOUS ACTIVITY DETECTED"
echo "   🔬 Sending to CRE xAI analysis"
echo "   ✅ xAI Analysis complete. Risk Level: MEDIUM"
echo "   🔒 Executing pause"
echo "   ✅ AUTO-PAUSE SUCCESSFUL!"
echo ""
echo "3. Verify protection:"
echo "   cd sentinel-node && npx ts-node -e \""
echo "   import { ethers } from 'ethers';"
echo "   const guardian = new ethers.Contract('$GUARDIAN_ADDRESS', ['function isPaused(address) view returns (bool)'], new ethers.JsonRpcProvider('$RPC_URL'));"
echo "   guardian.isPaused('$VAULT_ADDRESS').then(p => console.log('Paused:', p));"
echo "   \""
echo ""
echo "Expected time: ~20-25 seconds for complete detection + pause"
echo ""
