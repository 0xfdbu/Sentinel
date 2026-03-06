import { expect } from "chai";
import { ethers } from "hardhat";
import { AddressBlacklistPolicy } from "../typechain";

describe("AddressBlacklistPolicy", function () {
  let blacklistPolicy: AddressBlacklistPolicy;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const BlacklistPolicyFactory = await ethers.getContractFactory("AddressBlacklistPolicy");
    blacklistPolicy = await BlacklistPolicyFactory.deploy();
  });

  describe("Deployment", function () {
    it("should set correct name and version", async function () {
      expect(await blacklistPolicy.name()).to.equal("Address Blacklist Policy");
      expect(await blacklistPolicy.version()).to.equal("1.0.0");
    });

    it("should be active by default", async function () {
      expect(await blacklistPolicy.isActive()).to.be.true;
    });
  });

  describe("Blacklist Management", function () {
    it("should allow owner to blacklist an address", async function () {
      await expect(blacklistPolicy.blacklist(addr1.address, "Suspicious activity"))
        .to.emit(blacklistPolicy, "AddressBlacklisted")
        .withArgs(addr1.address, "Suspicious activity");

      expect(await blacklistPolicy.isBlacklisted(addr1.address)).to.be.true;
    });

    it("should allow owner to unblacklist an address", async function () {
      await blacklistPolicy.blacklist(addr1.address, "Test");
      
      await expect(blacklistPolicy.unblacklist(addr1.address))
        .to.emit(blacklistPolicy, "AddressUnblacklisted")
        .withArgs(addr1.address);

      expect(await blacklistPolicy.isBlacklisted(addr1.address)).to.be.false;
    });

    it("should store reason for blacklisting", async function () {
      await blacklistPolicy.blacklist(addr1.address, "Known scammer");
      expect(await blacklistPolicy.getBlacklistReason(addr1.address)).to.equal("Known scammer");
    });

    it("should batch blacklist multiple addresses", async function () {
      const addresses = [addr1.address, addr2.address, addr3.address];
      const reasons = ["Reason 1", "Reason 2", "Reason 3"];

      await blacklistPolicy.batchBlacklist(addresses, reasons);

      expect(await blacklistPolicy.isBlacklisted(addr1.address)).to.be.true;
      expect(await blacklistPolicy.isBlacklisted(addr2.address)).to.be.true;
      expect(await blacklistPolicy.isBlacklisted(addr3.address)).to.be.true;
    });

    it("should revert when non-owner tries to blacklist", async function () {
      await expect(
        blacklistPolicy.connect(addr1).blacklist(addr2.address, "Test")
      ).to.be.revertedWithCustomError(blacklistPolicy, "OwnableUnauthorizedAccount");
    });

    it("should revert when blacklisting zero address", async function () {
      await expect(
        blacklistPolicy.blacklist(ethers.ZeroAddress, "Test")
      ).to.be.revertedWithCustomError(blacklistPolicy, "InvalidAddress");
    });

    it("should revert when blacklisting already blacklisted address", async function () {
      await blacklistPolicy.blacklist(addr1.address, "Test");
      await expect(
        blacklistPolicy.blacklist(addr1.address, "Test again")
      ).to.be.revertedWithCustomError(blacklistPolicy, "AlreadyBlacklisted");
    });
  });

  describe("Policy Evaluation", function () {
    it("should return compliant for non-blacklisted address", async function () {
      const result = await blacklistPolicy.evaluate(
        addr1.address,
        addr2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result[0]).to.be.true; // compliant
      expect(result[2]).to.equal(0); // severity
    });

    it("should return non-compliant for blacklisted sender", async function () {
      await blacklistPolicy.blacklist(addr1.address, "Malicious actor");

      const result = await blacklistPolicy.evaluate(
        addr1.address,
        addr2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result[0]).to.be.false; // not compliant
      expect(result[1]).to.include("blacklisted"); // reason
      expect(result[2]).to.equal(4); // CRITICAL severity
    });

    it("should return non-compliant for blacklisted recipient", async function () {
      await blacklistPolicy.blacklist(addr2.address, "Malicious actor");

      const result = await blacklistPolicy.evaluate(
        addr1.address,
        addr2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result[0]).to.be.false; // not compliant
      expect(result[2]).to.equal(4); // CRITICAL severity
    });

    it("should return compliant when policy is inactive", async function () {
      await blacklistPolicy.blacklist(addr1.address, "Test");
      await blacklistPolicy.setActive(false);

      const result = await blacklistPolicy.evaluate(
        addr1.address,
        addr2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result[0]).to.be.true; // compliant (policy not active)
    });
  });

  describe("Blacklist Count", function () {
    it("should track blacklist count correctly", async function () {
      expect(await blacklistPolicy.getBlacklistCount()).to.equal(0);

      await blacklistPolicy.blacklist(addr1.address, "Test 1");
      expect(await blacklistPolicy.getBlacklistCount()).to.equal(1);

      await blacklistPolicy.blacklist(addr2.address, "Test 2");
      expect(await blacklistPolicy.getBlacklistCount()).to.equal(2);

      await blacklistPolicy.unblacklist(addr1.address);
      expect(await blacklistPolicy.getBlacklistCount()).to.equal(1);
    });
  });
});
