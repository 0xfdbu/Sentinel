#!/usr/bin/env node
/**
 * Grant PAUSER_ROLE to Guardian for a vault
 * 
 * Usage:
 *   export PRIVATE_KEY=0x...
 *   node grant-pauser-role.js 0xVaultAddress 0xGuardianAddress
 */

const hre = require("hardhat");

async function main() {
  const vaultAddress = process.argv[2];
  const guardianAddress = process.argv[3] || "0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1";
  
  if (!vaultAddress) {
    console.error("Usage: node grant-pauser-role.js <vault-address> [guardian-address]");
    process.exit(1);
  }

  console.log(`Granting PAUSER_ROLE to ${guardianAddress} for vault ${vaultAddress}\n`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Admin: ${deployer.address}\n`);

  // Connect to vault
  const vault = await hre.ethers.getContractAt("SimpleVaultWithRoles", vaultAddress);
  
  // Get PAUSER_ROLE bytes32
  const pauserRole = await vault.PAUSER_ROLE();
  console.log(`PAUSER_ROLE: ${pauserRole}`);
  
  // Check if already has role
  const hasRole = await vault.hasRole(pauserRole, guardianAddress);
  if (hasRole) {
    console.log(`✅ Guardian already has PAUSER_ROLE`);
    return;
  }
  
  // Grant role
  console.log(`\nGranting PAUSER_ROLE...`);
  const tx = await vault.grantRole(pauserRole, guardianAddress);
  await tx.wait();
  
  console.log(`✅ PAUSER_ROLE granted!`);
  console.log(`   Tx Hash: ${tx.hash}`);
  
  // Verify
  const hasRoleAfter = await vault.hasRole(pauserRole, guardianAddress);
  console.log(`\nVerification: Guardian has PAUSER_ROLE = ${hasRoleAfter}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
