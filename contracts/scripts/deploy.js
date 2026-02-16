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

  // Authorize Guardian as scanner in AuditLogger
  console.log('\nAuthorizing Guardian in AuditLogger...');
  await (await auditLogger.authorizeScanner(guardianAddress)).wait();
  console.log('Guardian authorized as scanner');

  // Deploy mock contracts for testing
  console.log('\nDeploying mock contracts for testing...');
  
  const VulnerableVault = await ethers.getContractFactory('VulnerableVault');
  const vulnerableVault = await VulnerableVault.deploy();
  await vulnerableVault.waitForDeployment();
  console.log('VulnerableVault deployed to:', await vulnerableVault.getAddress());

  const SafeVault = await ethers.getContractFactory('SafeVault');
  const safeVault = await SafeVault.deploy();
  await safeVault.waitForDeployment();
  console.log('SafeVault deployed to:', await safeVault.getAddress());

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

  // Print summary
  console.log('\n=== DEPLOYMENT SUMMARY ===');
  console.log('Registry:', registryAddress);
  console.log('AuditLogger:', auditLoggerAddress);
  console.log('Guardian:', guardianAddress);
  console.log('==========================\n');

  // Verification instructions
  if (network.name !== 'hardhat') {
    console.log('To verify contracts on Etherscan, run:');
    console.log(`npx hardhat verify --network ${network.name} ${registryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${auditLoggerAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${guardianAddress} ${registryAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
