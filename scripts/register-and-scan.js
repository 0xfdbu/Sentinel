#!/usr/bin/env node

/**
 * Register and Scan Script
 * 
 * Quick utility to register a contract with Sentinel and trigger a scan
 * 
 * Usage: node scripts/register-and-scan.js <contract-address>
 * Example: node scripts/register-and-scan.js 0x1234...
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const contractAddress = process.argv[2];
  
  if (!contractAddress) {
    console.log('Usage: node scripts/register-and-scan.js <contract-address>');
    console.log('');
    console.log('Example contracts to scan:');
    
    // Load deployment info
    const deploymentPath = path.join(__dirname, '../contracts/deployments/hardhat.json');
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      console.log(`  PausableVulnerableVault: ${deployment.contracts.PausableVulnerableVault}`);
      console.log(`  SafeVault: ${deployment.contracts.SafeVault}`);
      console.log(`  VulnerableVault (legacy): ${deployment.contracts.VulnerableVault}`);
    }
    process.exit(1);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           SENTINEL REGISTER & SCAN                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../contracts/deployments/hardhat.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('Contracts not deployed. Run: npm run deploy');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const addresses = deployment.contracts;

  // Connect to Hardhat
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // Use first Hardhat account
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Connected: ${wallet.address}`);
  console.log(`Target: ${contractAddress}`);
  console.log(`Registry: ${addresses.SentinelRegistry}`);

  // Load Registry contract
  const registryAbi = [
    'function register(address contractAddr, string calldata metadata) external payable',
    'function isRegistered(address contractAddr) external view returns (bool)',
    'function getRegistration(address contractAddr) external view returns (bool, uint256, uint256, address, string memory)',
  ];

  const registry = new ethers.Contract(addresses.SentinelRegistry, registryAbi, wallet);

  // Check if already registered
  const isRegistered = await registry.isRegistered(contractAddress);
  
  if (isRegistered) {
    console.log('\n✓ Contract already registered');
  } else {
    console.log('\n→ Registering contract...');
    
    try {
      const tx = await registry.register(
        contractAddress,
        'Demo Contract for Sentinel Scan',
        { value: ethers.parseEther('0.01') }
      );
      
      await tx.wait();
      console.log('✓ Contract registered successfully');
    } catch (error) {
      console.error('✗ Registration failed:', error.message);
      process.exit(1);
    }
  }

  // Get registration info
  const reg = await registry.getRegistration(contractAddress);
  console.log(`\nRegistration Info:`);
  console.log(`  Active: ${reg[0]}`);
  console.log(`  Stake: ${ethers.formatEther(reg[1])} ETH`);
  console.log(`  Owner: ${reg[3]}`);
  console.log(`  Metadata: ${reg[4]}`);

  console.log('\n→ Triggering Sentinel scan via CRE...');
  console.log('  (This calls the CRE API backend which triggers the workflow)');
  
  // Call the CRE API to trigger a scan
  try {
    const response = await fetch('http://localhost:3001/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress,
        chainId: 31337,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  SCAN RESULTS                             ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║ Status: ${result.success ? 'SUCCESS ✅' : 'FAILED ❌'}                            ║`);
    
    if (result.result?.scanResult) {
      const scan = result.result.scanResult;
      console.log(`║ Severity: ${scan.severity}                          ║`);
      console.log(`║ Category: ${scan.category}                              ║`);
      console.log(`║ Confidence: ${(scan.confidence * 100).toFixed(0)}%                                ║`);
      console.log(`║ Action: ${result.result.action}                                ║`);
      console.log(`║ Execution Time: ${result.result.executionTime}ms                        ║`);
    }
    
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    if (result.result?.paused) {
      console.log('\n🛡️  EMERGENCY PAUSE EXECUTED');
      console.log('   Contract has been paused by Sentinel!');
    }

  } catch (error) {
    console.error('\n✗ Scan failed:', error.message);
    console.log('\nMake sure the CRE API is running:');
    console.log('  npm run cre:api:dev');
  }

  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
