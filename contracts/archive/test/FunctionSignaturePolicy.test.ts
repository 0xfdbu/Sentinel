import { expect } from "chai";
import { ethers } from "hardhat";
import { FunctionSignaturePolicy } from "../typechain";

describe("FunctionSignaturePolicy", function () {
  let functionSigPolicy: FunctionSignaturePolicy;
  let owner: any;
  let user1: any;
  let user2: any;

  // Common function signatures
  const TRANSFER_SIG = "0xa9059cbb"; // transfer(address,uint256)
  const APPROVE_SIG = "0x095ea7b3"; // approve(address,uint256)
  const TRANSFER_FROM_SIG = "0x23b872dd"; // transferFrom(address,address,uint256)
  const MINT_SIG = "0x40c10f19"; // mint(address,uint256)
  const BURN_SIG = "0x42966c68"; // burn(uint256)

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const FunctionSigPolicyFactory = await ethers.getContractFactory("FunctionSignaturePolicy");
    functionSigPolicy = await FunctionSigPolicyFactory.deploy();
  });

  describe("Deployment", function () {
    it("should set correct name and version", async function () {
      expect(await functionSigPolicy.name()).to.equal("Function Signature Policy");
      expect(await functionSigPolicy.version()).to.equal("1.0.0");
    });

    it("should be active by default", async function () {
      expect(await functionSigPolicy.isActive()).to.be.true;
    });
  });

  describe("Default Mode (Allowlist)", function () {
    it("should reject all function calls by default (empty allowlist)", async function () {
      const data = TRANSFER_SIG + "1234".repeat(16); // transfer() call
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.false;
      expect(result[1]).to.include("not in allowlist");
      expect(result[2]).to.equal(3); // HIGH severity
    });

    it("should allow whitelisted function signature", async function () {
      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer(address,uint256)");

      const data = TRANSFER_SIG + "1234".repeat(16);
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.true;
      expect(result[2]).to.equal(0); // OK severity
    });

    it("should allow multiple whitelisted signatures", async function () {
      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer");
      await functionSigPolicy.addAllowedSelector(APPROVE_SIG, "approve");

      const transferData = TRANSFER_SIG + "1234".repeat(16);
      const approveData = APPROVE_SIG + "1234".repeat(16);

      const transferResult = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        transferData
      );

      const approveResult = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        approveData
      );

      expect(transferResult[0]).to.be.true;
      expect(approveResult[0]).to.be.true;
    });

    it("should remove allowed selector correctly", async function () {
      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer");
      await functionSigPolicy.removeAllowedSelector(TRANSFER_SIG);

      const data = TRANSFER_SIG + "1234".repeat(16);
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.false;
    });

    it("should revert when adding invalid selector", async function () {
      await expect(
        functionSigPolicy.addAllowedSelector("0x123456", "invalid")
      ).to.be.revertedWithCustomError(functionSigPolicy, "InvalidSelector");
    });
  });

  describe("Blocklist Mode", function () {
    beforeEach(async function () {
      await functionSigPolicy.setMode(true); // Enable blocklist mode
    });

    it("should allow all function calls by default (empty blocklist)", async function () {
      const data = TRANSFER_SIG + "1234".repeat(16);
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.true;
    });

    it("should reject blacklisted function signature", async function () {
      await functionSigPolicy.addBlockedSelector(MINT_SIG, "mint");

      const data = MINT_SIG + "1234".repeat(16);
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.false;
      expect(result[1]).to.include("blocked");
      expect(result[2]).to.equal(3); // HIGH severity
    });

    it("should allow non-blacklisted signatures in blocklist mode", async function () {
      await functionSigPolicy.addBlockedSelector(MINT_SIG, "mint");

      const transferData = TRANSFER_SIG + "1234".repeat(16);
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        transferData
      );

      expect(result[0]).to.be.true;
    });

    it("should remove blocked selector correctly", async function () {
      await functionSigPolicy.addBlockedSelector(MINT_SIG, "mint");
      await functionSigPolicy.removeBlockedSelector(MINT_SIG);

      const data = MINT_SIG + "1234".repeat(16);
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.true;
    });
  });

  describe("Mode Switching", function () {
    it("should switch between modes", async function () {
      expect(await functionSigPolicy.useBlocklist()).to.be.false;

      await functionSigPolicy.setMode(true);
      expect(await functionSigPolicy.useBlocklist()).to.be.true;

      await functionSigPolicy.setMode(false);
      expect(await functionSigPolicy.useBlocklist()).to.be.false;
    });

    it("should emit ModeChanged event", async function () {
      await expect(functionSigPolicy.setMode(true))
        .to.emit(functionSigPolicy, "ModeChanged")
        .withArgs(true);
    });

    it("should revert when non-owner changes mode", async function () {
      await expect(
        functionSigPolicy.connect(user1).setMode(true)
      ).to.be.revertedWithCustomError(functionSigPolicy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Batch Operations", function () {
    it("should batch add allowed selectors", async function () {
      const selectors = [TRANSFER_SIG, APPROVE_SIG, TRANSFER_FROM_SIG];
      const descriptions = ["transfer", "approve", "transferFrom"];

      await functionSigPolicy.batchAddAllowedSelectors(selectors, descriptions);

      for (const selector of selectors) {
        expect(await functionSigPolicy.allowedSelectors(selector)).to.be.true;
      }
    });

    it("should batch add blocked selectors", async function () {
      await functionSigPolicy.setMode(true);
      
      const selectors = [MINT_SIG, BURN_SIG];
      const descriptions = ["mint", "burn"];

      await functionSigPolicy.batchAddBlockedSelectors(selectors, descriptions);

      for (const selector of selectors) {
        expect(await functionSigPolicy.blockedSelectors(selector)).to.be.true;
      }
    });

    it("should revert batch add with mismatched arrays", async function () {
      const selectors = [TRANSFER_SIG, APPROVE_SIG];
      const descriptions = ["transfer"]; // Mismatched length

      await expect(
        functionSigPolicy.batchAddAllowedSelectors(selectors, descriptions)
      ).to.be.revertedWithCustomError(functionSigPolicy, "ArrayLengthMismatch");
    });
  });

  describe("Empty Calldata", function () {
    it("should allow empty calldata (ETH transfer)", async function () {
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result[0]).to.be.true;
    });

    it("should allow empty calldata in blocklist mode", async function () {
      await functionSigPolicy.setMode(true);
      
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("1"),
        "0x"
      );

      expect(result[0]).to.be.true;
    });
  });

  describe("List Management", function () {
    it("should track allowlist count", async function () {
      expect(await functionSigPolicy.getAllowlistCount()).to.equal(0);

      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer");
      expect(await functionSigPolicy.getAllowlistCount()).to.equal(1);

      await functionSigPolicy.addAllowedSelector(APPROVE_SIG, "approve");
      expect(await functionSigPolicy.getAllowlistCount()).to.equal(2);
    });

    it("should track blocklist count", async function () {
      await functionSigPolicy.setMode(true);
      expect(await functionSigPolicy.getBlocklistCount()).to.equal(0);

      await functionSigPolicy.addBlockedSelector(MINT_SIG, "mint");
      expect(await functionSigPolicy.getBlocklistCount()).to.equal(1);
    });

    it("should get selector description", async function () {
      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer(address,uint256)");
      
      expect(await functionSigPolicy.getSelectorDescription(TRANSFER_SIG))
        .to.equal("transfer(address,uint256)");
    });
  });

  describe("Access Control", function () {
    it("should only allow owner to add allowed selectors", async function () {
      await expect(
        functionSigPolicy.connect(user1).addAllowedSelector(TRANSFER_SIG, "transfer")
      ).to.be.revertedWithCustomError(functionSigPolicy, "OwnableUnauthorizedAccount");
    });

    it("should only allow owner to add blocked selectors", async function () {
      await expect(
        functionSigPolicy.connect(user1).addBlockedSelector(MINT_SIG, "mint")
      ).to.be.revertedWithCustomError(functionSigPolicy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Policy Status", function () {
    it("should return compliant when policy is inactive", async function () {
      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer");
      await functionSigPolicy.setActive(false);

      const data = BURN_SIG + "1234".repeat(16); // Not in allowlist
      const result = await functionSigPolicy.evaluate(
        user1.address,
        user2.address,
        0,
        data
      );

      expect(result[0]).to.be.true; // Policy not active
    });
  });

  describe("Events", function () {
    it("should emit SelectorAllowed event", async function () {
      await expect(functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer"))
        .to.emit(functionSigPolicy, "SelectorAllowed")
        .withArgs(TRANSFER_SIG, "transfer");
    });

    it("should emit SelectorRemoved event", async function () {
      await functionSigPolicy.addAllowedSelector(TRANSFER_SIG, "transfer");
      await expect(functionSigPolicy.removeAllowedSelector(TRANSFER_SIG))
        .to.emit(functionSigPolicy, "SelectorRemoved")
        .withArgs(TRANSFER_SIG);
    });

    it("should emit SelectorBlocked event", async function () {
      await expect(functionSigPolicy.addBlockedSelector(MINT_SIG, "mint"))
        .to.emit(functionSigPolicy, "SelectorBlocked")
        .withArgs(MINT_SIG, "mint");
    });
  });
});
