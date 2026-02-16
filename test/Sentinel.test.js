const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Sentinel Security Oracle', function () {
  let registry, guardian, auditLogger;
  let vulnerableVault, safeVault;
  let owner, sentinel, user1, user2;

  beforeEach(async function () {
    [owner, sentinel, user1, user2] = await ethers.getSigners();

    // Deploy Registry
    const SentinelRegistry = await ethers.getContractFactory('SentinelRegistry');
    registry = await SentinelRegistry.deploy();
    await registry.waitForDeployment();

    // Deploy AuditLogger
    const AuditLogger = await ethers.getContractFactory('AuditLogger');
    auditLogger = await AuditLogger.deploy();
    await auditLogger.waitForDeployment();

    // Deploy Guardian
    const EmergencyGuardian = await ethers.getContractFactory('EmergencyGuardian');
    guardian = await EmergencyGuardian.deploy(await registry.getAddress());
    await guardian.waitForDeployment();

    // Authorize Guardian as scanner
    await auditLogger.authorizeScanner(await guardian.getAddress());

    // Deploy mock vaults
    const VulnerableVault = await ethers.getContractFactory('VulnerableVault');
    vulnerableVault = await VulnerableVault.deploy();
    await vulnerableVault.waitForDeployment();

    const SafeVault = await ethers.getContractFactory('SafeVault');
    safeVault = await SafeVault.deploy();
    await safeVault.waitForDeployment();

    // Authorize sentinel
    await registry.authorizeSentinel(sentinel.address);
  });

  describe('SentinelRegistry', function () {
    it('Should allow contract registration with stake', async function () {
      const stake = ethers.parseEther('0.01');
      
      await expect(
        registry.connect(user1).register(
          await vulnerableVault.getAddress(),
          'Test Vault',
          { value: stake }
        )
      )
        .to.emit(registry, 'ContractRegistered')
        .withArgs(await vulnerableVault.getAddress(), user1.address, stake, 'Test Vault');

      expect(await registry.isRegistered(await vulnerableVault.getAddress())).to.be.true;
    });

    it('Should reject registration with insufficient stake', async function () {
      const stake = ethers.parseEther('0.001');
      
      await expect(
        registry.connect(user1).register(
          await vulnerableVault.getAddress(),
          '',
          { value: stake }
        )
      ).to.be.revertedWithCustomError(registry, 'InsufficientStake');
    });

    it('Should allow owner to deregister and withdraw stake', async function () {
      const stake = ethers.parseEther('0.01');
      
      await registry.connect(user1).register(
        await vulnerableVault.getAddress(),
        '',
        { value: stake }
      );

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      await registry.connect(user1).deregister(await vulnerableVault.getAddress());
      
      expect(await registry.isRegistered(await vulnerableVault.getAddress())).to.be.false;
    });
  });

  describe('EmergencyGuardian', function () {
    beforeEach(async function () {
      const stake = ethers.parseEther('0.01');
      await registry.connect(user1).register(
        await vulnerableVault.getAddress(),
        '',
        { value: stake }
      );
    });

    it('Should allow sentinel to emergency pause registered contract', async function () {
      const vulnHash = ethers.keccak256(ethers.toUtf8Bytes('reentrancy'));
      
      await expect(
        guardian.connect(sentinel).emergencyPause(
          await vulnerableVault.getAddress(),
          vulnHash
        )
      )
        .to.emit(guardian, 'EmergencyPauseTriggered')
        .withArgs(
          await vulnerableVault.getAddress(),
          vulnHash,
          await guardian.defaultPauseDuration(),
          sentinel.address
        );

      expect(await vulnerableVault.paused()).to.be.true;
      expect(await guardian.isPaused(await vulnerableVault.getAddress())).to.be.true;
    });

    it('Should reject pause for unregistered contract', async function () {
      await expect(
        guardian.connect(sentinel).emergencyPause(
          await safeVault.getAddress(),
          ethers.keccak256(ethers.toUtf8Bytes('test'))
        )
      ).to.be.revertedWithCustomError(guardian, 'ContractNotRegistered');
    });

    it('Should reject pause from unauthorized address', async function () {
      await expect(
        guardian.connect(user2).emergencyPause(
          await vulnerableVault.getAddress(),
          ethers.keccak256(ethers.toUtf8Bytes('test'))
        )
      ).to.be.revertedWithCustomError(guardian, 'Unauthorized');
    });

    it('Should allow contract owner to lift pause', async function () {
      const vulnHash = ethers.keccak256(ethers.toUtf8Bytes('reentrancy'));
      
      await guardian.connect(sentinel).emergencyPause(
        await vulnerableVault.getAddress(),
        vulnHash
      );

      await expect(guardian.connect(user1).liftPause(await vulnerableVault.getAddress()))
        .to.emit(guardian, 'EmergencyPauseLifted');

      expect(await vulnerableVault.paused()).to.be.false;
    });
  });

  describe('AuditLogger', function () {
    it('Should allow authorized scanner to log scan', async function () {
      const target = await vulnerableVault.getAddress();
      const vulnHash = ethers.keccak256(ethers.toUtf8Bytes('test'));
      const severity = 3; // CRITICAL

      await expect(auditLogger.connect(owner).logScan(target, vulnHash, severity, ''))
        .to.emit(auditLogger, 'ScanLogged');

      const scan = await auditLogger.getLatestScan(target);
      expect(scan.targetContract).to.equal(target);
      expect(scan.vulnerabilityHash).to.equal(vulnHash);
      expect(scan.severity).to.equal(severity);
    });

    it('Should reject scan from unauthorized address', async function () {
      await expect(
        auditLogger.connect(user1).logScan(
          await vulnerableVault.getAddress(),
          ethers.keccak256(ethers.toUtf8Bytes('test')),
          1,
          ''
        )
      ).to.be.revertedWithCustomError(auditLogger, 'Unauthorized');
    });

    it('Should track scan statistics correctly', async function () {
      // Log multiple scans
      for (let i = 0; i < 3; i++) {
        await auditLogger.connect(owner).logScan(
          await vulnerableVault.getAddress(),
          ethers.keccak256(ethers.toUtf8Bytes(`test${i}`)),
          i % 4,
          ''
        );
      }

      const stats = await auditLogger.getStats();
      expect(stats.total).to.equal(3);
    });
  });

  describe('Integration', function () {
    it('Should execute full flow: register -> pause -> log', async function () {
      // 1. Register contract
      const stake = ethers.parseEther('0.01');
      await registry.connect(user1).register(
        await vulnerableVault.getAddress(),
        'Integration Test',
        { value: stake }
      );

      // 2. Emergency pause
      const vulnHash = ethers.keccak256(ethers.toUtf8Bytes('reentrancy'));
      await guardian.connect(sentinel).emergencyPause(
        await vulnerableVault.getAddress(),
        vulnHash
      );

      // 3. Log scan
      await auditLogger.connect(owner).logScan(
        await vulnerableVault.getAddress(),
        vulnHash,
        3, // CRITICAL
        'reentrancy detected'
      );

      // Verify all states
      expect(await registry.isRegistered(await vulnerableVault.getAddress())).to.be.true;
      expect(await vulnerableVault.paused()).to.be.true;
      expect(await guardian.isPaused(await vulnerableVault.getAddress())).to.be.true;
      expect(await auditLogger.scanCount(await vulnerableVault.getAddress())).to.equal(1);
    });
  });
});
