#!/usr/bin/env node
/**
 * Sentinel Event Listener
 * 
 * Watches for ETHDeposited events from SentinelVault and automatically
 * triggers the CRE workflow to mint USDA. This simulates production behavior
 * where the workflow would auto-trigger on the DON.
 * 
 * Usage:
 *   node scripts/event-listener.js
 * 
 * The listener will:
 * 1. Watch for ETHDeposited events from the Vault
 * 2. Extract transaction hash and event data
 * 3. Automatically run CRE workflow simulation with --broadcast
 * 4. Log results
 */

const { ethers } = require('ethers');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
  // Sepolia RPC - uses environment variable or defaults to public node
  rpcUrl: process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
  
  // SentinelVault address (emits ETHDeposited events)
  vaultAddress: '0x12fe97b889158380e1D94b69718F89E521b38c11',
  
  // CRE settings
  creBin: '/home/user/.cre/bin/cre',
  workflowDir: path.resolve(__dirname, '../workflows/eth-por-unified'),
  projectRoot: path.resolve(__dirname, '..'),
  
  // Polling interval (check for new events every X ms when using polling fallback)
  pollInterval: 5000,
};

// Vault ABI (only the event we need)
const VAULT_ABI = [
  'event ETHDeposited(address indexed user, uint256 ethAmount, uint256 ethPrice, bytes32 mintRequestId, uint256 depositIndex)'
];

// Track processed events to avoid duplicates
const processedEvents = new Set();

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           🎯 SENTINEL EVENT LISTENER (SIMULATION)              ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Configuration:');
console.log(`  RPC: ${CONFIG.rpcUrl}`);
console.log(`  Vault: ${CONFIG.vaultAddress}`);
console.log(`  Workflow: ${CONFIG.workflowDir}`);
console.log('');
console.log('👂 Listening for ETHDeposited events...');
console.log('   (Auto-triggers CRE workflow on each deposit)');
console.log('');

// Initialize provider (ethers v5 compatible)
const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
const vault = new ethers.Contract(CONFIG.vaultAddress, VAULT_ABI, provider);

/**
 * Execute CRE workflow for a specific event
 */
async function executeWorkflow(txHash, eventIndex, eventData) {
  const { user, ethAmount, ethPrice, mintRequestId, depositIndex } = eventData;
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 EVENT DETECTED - Auto-triggering CRE workflow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Transaction: ${txHash}`);
  console.log(`  User: ${user}`);
  console.log(`  ETH Amount: ${ethers.utils.formatEther(ethAmount)} ETH`);
  console.log(`  ETH Price: $${(Number(ethPrice) / 1e8).toFixed(2)}`);
  console.log(`  Deposit Index: ${depositIndex}`);
  console.log(`  Request ID: ${mintRequestId}`);
  console.log('');
  console.log('⏳ Executing CRE workflow (this may take 15-30 seconds)...');
  console.log('');

  return new Promise((resolve) => {
    const logs = [];
    let success = false;
    let txHashOutput = null;
    
    const creProcess = spawn(CONFIG.creBin, [
      'workflow', 'simulate', CONFIG.workflowDir,
      '--target', 'local-simulation',
      '--broadcast',
      '--evm-tx-hash', txHash,
      '--evm-event-index', eventIndex.toString(),
      '--non-interactive',
      '--trigger-index', '0'
    ], {
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/home/user/.cre/bin`,
      },
      cwd: CONFIG.projectRoot,
    });

    creProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (clean) {
          logs.push(clean);
          console.log(`  [CRE] ${clean}`);
          
          // Extract success indicators
          if (clean.includes('SUCCESS') && clean.includes('0x')) {
            const match = clean.match(/0x[a-fA-F0-9]{64}/);
            if (match) {
              success = true;
              txHashOutput = match[0];
            }
          }
        }
      }
    });

    creProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (clean && !clean.includes('Update available')) {
          console.log(`  [CRE Error] ${clean}`);
        }
      }
    });

    creProcess.on('close', (code) => {
      console.log('');
      if (success && txHashOutput) {
        console.log('✅ WORKFLOW COMPLETED SUCCESSFULLY');
        console.log(`   Mint TX: ${txHashOutput}`);
        console.log(`   View: https://sepolia.etherscan.io/tx/${txHashOutput}`);
      } else if (code === 0) {
        console.log('⚠️  Workflow finished but mint status unclear');
        console.log('   Check logs above for details');
      } else {
        console.log(`❌ Workflow failed with code ${code}`);
      }
      console.log('');
      console.log('👂 Listening for next event...');
      console.log('');
      resolve({ success, txHash: txHashOutput, logs });
    });
  });
}

/**
 * Process a new event
 */
async function processEvent(user, ethAmount, ethPrice, mintRequestId, depositIndex, event) {
  // ethers v5 compatible - event is the last parameter
  const txHash = event.transactionHash;
  const eventIndex = event.logIndex;
  const eventKey = `${txHash}-${eventIndex}`;
  
  // Skip if already processed
  if (processedEvents.has(eventKey)) {
    return;
  }
  processedEvents.add(eventKey);
  
  // Limit cache size
  if (processedEvents.size > 100) {
    const firstKey = processedEvents.values().next().value;
    processedEvents.delete(firstKey);
  }
  
  const eventData = {
    user: user,
    ethAmount: ethAmount,
    ethPrice: ethPrice,
    mintRequestId: mintRequestId,
    depositIndex: Number(depositIndex),
  };
  
  try {
    await executeWorkflow(txHash, eventIndex, eventData);
  } catch (error) {
    console.error('Error executing workflow:', error.message);
  }
}

// Listen for ETHDeposited events
vault.on('ETHDeposited', (user, ethAmount, ethPrice, mintRequestId, depositIndex, event) => {
  processEvent(user, ethAmount, ethPrice, mintRequestId, depositIndex, event);
});

// Handle errors
provider.on('error', (error) => {
  console.error('Provider error:', error.message);
  console.log('Attempting to reconnect...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Shutting down event listener...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('👋 Shutting down event listener...');
  process.exit(0);
});

// Keep alive
setInterval(() => {
  // Heartbeat to keep connection alive
}, 30000);
