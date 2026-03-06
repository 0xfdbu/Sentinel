import { expect } from "chai";
import { ethers } from "hardhat";
import { VolumePolicy } from "../typechain";

describe("VolumePolicy", function () {
  let volumePolicy: VolumePolicy;
  let owner: any;
  let user1: any;
  let user2: any;

  const MIN_VOLUME = ethers.parseEther("0.001");
  const MAX_VOLUME = ethers.parseEther("100");
  const DAILY_LIMIT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const VolumePolicyFactory = await ethers.getContractFactory("VolumePolicy");
    volumePolicy = await VolumePolicyFactory.deploy(MIN_VOLUME, MAX_VOLUME, DAILY_LIMIT);
  });

  describe("Deployment", function () {
    it("should set correct initial parameters", async function () {
      expect(await volumePolicy.name()).to.equal("Volume Limit Policy");
      expect(await volumePolicy.version()).to.equal("1.0.0");
      expect(await volumePolicy.minVolume()).to.equal(MIN_VOLUME);
      expect(await volumePolicy.maxVolume()).to.equal(MAX_VOLUME);
      expect(await volumePolicy.dailyVolumeLimit()).to.equal(DAILY_LIMIT);
    });

    it("should be active by default", async function () {
      expect(await volumePolicy.isActive()).to.be.true;
    });
  });

  describe("Volume Limits", function () {
    it("should allow owner to set min volume", async function () {
      const newMin = ethers.parseEther("0.01");
      await expect(volumePolicy.setMinVolume(newMin))
        .to.emit(volumePolicy, "MinVolumeUpdated")
        .withArgs(MIN_VOLUME, newMin);

      expect(await volumePolicy.minVolume()).to.equal(newMin);
    });

    it("should allow owner to set max volume", async function () {
      const newMax = ethers.parseEther("200");
      await expect(volumePolicy.setMaxVolume(newMax))
        .to.emit(volumePolicy, "MaxVolumeUpdated")
        .withArgs(MAX_VOLUME, newMax);

      expect(await volumePolicy.maxVolume()).to.equal(newMax);
    });

    it("should allow owner to set daily limit", async function () {
      const newLimit = ethers.parseEther("2000");
      await expect(volumePolicy.setDailyVolumeLimit(newLimit))
        .to.emit(volumePolicy, "DailyLimitUpdated")
        .withArgs(DAILY_LIMIT, newLimit);

      expect(await volumePolicy.dailyVolumeLimit()).to.equal(newLimit);
    });

    it("should revert when min > max", async function () {
      await expect(
        volumePolicy.setMinVolume(ethers.parseEther("200"))
      ).to.be.revertedWithCustomError(volumePolicy, "InvalidVolumeRange");
    });

    it("should revert when max < min", async function () {
      await expect(
        volumePolicy.setMaxVolume(ethers.parseEther("0.0001"))
      ).to.be.revertedWithCustomError(volumePolicy, "InvalidVolumeRange");
    });

    it("should revert when non-owner tries to set limits", async function () {
      await expect(
        volumePolicy.connect(user1).setMinVolume(ethers.parseEther("0.01"))
      ).to.be.revertedWithCustomError(volumePolicy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Policy Evaluation - Single Transaction", function () {
    it("should approve transaction within limits", async function () {
      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("10"), // Within 0.001 - 100 ETH
        "0x"
      );

      expect(result[0]).to.be.true; // compliant
      expect(result[2]).to.equal(0); // OK severity
    });

    it("should reject transaction below minimum", async function () {
      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("0.0001"), // Below 0.001 ETH
        "0x"
      );

      expect(result[0]).to.be.false;
      expect(result[1]).to.include("below minimum");
      expect(result[2]).to.equal(1); // LOW severity
    });

    it("should reject transaction above maximum", async function () {
      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("200"), // Above 100 ETH
        "0x"
      );

      expect(result[0]).to.be.false;
      expect(result[1]).to.include("exceeds maximum");
      expect(result[2]).to.equal(2); // MEDIUM severity
    });

    it("should handle zero value transaction", async function () {
      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        0,
        "0x"
      );

      expect(result[0]).to.be.false;
      expect(result[1]).to.include("below minimum");
    });
  });

  describe("Policy Evaluation - Daily Limits", function () {
    it("should track daily volume correctly", async function () {
      // First transaction: 500 ETH
      await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("500"),
        "0x"
      );

      const dailyVolume = await volumePolicy.getDailyVolume(user1.address);
      expect(dailyVolume).to.equal(ethers.parseEther("500"));
    });

    it("should reject when daily limit exceeded", async function () {
      // First transaction: 800 ETH
      await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("800"),
        "0x"
      );

      // Second transaction: 300 ETH (would exceed 1000 ETH daily limit)
      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("300"),
        "0x"
      );

      expect(result[0]).to.be.false;
      expect(result[1]).to.include("Daily volume limit");
      expect(result[2]).to.equal(2); // MEDIUM severity
    });

    it("should allow transaction after resetting daily volume", async function () {
      // Use up daily limit
      await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("1000"),
        "0x"
      );

      // Reset daily volume
      await volumePolicy.resetDailyVolume(user1.address);

      // Should now allow new transaction
      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("100"),
        "0x"
      );

      expect(result[0]).to.be.true;
    });

    it("should track volumes separately for different users", async function () {
      await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("500"),
        "0x"
      );

      await volumePolicy.evaluate(
        user2.address,
        user1.address,
        ethers.parseEther("600"),
        "0x"
      );

      expect(await volumePolicy.getDailyVolume(user1.address)).to.equal(ethers.parseEther("500"));
      expect(await volumePolicy.getDailyVolume(user2.address)).to.equal(ethers.parseEther("600"));
    });
  });

  describe("Daily Volume Reset", function () {
    it("should allow owner to reset daily volume", async function () {
      await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("100"),
        "0x"
      );

      await expect(volumePolicy.resetDailyVolume(user1.address))
        .to.emit(volumePolicy, "DailyVolumeReset")
        .withArgs(user1.address);

      expect(await volumePolicy.getDailyVolume(user1.address)).to.equal(0);
    });

    it("should revert when non-owner tries to reset", async function () {
      await expect(
        volumePolicy.connect(user1).resetDailyVolume(user1.address)
      ).to.be.revertedWithCustomError(volumePolicy, "OwnableUnauthorizedAccount");
    });
  });

  describe("Exemption List", function () {
    it("should allow owner to exempt address from volume limits", async function () {
      await expect(volumePolicy.setExemption(user1.address, true))
        .to.emit(volumePolicy, "ExemptionStatusChanged")
        .withArgs(user1.address, true);

      expect(await volumePolicy.exemptedAddresses(user1.address)).to.be.true;
    });

    it("should allow exempted address to exceed limits", async function () {
      await volumePolicy.setExemption(user1.address, true);

      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("10000"), // Way above max
        "0x"
      );

      expect(result[0]).to.be.true; // Exempted
    });

    it("should remove exemption correctly", async function () {
      await volumePolicy.setExemption(user1.address, true);
      await volumePolicy.setExemption(user1.address, false);

      expect(await volumePolicy.exemptedAddresses(user1.address)).to.be.false;

      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("200"),
        "0x"
      );

      expect(result[0]).to.be.false; // No longer exempted
    });
  });

  describe("Policy Status", function () {
    it("should return compliant when policy is inactive", async function () {
      await volumePolicy.setActive(false);

      const result = await volumePolicy.evaluate(
        user1.address,
        user2.address,
        ethers.parseEther("10000"),
        "0x"
      );

      expect(result[0]).to.be.true; // Policy not active
    });
  });
});
