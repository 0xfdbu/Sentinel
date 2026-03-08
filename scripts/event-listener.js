#!/usr/bin/env node
/**
 * Sentinel Event Listener
 * 
 * Watches for:
 * 1. ETHDeposited events from SentinelVault → Triggers eth-por-unified workflow (mint USDA)
 * 2. Transfer events from USDA token → Triggers usda-freeze-sentinel workflow (scam detection)
 * 
 * This simulates production behavior where workflows auto-trigger on the DON.
 * 
 * Usage:
 *   node scripts/event-listener.js
 */

const { ethers } = require('ethers');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
  // Sepolia RPC - uses environment variable or defaults to public node
  rpcUrl: process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
  
  // Contract addresses
  vaultAddress: '0x12fe97b889158380e1D94b69718F89E521b38c11',
  usdaTokenAddress: '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45',
  
  // CRE settings
  creBin: '/home/user/.cre/bin/cre',
  mintWorkflowDir: path.resolve(__dirname, '../workflows/eth-por-unified'),
  freezeWorkflowDir: path.resolve(__dirname, '../workflows/usda-freeze-sentinel'),
  projectRoot: path.resolve(__dirname, '..'),
  
  // Polling interval
  pollInterval: 5000,
};

// Contract ABIs
const VAULT_ABI = [
  'event ETHDeposited(address indexed user, uint256 ethAmount, uint256 ethPrice, bytes32 mintRequestId, uint256 depositIndex)'
];

const USDA_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Zero address for filtering mints/burns
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Track processed events to avoid duplicates
const processedEvents = new Set();
const processingEvents = new Set();

// Workflow queue for sequential execution
let workflowQueue = Promise.resolve();
const WORKFLOW_DELAY_MS = 8000; // Delay between workflows

/**
 * Queue a workflow for sequential execution
 */
async function queueWorkflow(eventKey, workflowFn) {
  // Skip if already being processed
  if (processingEvents.has(eventKey)) {
    console.log(`  ⏭️  Event ${eventKey} already queued, skipping`);
    return;
  }
  processingEvents.add(eventKey);
  
  workflowQueue = workflowQueue
    .then(() => workflowFn())
    .then(() => new Promise(r => setTimeout(r, WORKFLOW_DELAY_MS))) // Delay between workflows
    .catch(err => {
      console.error('Workflow error:', err.message);
    })
    .finally(() => {
      processingEvents.delete(eventKey);
    });
  
  return workflowQueue;
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           🎯 SENTINEL EVENT LISTENER (SIMULATION)              ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Configuration:');
console.log(`  RPC: ${CONFIG.rpcUrl}`);
console.log(`  Vault: ${CONFIG.vaultAddress}`);
console.log(`  USDA: ${CONFIG.usdaTokenAddress}`);
console.log('');
console.log('👂 Listening for events:');
console.log('   1. ETHDeposited → Mint USDA (eth-por-unified)');
console.log('   2. Transfer → Scam Check (usda-freeze-sentinel)');
console.log('');

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider(CONFIG.rpcUrl);
const vault = new ethers.Contract(CONFIG.vaultAddress, VAULT_ABI, provider);
const usda = new ethers.Contract(CONFIG.usdaTokenAddress, USDA_ABI, provider);

/**
 * Get transaction-local event index
 */
async function getEventIndex(txHash, globalLogIndex) {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt && receipt.logs) {
      const localIndex = receipt.logs.findIndex(log => log.logIndex === globalLogIndex);
      if (localIndex !== -1) return localIndex;
    }
  } catch (e) {
    console.log(`  ⚠️ Could not get receipt: ${e.message}`);
  }
  return 0;
}

/**
 * Execute CRE workflow
 */
async function executeCREWorkflow(txHash, eventIndex, workflowDir, workflowType) {
  return new Promise((resolve) => {
    const logs = [];
    let success = false;
    let txHashOutput = null;

    const creProcess = spawn(CONFIG.creBin, [
      'workflow', 'simulate', workflowDir,
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

    // Pipe CRE output directly to preserve colors
    creProcess.stdout.pipe(process.stdout);
    creProcess.stderr.pipe(process.stderr);
    
    // Capture logs for parsing
    creProcess.stdout.on('data', (data) => {
      const text = data.toString();
      logs.push(text);
      
      const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
      if (clean.includes('SUCCESS') && clean.includes('0x')) {
        const match = clean.match(/0x[a-fA-F0-9]{64}/);
        if (match) {
          success = true;
          txHashOutput = match[0];
        }
      }
    });

    creProcess.on('close', (code) => {
      console.log('');
      if (success && txHashOutput) {
        console.log(`✅ ${workflowType} WORKFLOW COMPLETED`);
        console.log(`   TX: ${txHashOutput}`);
        console.log(`   View: https://sepolia.etherscan.io/tx/${txHashOutput}`);
      } else if (code !== 0) {
        console.log(`❌ ${workflowType} workflow failed with code ${code}`);
      }
      console.log('');
      console.log('👂 Listening for next event...');
      console.log('');
      resolve({ success, txHash: txHashOutput, logs });
    });
  });
}

/**
 * Process ETHDeposited event (Mint workflow)
 */
async function processDepositEvent(user, ethAmount, ethPrice, mintRequestId, depositIndex, event) {
  const txHash = event.transactionHash;
  const globalLogIndex = event.logIndex;
  const eventKey = `deposit-${txHash}-${globalLogIndex}`;
  
  if (processedEvents.has(eventKey)) return;
  processedEvents.add(eventKey);
  
  // Limit cache
  if (processedEvents.size > 200) {
    const firstKey = processedEvents.values().next().value;
    processedEvents.delete(firstKey);
  }
  
  const eventIndex = await getEventIndex(txHash, globalLogIndex);
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 ETH DEPOSITED - Triggering Mint Workflow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Transaction: ${txHash}`);
  console.log(`  User: ${user}`);
  console.log(`  ETH Amount: ${ethers.utils.formatEther(ethAmount)} ETH`);
  console.log(`  ETH Price: $${(Number(ethPrice) / 1e8).toFixed(2)}`);
  console.log(`  Deposit Index: ${depositIndex}`);
  console.log('');
  console.log('⏳ Queuing eth-por-unified workflow...');
  console.log(`   (Sequential execution: 8s delay between workflows)`);
  console.log('');

  // Queue workflow to avoid nonce conflicts
  await queueWorkflow(eventKey, async () => {
    console.log(`   🔄 Starting mint workflow for deposit #${depositIndex}...`);
    try {
      await executeCREWorkflow(txHash, eventIndex, CONFIG.mintWorkflowDir, 'MINT');
    } catch (error) {
      console.error('Error executing mint workflow:', error.message);
    }
  });
}

/**
 * Process Transfer event (Freeze workflow)
 */
async function processTransferEvent(from, to, value, event) {
  const txHash = event.transactionHash;
  const globalLogIndex = event.logIndex;
  const eventKey = `transfer-${txHash}-${globalLogIndex}`;
  
  if (processedEvents.has(eventKey)) return;
  processedEvents.add(eventKey);
  
  // Limit cache
  if (processedEvents.size > 200) {
    const firstKey = processedEvents.values().next().value;
    processedEvents.delete(firstKey);
  }
  
  // Skip mints (from zero) and burns (to zero)
  if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) {
    return;
  }
  
  const eventIndex = await getEventIndex(txHash, globalLogIndex);
  const usdaAmount = ethers.utils.formatUnits(value, 6); // USDA has 6 decimals
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 USDA TRANSFER - Triggering Freeze Sentinel');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Transaction: ${txHash}`);
  console.log(`  From: ${from}`);
  console.log(`  To: ${to}`);
  console.log(`  Amount: ${usdaAmount} USDA`);
  console.log('');
  console.log('⏳ Queuing usda-freeze-sentinel workflow...');
  console.log('   (GoPlus + ScamSniffer + Sanctions + xAI Analysis)');
  console.log(`   (Sequential execution: 8s delay between workflows)`);
  console.log('');

  // Queue workflow to avoid nonce conflicts
  await queueWorkflow(eventKey, async () => {
    console.log(`   🔄 Starting freeze workflow for transfer...`);
    try {
      await executeCREWorkflow(txHash, eventIndex, CONFIG.freezeWorkflowDir, 'FREEZE');
    } catch (error) {
      console.error('Error executing freeze workflow:', error.message);
    }
  });
}

// Listen for ETHDeposited events
vault.on('ETHDeposited', (user, ethAmount, ethPrice, mintRequestId, depositIndex, event) => {
  processDepositEvent(user, ethAmount, ethPrice, mintRequestId, depositIndex, event);
});

// Listen for Transfer events
usda.on('Transfer', (from, to, value, event) => {
  processTransferEvent(from, to, value, event);
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
setInterval(() => {}, 30000);
