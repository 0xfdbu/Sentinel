#!/usr/bin/env node

/**
 * Deploy New Sentinel Contracts
 * 
 * This script deploys the new contracts added for Risk & Compliance:
 * - PausableVulnerableVault (OpenZeppelin-based)
 * - MockERC20
 * - ReentrancyAttacker
 * - ReserveHealthMonitor
 * - RiskProfileRegistry
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-new-contracts.js --network hardhat
 *   npx hardhat run scripts/deploy-new-contracts.js --network sepolia
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     SENTINEL NEW CONTRACTS DEPLOYMENT                     ║');
  console.log(`║     Network: ${networkName.padEnd(42)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log('Deployer:', deployer.address);
  console.log('Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
  console.log('');

  // Load existing addresses
  let existingAddresses = {};
  const deploymentPath = path.join(__dirname, '../deployments', `${networkName}.json`);
  
  if (fs.existsSync(deploymentPath)) {
    existingAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8')).contracts || {};
    console.log('Found existing deployment, loading addresses...\n');
  }

  const addresses = { ...existingAddresses };
  const newDeployments = [];

  // 1. Deploy MockERC20
  console.log('[1/5] Deploying MockERC20...');
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const mockToken = await MockERC20.deploy('Mock DAI', 'mDAI', 18);
  await mockToken.waitForDeployment();
  addresses.MockERC20 = await mockToken.getAddress();
  newDeployments.push(['MockERC20', addresses.MockERC20]);
  console.log('✓ MockERC20:', addresses.MockERC20);

  // 2. Deploy PausableVulnerableVault
  console.log('\n[2/5] Deploying PausableVulnerableVault...');
  const PausableVulnerableVault = await ethers.getContractFactory('PausableVulnerableVault');
  const pausableVault = await PausableVulnerableVault.deploy(addresses.MockERC20);
  await pausableVault.waitForDeployment();
  addresses.PausableVulnerableVault = await pausableVault.getAddress();
  newDeployments.push(['PausableVulnerableVault', addresses.PausableVulnerableVault]);
  console.log('✓ PausableVulnerableVault:', addresses.PausableVulnerableVault);

  // 3. Deploy ReentrancyAttacker
  console.log('\n[3/5] Deploying ReentrancyAttacker...');
  const ReentrancyAttacker = await ethers.getContractFactory('ReentrancyAttacker');
  const attacker = await ReentrancyAttacker.deploy(
    addresses.PausableVulnerableVault,
    addresses.MockERC20
  );
  await attacker.waitForDeployment();
  addresses.ReentrancyAttacker = await attacker.getAddress();
  newDeployments.push(['ReentrancyAttacker', addresses.ReentrancyAttacker]);
  console.log('✓ ReentrancyAttacker:', addresses.ReentrancyAttacker);

  // Get Registry and Guardian addresses (must exist)
  const registryAddress = addresses.SentinelRegistry || process.env.REGISTRY_ADDRESS;
  const guardianAddress = addresses.EmergencyGuardian || process.env.GUARDIAN_ADDRESS;

  if (!registryAddress || !guardianAddress) {
    console.error('\n❌ Error: SentinelRegistry and EmergencyGuardian must be deployed first!');
    console.log('Run: npx hardhat run scripts/deploy.js --network', networkName);
    process.exit(1);
  }

  // 4. Deploy ReserveHealthMonitor
  console.log('\n[4/5] Deploying ReserveHealthMonitor...');
  const ReserveHealthMonitor = await ethers.getContractFactory('ReserveHealthMonitor');
  const reserveHealth = await ReserveHealthMonitor.deploy(registryAddress, guardianAddress);
  await reserveHealth.waitForDeployment();
  addresses.ReserveHealthMonitor = await reserveHealth.getAddress();
  newDeployments.push(['ReserveHealthMonitor', addresses.ReserveHealthMonitor]);
  console.log('✓ ReserveHealthMonitor:', addresses.ReserveHealthMonitor);

  // 5. Deploy RiskProfileRegistry
  console.log('\n[5/5] Deploying RiskProfileRegistry...');
  const RiskProfileRegistry = await ethers.getContractFactory('RiskProfileRegistry');
  const riskProfile = await RiskProfileRegistry.deploy(registryAddress);
  await riskProfile.waitForDeployment();
  addresses.RiskProfileRegistry = await riskProfile.getAddress();
  newDeployments.push(['RiskProfileRegistry', addresses.RiskProfileRegistry]);
  console.log('✓ RiskProfileRegistry:', addresses.RiskProfileRegistry);

  // Fund the attacker with tokens for testing
  console.log('\n[Bonus] Funding attacker with tokens...');
  const fundAmount = ethers.parseEther('1000');
  await (await mockToken.transfer(addresses.ReentrancyAttacker, fundAmount)).wait();
  console.log('✓ Sent 1000 mDAI to attacker');

  // Mint tokens to deployer
  console.log('[Bonus] Minting tokens to deployer...');
  const mintAmount = ethers.parseEther('10000');
  await (await mockToken.mint(deployer.address, mintAmount)).wait();
  console.log('✓ Minted 10000 mDAI to deployer');

  // Save deployment info
  console.log('\n[Save] Saving deployment info...');
  
  const deploymentInfo = {
    network: networkName,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: addresses,
    newDeployments: newDeployments,
  };

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('✓ Saved to:', deploymentPath);

  // Also update hardhat-latest for frontend
  if (networkName === 'hardhat') {
    const latestPath = path.join(deploymentsDir, 'hardhat-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify({
      addresses: {
        registry: registryAddress,
        guardian: guardianAddress,
        auditLogger: addresses.AuditLogger,
        mockToken: addresses.MockERC20,
        pausableVault: addresses.PausableVulnerableVault,
        reentrancyAttacker: addresses.ReentrancyAttacker,
        reserveHealthMonitor: addresses.ReserveHealthMonitor,
        riskProfileRegistry: addresses.RiskProfileRegistry,
      }
    }, null, 2));
    console.log('✓ Updated hardhat-latest.json for frontend');
  }

  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              DEPLOYMENT COMPLETE                          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  
  newDeployments.forEach(([name, addr]) => {
    const line = `║  ${name.padEnd(25)} ${addr.slice(0, 20)}...        ║`;
    console.log(line);
  });
  
  console.log('║                                                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Verification Commands:                                   ║');
  
  if (networkName !== 'hardhat') {
    console.log(`║  npx hardhat verify --network ${networkName.padEnd(36)}║`);
    console.log(`║    ${addresses.PausableVulnerableVault.slice(0, 20)}... ${addresses.MockERC20.slice(0, 20)}...  ║`);
  } else {
    console.log('║  (Verification not needed on Hardhat)                     ║');
  }
  
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Print for easy copy-paste
  console.log('📋 Copy-paste for .env:');
  console.log('---');
  newDeployments.forEach(([name, addr]) => {
    const envName = name.toUpperCase().replace(/([A-Z])/g, '_$1').slice(1);
    console.log(`${networkName.toUpperCase()}_${envName}=${addr}`);
  });
  console.log('---\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
