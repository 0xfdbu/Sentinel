const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy SentinelRegistry
  console.log('\nDeploying SentinelRegistry...');
  const SentinelRegistry = await ethers.getContractFactory('SentinelRegistry');
  const registry = await SentinelRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log('SentinelRegistry deployed to:', registryAddress);

  // Deploy AuditLogger
  console.log('\nDeploying AuditLogger...');
  const AuditLogger = await ethers.getContractFactory('AuditLogger');
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.waitForDeployment();
  const auditLoggerAddress = await auditLogger.getAddress();
  console.log('AuditLogger deployed to:', auditLoggerAddress);

  // Deploy EmergencyGuardian
  console.log('\nDeploying EmergencyGuardian...');
  const EmergencyGuardian = await ethers.getContractFactory('EmergencyGuardian');
  const guardian = await EmergencyGuardian.deploy(registryAddress);
  await guardian.waitForDeployment();
  const guardianAddress = await guardian.getAddress();
  console.log('EmergencyGuardian deployed to:', guardianAddress);

  // Deploy ReserveHealthMonitor (Risk & Compliance feature)
  console.log('\nDeploying ReserveHealthMonitor...');
  const ReserveHealthMonitor = await ethers.getContractFactory('ReserveHealthMonitor');
  const reserveHealth = await ReserveHealthMonitor.deploy(registryAddress, guardianAddress);
  await reserveHealth.waitForDeployment();
  const reserveHealthAddress = await reserveHealth.getAddress();
  console.log('ReserveHealthMonitor deployed to:', reserveHealthAddress);

  // Deploy RiskProfileRegistry (Risk & Compliance feature)
  console.log('\nDeploying RiskProfileRegistry...');
  const RiskProfileRegistry = await ethers.getContractFactory('RiskProfileRegistry');
  const riskProfile = await RiskProfileRegistry.deploy(registryAddress);
  await riskProfile.waitForDeployment();
  const riskProfileAddress = await riskProfile.getAddress();
  console.log('RiskProfileRegistry deployed to:', riskProfileAddress);

  // Authorize Guardian as scanner in AuditLogger
  console.log('\nAuthorizing Guardian in AuditLogger...');
  await (await auditLogger.authorizeScanner(guardianAddress)).wait();
  console.log('Guardian authorized as scanner');

  // Authorize ReserveHealthMonitor as updater
  console.log('\nAuthorizing ReserveHealthMonitor...');
  await (await reserveHealth.authorizeUpdater(guardianAddress)).wait();
  console.log('Guardian authorized as ReserveHealthMonitor updater');

  // Deploy mock token for vault
  console.log('\nDeploying MockERC20 token...');
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const mockToken = await MockERC20.deploy('Mock DAI', 'mDAI', 18);
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log('MockERC20 deployed to:', mockTokenAddress);

  // Deploy the NEW PausableVulnerableVault (OpenZeppelin-based)
  console.log('\nDeploying PausableVulnerableVault (OpenZeppelin-based)...');
  const PausableVulnerableVault = await ethers.getContractFactory('PausableVulnerableVault');
  const pausableVault = await PausableVulnerableVault.deploy(mockTokenAddress);
  await pausableVault.waitForDeployment();
  const pausableVaultAddress = await pausableVault.getAddress();
  console.log('PausableVulnerableVault deployed to:', pausableVaultAddress);

  // Deploy ReentrancyAttacker
  console.log('\nDeploying ReentrancyAttacker...');
  const ReentrancyAttacker = await ethers.getContractFactory('ReentrancyAttacker');
  const attacker = await ReentrancyAttacker.deploy(pausableVaultAddress, mockTokenAddress);
  await attacker.waitForDeployment();
  const attackerAddress = await attacker.getAddress();
  console.log('ReentrancyAttacker deployed to:', attackerAddress);

  // Deploy legacy mock contracts for backward compatibility
  console.log('\nDeploying legacy mock contracts...');
  
  const VulnerableVault = await ethers.getContractFactory('VulnerableVault');
  const vulnerableVault = await VulnerableVault.deploy();
  await vulnerableVault.waitForDeployment();
  console.log('VulnerableVault (legacy) deployed to:', await vulnerableVault.getAddress());

  const SafeVault = await ethers.getContractFactory('SafeVault');
  const safeVault = await SafeVault.deploy();
  await safeVault.waitForDeployment();
  console.log('SafeVault deployed to:', await safeVault.getAddress());

  // Fund the attacker with some tokens for testing
  console.log('\nFunding attacker with tokens for testing...');
  const fundAmount = ethers.parseEther('1000');
  await (await mockToken.transfer(attackerAddress, fundAmount)).wait();
  console.log(`Transferred ${ethers.formatEther(fundAmount)} mDAI to attacker`);

  // Mint tokens to deployer for vault testing
  console.log('Minting tokens to deployer...');
  const mintAmount = ethers.parseEther('10000');
  await (await mockToken.mint(deployer.address, mintAmount)).wait();
  console.log(`Minted ${ethers.formatEther(mintAmount)} mDAI to deployer`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      SentinelRegistry: registryAddress,
      AuditLogger: auditLoggerAddress,
      EmergencyGuardian: guardianAddress,
      ReserveHealthMonitor: reserveHealthAddress,
      RiskProfileRegistry: riskProfileAddress,
      MockERC20: mockTokenAddress,
      PausableVulnerableVault: pausableVaultAddress,
      ReentrancyAttacker: attackerAddress,
      VulnerableVault: await vulnerableVault.getAddress(),
      SafeVault: await safeVault.getAddress(),
    },
  };

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${filename}`);

  // Also save as latest for frontend
  const latestFilename = path.join(deploymentsDir, 'hardhat-latest.json');
  fs.writeFileSync(latestFilename, JSON.stringify({
    addresses: {
      registry: registryAddress,
      guardian: guardianAddress,
      auditLogger: auditLoggerAddress,
      reserveHealthMonitor: reserveHealthAddress,
      riskProfileRegistry: riskProfileAddress,
      mockToken: mockTokenAddress,
      pausableVault: pausableVaultAddress,
      reentrancyAttacker: attackerAddress,
    }
  }, null, 2));

  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              DEPLOYMENT SUMMARY                           ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║ Core Sentinel Contracts:                                  ║');
  console.log(`║   Registry:           ${registryAddress}            ║`);
  console.log(`║   AuditLogger:        ${auditLoggerAddress}            ║`);
  console.log(`║   Guardian:           ${guardianAddress}            ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║ Risk & Compliance (NEW):                                  ║');
  console.log(`║   ReserveHealth:      ${reserveHealthAddress}            ║`);
  console.log(`║   RiskProfile:        ${riskProfileAddress}            ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║ Demo Contracts (NEW - OpenZeppelin Pausable):             ║');
  console.log(`║   MockToken:          ${mockTokenAddress}            ║`);
  console.log(`║   PausableVault:      ${pausableVaultAddress}            ║`);
  console.log(`║   Attacker:           ${attackerAddress}            ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║ Demo Actions:                                             ║');
  console.log('║   1. Register PausableVault in Sentinel                   ║');
  console.log('║   2. Deposit mDAI into PausableVault                      ║');
  console.log('║   3. Trigger attack via ReentrancyAttacker                ║');
  console.log('║   4. Watch Sentinel pause the vault automatically         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Verification instructions
  if (network.name !== 'hardhat') {
    console.log('\nTo verify contracts on Etherscan, run:');
    console.log(`npx hardhat verify --network ${network.name} ${registryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${auditLoggerAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${guardianAddress} ${registryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${reserveHealthAddress} ${registryAddress} ${guardianAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${riskProfileAddress} ${registryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${mockTokenAddress} "Mock DAI" "mDAI" 18`);
    console.log(`npx hardhat verify --network ${network.name} ${pausableVaultAddress} ${mockTokenAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${attackerAddress} ${pausableVaultAddress} ${mockTokenAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
