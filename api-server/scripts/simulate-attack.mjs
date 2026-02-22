/**
 * Attack Simulation Script - Universal Version
 * 
 * Usage: TARGET_CONTRACT=0x... node simulate-attack.mjs
 * 
 * Simulates an attack on ANY registered contract to trigger:
 * 1. Fraud detection (score 90/100)
 * 2. Emergency pause
 * 3. Confidential rescue (if private balance exists)
 */

import { ethers } from 'ethers';

const RPC_URL = process.env.SEPOLIA_RPC || 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const API_URL = 'http://localhost:3001';

// Get target from env or use default
const TARGET_CONTRACT = process.env.TARGET_CONTRACT || '0x4803E41148cD42629AEeCB174f9FeDFddcccd3c3';
const DEMO_TOKEN = '0x6CEcD1FC8691840C76A173bf807b3d28dF75204e';
const TEE_API = 'https://convergence2026-token-api.cldev.cloud';

// Simulate a flash loan attack transaction
const createAttackTransaction = (target) => {
  const flashLoanSigs = ['0x6318967b', '0xefefaba7'];
  const maliciousData = flashLoanSigs[0] + 
    '000000000000000000000000' + target.slice(2) +
    '0000000000000000000000000000000000000000000000008ac7230489e80000';
  
  return {
    hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    from: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    to: target,
    value: '0x' + (500 * 1e18).toString(16), // 500 ETH
    input: maliciousData,
    gas: 8000000,
    gasPrice: '0x4a817c800',
  };
};

async function simulateAttack() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           🚨 ATTACK SIMULATION - CONFIDENTIAL RESCUE 🚨          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (!PRIVATE_KEY) {
    console.log('❌ PRIVATE_KEY not set');
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('👤 Defender Wallet:', wallet.address);
  console.log('🎯 Target Contract:', TARGET_CONTRACT);
  
  // CHECK: Is the contract registered with our system?
  console.log('\n📋 STEP 0: Checking if contract is registered...\n');
  
  try {
    const registryCheck = await fetch(`${API_URL}/api/contracts/registered`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (registryCheck.ok) {
      const registered = await registryCheck.json();
      const isRegistered = registered.contracts?.some(
        c => c.address.toLowerCase() === TARGET_CONTRACT.toLowerCase()
      );
      
      if (isRegistered) {
        console.log('   ✅ Contract is REGISTERED with Sentinel');
      } else {
        console.log('   ⚠️  Contract NOT registered');
        console.log('   💡 Register it first on the Protect page');
      }
    }
  } catch (e) {
    console.log('   ⚠️  Could not check registration status');
  }

  // Step 1: Check Initial State
  console.log('\n📋 STEP 1: Checking Initial State...\n');
  
  const vaultAbi = [
    "function paused() view returns (bool)",
    "function owner() view returns (address)"
  ];
  
  const targetContract = new ethers.Contract(TARGET_CONTRACT, vaultAbi, provider);
  
  let initialPaused = false;
  let contractOwner = '';
  try {
    initialPaused = await targetContract.paused();
    contractOwner = await targetContract.owner();
    console.log('   Contract Owner:', contractOwner);
    console.log('   Vault Paused:', initialPaused ? '⚠️ YES' : '✅ NO');
    
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.log('\n   ⚠️  WARNING: You are not the contract owner!');
      console.log('   Only owner can pause. Attack simulation will still work for fraud detection.');
    }
  } catch (e) {
    console.log('   ⚠️  Contract may not have pause/owner functions');
  }

  // Check private balance for rescue
  console.log('\n   Checking Private Balance (TEE)...');
  const domain = {
    name: "CompliantPrivateTokenDemo",
    version: "0.0.1",
    chainId: 11155111,
    verifyingContract: "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13"
  };
  
  const timestamp = Math.floor(Date.now() / 1000);
  const types = {
    'Retrieve Balances': [
      { name: 'account', type: 'address' },
      { name: 'timestamp', type: 'uint256' }
    ]
  };
  
  const signature = await wallet.signTypedData(domain, types, {
    account: wallet.address,
    timestamp
  });
  
  const balanceResponse = await fetch(`${TEE_API}/balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: wallet.address, timestamp, auth: signature })
  });
  
  const balanceData = await balanceResponse.json();
  const privateBalance = balanceData.balances?.[0]?.amount || '0';
  console.log('   Private Balance:', ethers.formatUnits(privateBalance, 18), 'DEMO');
 
  if (BigInt(privateBalance) === 0n) {
    console.log('\n   ⚠️  NO PRIVATE BALANCE - Rescue will be skipped');
    console.log('   Deposit DEMO tokens to Chainlink vault first:');
    console.log('   https://convergence2026-token-api.cldev.cloud');
  }

  // Step 2: Trigger Fraud Detection
  console.log('\n📋 STEP 2: Simulating Attack Transaction...\n');
  
  const attackTx = createAttackTransaction(TARGET_CONTRACT);
  console.log('   🎭 Simulated Attack TX:', attackTx.hash.slice(0, 20) + '...');
  console.log('   💸 Value:', ethers.formatEther(attackTx.value), 'ETH');
  console.log('   ⛽ Gas:', attackTx.gas.toLocaleString());
  console.log('   📝 Flash Loan Pattern: YES');
  console.log('   🎯 Target:', TARGET_CONTRACT.slice(0, 20) + '...');
  
  console.log('\n   Sending to fraud detection API...');
  
  const fraudResponse = await fetch(`${API_URL}/api/fraud-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx: attackTx,
      contractAddress: TARGET_CONTRACT
    })
  });
  
  const fraudResult = await fraudResponse.json();
  
  if (!fraudResult.success) {
    console.log('   ❌ Fraud detection failed:', fraudResult.error);
    return;
  }
  
  const detection = fraudResult.data;
  console.log('   ✅ Fraud Detection Result:');
  console.log('      Score:', detection.score, '/ 100');
  console.log('      Factors:', detection.factors?.join(', ') || 'None');
  console.log('      Should Pause:', detection.shouldPause ? '⚠️ YES' : 'NO');
  console.log('      Should Rescue:', detection.shouldRescue ? '⚠️ YES' : 'NO');
  console.log('      Confidence:', (detection.confidence * 100).toFixed(1) + '%');
  
  // Check if fraud detection found the attack
  if (detection.score < 85) {
    console.log('\n   ⚠️  Fraud score too low to trigger automatic pause/rescue');
    console.log('   The contract may not have standard vulnerability patterns.');
  }

  // Step 3: Execute Emergency Pause (if owner)
  if (detection.shouldPause && !initialPaused) {
    console.log('\n📋 STEP 3: Executing Emergency Pause...\n');
    
    try {
      const contractWithSigner = new ethers.Contract(TARGET_CONTRACT, [
        "function pause() external",
        "function paused() view returns (bool)"
      ], wallet);
      
      console.log('   Sending pause transaction...');
      const pauseTx = await contractWithSigner.pause();
      console.log('   ⏳ TX Hash:', pauseTx.hash);
      
      await pauseTx.wait();
      console.log('   ✅ Pause confirmed!');
      
      const isPaused = await contractWithSigner.paused();
      console.log('   Vault Paused:', isPaused ? '✅ YES' : '❌ NO');
    } catch (error) {
      console.log('   ❌ Pause failed:', error.message);
      if (error.message.includes('not owner')) {
        console.log('\n   💡 You must be the contract owner to pause');
      }
    }
  } else {
    console.log('\n   ℹ️  Pause not required, already paused, or not authorized');
  }

  // Step 4: Execute Confidential Rescue
  if (detection.shouldRescue && BigInt(privateBalance) > 0n) {
    console.log('\n📋 STEP 4: Executing Confidential Rescue...\n');
    
    // Generate shielded address
    console.log('   Generating shielded address...');
    const shieldedTimestamp = Math.floor(Date.now() / 1000);
    const shieldedTypes = {
      'Generate Shielded Address': [
        { name: 'account', type: 'address' },
        { name: 'timestamp', type: 'uint256' }
      ]
    };
    
    const shieldedSig = await wallet.signTypedData(domain, shieldedTypes, {
      account: wallet.address,
      timestamp: shieldedTimestamp
    });
    
    const shieldedResponse = await fetch(`${TEE_API}/shielded-address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: wallet.address,
        timestamp: shieldedTimestamp,
        auth: shieldedSig
      })
    });
    
    const shieldedData = await shieldedResponse.json();
    
    if (shieldedData.error) {
      console.log('   ❌ Shielded address generation failed:', shieldedData.error);
      return;
    }
    
    const shieldedAddress = shieldedData.address;
    console.log('   ✅ Shielded Address:', shieldedAddress.slice(0, 20) + '...');
    
    // Execute confidential transfer
    console.log('\n   Executing confidential transfer...');
    const rescueAmount = (BigInt(privateBalance) * 80n / 100n).toString();
    
    const transferTimestamp = Math.floor(Date.now() / 1000);
    const transferTypes = {
      'Private Token Transfer': [
        { name: 'sender', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'flags', type: 'string[]' },
        { name: 'timestamp', type: 'uint256' }
      ]
    };
    
    const transferSig = await wallet.signTypedData(domain, transferTypes, {
      sender: wallet.address,
      recipient: shieldedAddress,
      token: DEMO_TOKEN,
      amount: rescueAmount,
      flags: ['hide-sender'],
      timestamp: transferTimestamp
    });
    
    const transferResponse = await fetch(`${TEE_API}/private-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: wallet.address,
        sender: wallet.address,
        recipient: shieldedAddress,
        token: DEMO_TOKEN,
        amount: rescueAmount,
        flags: ['hide-sender'],
        timestamp: transferTimestamp,
        auth: transferSig
      })
    });
    
    const transferData = await transferResponse.json();
    
    if (transferData.error) {
      console.log('   ❌ Rescue failed:', transferData.error);
      return;
    }
    
    console.log('   ✅ CONFIDENTIAL RESCUE SUCCESSFUL!');
    console.log('   Transaction ID:', transferData.transaction_id);
    console.log('   Amount Rescued:', ethers.formatUnits(rescueAmount, 18), 'DEMO');
    console.log('   Destination:', shieldedAddress.slice(0, 20) + '...');
    console.log('   Privacy: Sender hidden ✅');
    
  } else {
    console.log('\n   ℹ️  Rescue not required or no private balance');
  }

  // Final Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      ATTACK SIMULATION COMPLETE                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Summary:');
  console.log('   • Target:', TARGET_CONTRACT);
  console.log('   • Attack: Flash Loan + 500 ETH Transfer');
  console.log('   • Fraud Score:', detection.score, '/ 100');
  console.log('   • Action:', detection.recommendedAction);
  console.log('   • Auto-Pause:', detection.shouldPause ? '✅ Triggered' : '❌ Skipped');
  console.log('   • Confidential Rescue:', (detection.shouldRescue && BigInt(privateBalance) > 0n) ? '✅ Executed' : '❌ Skipped');
  
  console.log('\n🔒 Attacker Sees:');
  console.log('   • Contract is PAUSED (if owner was able to pause)');
  console.log('   • NO visible rescue transaction on-chain');
  console.log('   • Funds appear "stuck" in vault');
  
  console.log('\n✅ Next Steps:');
  console.log('   1. Frontend shows fraud alert in Command page');
  console.log('   2. Check TEE balance at: https://convergence2026-token-api.cldev.cloud/balances');
  console.log('   3. Verify attacker cannot see rescue transaction on Etherscan');
}

simulateAttack().catch(console.error);
