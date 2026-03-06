import { expect } from "chai";
import { ethers } from "hardhat";
import { PolicyEngine, VolumePolicy, AddressBlacklistPolicy, FunctionSignaturePolicy } from "../typechain";

describe("PolicyEngine", function () {
  let policyEngine: PolicyEngine;
  let volumePolicy: VolumePolicy;
  let blacklistPolicy: AddressBlacklistPolicy;
  let functionSigPolicy: FunctionSignaturePolicy;
  let owner: any;
  let sentinel: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, sentinel, user1, user2] = await ethers.getSigners();

    // Deploy PolicyEngine
    const PolicyEngineFactory = await ethers.getContractFactory("PolicyEngine");
    policyEngine = await PolicyEngineFactory.deploy();

    // Deploy policies
    const VolumePolicyFactory = await ethers.getContractFactory("VolumePolicy");
    volumePolicy = await VolumePolicyFactory.deploy(
      ethers.parseEther("0.001"), // minVolume
      ethers.parseEther("100"),   // maxVolume
      ethers.parseEther("1000")   // dailyVolumeLimit
    );

    const BlacklistPolicyFactory = await ethers.getContractFactory("AddressBlacklistPolicy");
    blacklistPolicy = await BlacklistPolicyFactory.deploy();

    const FunctionSigPolicyFactory = await ethers.getContractFactory("FunctionSignaturePolicy");
    functionSigPolicy = await FunctionSigPolicyFactory.deploy();

    // Authorize sentinel
    await policyEngine.authorizeSentinel(sentinel.address);

    // Add policies to engine
    await policyEngine.addPolicy(await volumePolicy.getAddress(), 100);
    await policyEngine.addPolicy(await blacklistPolicy.getAddress(), 90);
    await policyEngine.addPolicy(await functionSigPolicy.getAddress(), 80);
  });

  describe("Policy Management", function () {
    it("should add policies correctly", async function () {
      const policies = await policyEngine.getAllPolicies();
      expect(policies.length).to.equal(3);
    });

    it("should remove policies correctly", async function () {
      await policyEngine.removePolicy(await volumePolicy.getAddress());
      const policies = await policyEngine.getAllPolicies();
      expect(policies.length).to.equal(2);
    });

    it("should set policy status correctly", async function () {
      await policyEngine.setPolicyStatus(await volumePolicy.getAddress(), false);
      const policies = await policyEngine.getAllPolicies();
      expect(policies[0].isActive).to.be.false;
    });

    it("should update policy priority and sort correctly", async function () {
      await policyEngine.setPolicyPriority(await volumePolicy.getAddress(), 10);
      const policies = await policyEngine.getAllPolicies();
      // Volume policy should now be last (lowest priority)
      expect(await policies[2].policy.getAddress()).to.equal(await volumePolicy.getAddress());
    });
  });

  describe("Sentinel Authorization", function () {
    it("should authorize sentinel correctly", async function () {
      expect(await policyEngine.isAuthorizedSentinel(sentinel.address)).to.be.true;
    });

    it("should revoke sentinel correctly", async function () {
      await policyEngine.revokeSentinel(sentinel.address);
      expect(await policyEngine.isAuthorizedSentinel(sentinel.address)).to.be.false;
    });

    it("should reject unauthorized sentinels", async function () {
      await expect(
        policyEngine.connect(user1).evaluateTransaction(
          user1.address,
          user2.address,
          ethers.parseEther("1"),
          "0x",
          ethers.keccak256("0x1234")
        )
      ).to.be.revertedWithCustomError(policyEngine, "NotAuthorizedSentinel");
    });
  });

  describe("Transaction Evaluation", function () {
    it("should approve compliant transaction", async function () {
      const txHash = ethers.keccak256("0x1234");
      const result = await policyEngine.connect(sentinel).evaluateTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1"),
        "0x",
        txHash
      );

      expect(result.compliant).to.be.true;
      expect(result.highestSeverity).to.equal(0); // SEVERITY_OK
    });

    it("should reject blacklisted address", async function () {
      // Blacklist user1
      await blacklistPolicy.connect(owner).blacklist(user1.address, "Test ban");

      const txHash = ethers.keccak256("0x1234");
      const result = await policyEngine.connect(sentinel).evaluateTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1"),
        "0x",
        txHash
      );

      expect(result.compliant).to.be.false;
      expect(result.failedPolicy).to.include("Blacklist");
    });

    it("should reject transaction exceeding max volume", async function () {
      const txHash = ethers.keccak256("0x1234");
      const result = await policyEngine.connect(sentinel).evaluateTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("200"), // Exceeds 100 ETH max
        "0x",
        txHash
      );

      expect(result.compliant).to.be.false;
      expect(result.failedPolicy).to.include("Volume");
    });

    it("should store evaluation result", async function () {
      const txHash = ethers.keccak256("0x1234");
      await policyEngine.connect(sentinel).evaluateTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1"),
        "0x",
        txHash
      );

      const evaluation = await policyEngine.getEvaluation(txHash);
      expect(evaluation.compliant).to.be.true;
      expect(evaluation.evaluatedAt).to.be.gt(0);
    });
  });

  describe("Pause Threshold", function () {
    it("should set pause threshold correctly", async function () {
      await policyEngine.setPauseThreshold(3); // HIGH
      expect(await policyEngine.pauseThreshold()).to.equal(3);
    });

    it("should reject invalid threshold", async function () {
      await expect(policyEngine.setPauseThreshold(5)).to.be.revertedWithCustomError(
        policyEngine,
        "InvalidThreshold"
      );
    });

    it("should correctly determine if transaction should be paused", async function () {
      // Blacklist user1 (CRITICAL severity)
      await blacklistPolicy.connect(owner).blacklist(user1.address, "Test ban");

      const result = await policyEngine.shouldPauseTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result.shouldPause).to.be.true;
      expect(result.severity).to.equal(4); // SEVERITY_CRITICAL
    });
  });

  describe("Events", function () {
    it("should emit PolicyAdded event", async function () {
      const VolumePolicyFactory = await ethers.getContractFactory("VolumePolicy");
      const newPolicy = await VolumePolicyFactory.deploy(
        ethers.parseEther("0.1"),
        ethers.parseEther("50"),
        ethers.parseEther("500")
      );

      await expect(policyEngine.addPolicy(await newPolicy.getAddress(), 50))
        .to.emit(policyEngine, "PolicyAdded")
        .withArgs(await newPolicy.getAddress(), "Volume Limit Policy", 50);
    });

    it("should emit EvaluationPerformed event", async function () {
      const txHash = ethers.keccak256("0x1234");
      await expect(
        policyEngine.connect(sentinel).evaluateTransaction(
          user1.address,
          user2.address,
          ethers.parseEther("1"),
          "0x",
          txHash
        )
      )
        .to.emit(policyEngine, "EvaluationPerformed")
        .withArgs(txHash, true, 0, "");
    });
  });
});
