/**
 * ACE Policy Management CLI
 * 
 * Professional on-chain policy management:
 * - Add/remove addresses from blacklist
 * - Update volume limits
 * - Add suspicious function signatures
 * - Authorize/revoke sentinel nodes
 * - View policy status
 * 
 * Usage:
 *   npx ts-node scripts/ManageACE.ts blacklist add 0x... "Known scam"
 *   npx ts-node scripts/ManageACE.ts volume set-limits 0.001 100 1000
 *   npx ts-node scripts/ManageACE.ts sentinel authorize 0x...
 *   npx ts-node scripts/ManageACE.ts status
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Load deployment info
const DEPLOYMENT_PATH = path.join(__dirname, "../config/deployments/ace-latest.json");

function loadDeployment() {
  if (!fs.existsSync(DEPLOYMENT_PATH)) {
    console.error("No ACE deployment found. Run deploy script first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, "utf8"));
}

// Contract ABIs (minimal)
const POLICY_ENGINE_ABI = [
  "function authorizeSentinel(address sentinel) external",
  "function revokeSentinel(address sentinel) external",
  "function isAuthorizedSentinel(address) view returns (bool)",
  "function getActivePolicyCount() view returns (uint256)",
  "function pauseThreshold() view returns (uint8)",
  "function setPauseThreshold(uint8) external",
];

const BLACKLIST_ABI = [
  "function addToBlacklist(address addr, string calldata reason) external",
  "function removeFromBlacklist(address addr) external",
  "function isBlacklisted(address) view returns (bool)",
  "function getBlacklistCount() view returns (uint256)",
  "function getAllBlacklisted() view returns (address[])",
  "function batchAddToBlacklist(address[] calldata addresses, string calldata reason) external",
];

const VOLUME_ABI = [
  "function setLimits(uint256 minValue, uint256 maxValue) external",
  "function setDailyLimit(uint256 dailyLimit) external",
  "function setExemption(address addr, bool exempt) external",
  "function minValue() view returns (uint256)",
  "function maxValue() view returns (uint256)",
  "function dailyVolumeLimit() view returns (uint256)",
  "function isExempt(address) view returns (bool)",
];

const FUNC_SIG_ABI = [
  "function addSignature(bytes4 sig, string calldata name, uint8 risk) external",
  "function setSignatureRisk(bytes4 sig, uint8 newRisk) external",
  "function getSignatureRisk(bytes4) view returns (uint8)",
];

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];

  const deployment = loadDeployment();
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

  console.log("ACE Policy Manager");
  console.log("==================");
  console.log("Signer:", wallet.address);
  console.log();

  // Connect contracts
  const policyEngine = new ethers.Contract(deployment.ace.policyEngine, POLICY_ENGINE_ABI, wallet);
  const blacklist = new ethers.Contract(deployment.ace.blacklistPolicy, BLACKLIST_ABI, wallet);
  const volume = new ethers.Contract(deployment.ace.volumePolicy, VOLUME_ABI, wallet);
  const funcSig = new ethers.Contract(deployment.ace.functionSigPolicy, FUNC_SIG_ABI, wallet);

  switch (command) {
    case "status":
      await showStatus(policyEngine, blacklist, volume);
      break;

    case "blacklist":
      await manageBlacklist(blacklist, subcommand, args.slice(2));
      break;

    case "volume":
      await manageVolume(volume, subcommand, args.slice(2));
      break;

    case "sentinel":
      await manageSentinels(policyEngine, subcommand, args.slice(2));
      break;

    case "funcs":
      await manageFunctionSigs(funcSig, subcommand, args.slice(2));
      break;

    default:
      showHelp();
  }
}

async function showStatus(policyEngine: any, blacklist: any, volume: any) {
  console.log("ACE System Status");
  console.log("-----------------");
  
  const policyCount = await policyEngine.getActivePolicyCount();
  const pauseThreshold = await policyEngine.pauseThreshold();
  const blacklistCount = await blacklist.getBlacklistCount();
  const minValue = await volume.minValue();
  const maxValue = await volume.maxValue();
  const dailyLimit = await volume.dailyVolumeLimit();

  console.log(`Active Policies: ${policyCount}`);
  console.log(`Pause Threshold: ${pauseThreshold} (0=OK, 1=LOW, 2=MED, 3=HIGH, 4=CRIT)`);
  console.log(`Blacklisted: ${blacklistCount} addresses`);
  console.log(`Volume Limits: ${ethers.formatEther(minValue)} - ${ethers.formatEther(maxValue)} ETH`);
  console.log(`Daily Limit: ${ethers.formatEther(dailyLimit)} ETH`);
}

async function manageBlacklist(blacklist: any, action: string, args: string[]) {
  switch (action) {
    case "add":
      if (args.length < 2) {
        console.log("Usage: blacklist add <address> <reason>");
        return;
      }
      console.log(`Adding ${args[0]} to blacklist...`);
      await (await blacklist.addToBlacklist(args[0], args[1])).wait();
      console.log("✓ Address blacklisted");
      break;

    case "remove":
      if (args.length < 1) {
        console.log("Usage: blacklist remove <address>");
        return;
      }
      console.log(`Removing ${args[0]} from blacklist...`);
      await (await blacklist.removeFromBlacklist(args[0])).wait();
      console.log("✓ Address removed");
      break;

    case "check":
      if (args.length < 1) {
        console.log("Usage: blacklist check <address>");
        return;
      }
      const isListed = await blacklist.isBlacklisted(args[0]);
      console.log(`${args[0]}: ${isListed ? "BLACKLISTED" : "Not blacklisted"}`);
      break;

    case "batch":
      if (args.length < 2) {
        console.log("Usage: blacklist batch <file.json> <reason>");
        return;
      }
      const addresses = JSON.parse(fs.readFileSync(args[0], "utf8"));
      console.log(`Batch adding ${addresses.length} addresses...`);
      await (await blacklist.batchAddToBlacklist(addresses, args[1])).wait();
      console.log("✓ Batch complete");
      break;

    default:
      console.log("Usage: blacklist {add|remove|check|batch} ...");
  }
}

async function manageVolume(volume: any, action: string, args: string[]) {
  switch (action) {
    case "set-limits":
      if (args.length < 2) {
        console.log("Usage: volume set-limits <min> <max> [daily]");
        return;
      }
      const min = ethers.parseEther(args[0]);
      const max = ethers.parseEther(args[1]);
      const daily = args[2] ? ethers.parseEther(args[2]) : max * 10n;
      
      console.log(`Setting limits: ${args[0]} - ${args[1]} ETH, daily: ${ethers.formatEther(daily)} ETH`);
      await (await volume.setLimits(min, max)).wait();
      await (await volume.setDailyLimit(daily)).wait();
      console.log("✓ Limits updated");
      break;

    case "exempt":
      if (args.length < 2) {
        console.log("Usage: volume exempt <address> <true|false>");
        return;
      }
      const exempt = args[1].toLowerCase() === "true";
      await (await volume.setExemption(args[0], exempt)).wait();
      console.log(`✓ ${args[0]} exemption: ${exempt}`);
      break;

    default:
      console.log("Usage: volume {set-limits|exempt} ...");
  }
}

async function manageSentinels(policyEngine: any, action: string, args: string[]) {
  switch (action) {
    case "authorize":
      if (args.length < 1) {
        console.log("Usage: sentinel authorize <address>");
        return;
      }
      console.log(`Authorizing ${args[0]}...`);
      await (await policyEngine.authorizeSentinel(args[0])).wait();
      console.log("✓ Sentinel authorized");
      break;

    case "revoke":
      if (args.length < 1) {
        console.log("Usage: sentinel revoke <address>");
        return;
      }
      console.log(`Revoking ${args[0]}...`);
      await (await policyEngine.revokeSentinel(args[0])).wait();
      console.log("✓ Sentinel revoked");
      break;

    case "check":
      if (args.length < 1) {
        console.log("Usage: sentinel check <address>");
        return;
      }
      const isAuth = await policyEngine.isAuthorizedSentinel(args[0]);
      console.log(`${args[0]}: ${isAuth ? "AUTHORIZED" : "Not authorized"}`);
      break;

    default:
      console.log("Usage: sentinel {authorize|revoke|check} <address>");
  }
}

async function manageFunctionSigs(funcSig: any, action: string, args: string[]) {
  switch (action) {
    case "add":
      if (args.length < 3) {
        console.log("Usage: funcs add <selector> <name> <risk>");
        console.log("Example: funcs add 0x3659cfe6 upgradeTo 4");
        return;
      }
      await (await funcSig.addSignature(args[0], args[1], parseInt(args[2]))).wait();
      console.log(`✓ Added ${args[1]} with risk ${args[2]}`);
      break;

    case "set-risk":
      if (args.length < 2) {
        console.log("Usage: funcs set-risk <selector> <risk>");
        return;
      }
      await (await funcSig.setSignatureRisk(args[0], parseInt(args[1]))).wait();
      console.log(`✓ Risk updated to ${args[1]}`);
      break;

    default:
      console.log("Usage: funcs {add|set-risk} ...");
  }
}

function showHelp() {
  console.log(`
ACE Policy Manager - Usage:

  status                    Show system status

  blacklist add <addr> <reason>
                           Add address to blacklist
  blacklist remove <addr>  Remove address from blacklist
  blacklist check <addr>   Check if address is blacklisted
  blacklist batch <file> <reason>
                           Batch add from JSON file

  volume set-limits <min> <max> [daily]
                           Set volume limits (in ETH)
  volume exempt <addr> <true|false>
                           Set address exemption

  sentinel authorize <addr>
                           Authorize sentinel node
  sentinel revoke <addr>   Revoke sentinel authorization
  sentinel check <addr>    Check if address is authorized

  funcs add <selector> <name> <risk>
                           Add function signature (risk 0-4)
  funcs set-risk <selector> <risk>
                           Update function risk level

Examples:
  npx ts-node scripts/ManageACE.ts status
  npx ts-node scripts/ManageACE.ts blacklist add 0x... "Known phishing"
  npx ts-node scripts/ManageACE.ts volume set-limits 0.001 100 1000
  npx ts-node scripts/ManageACE.ts sentinel authorize 0x...
`);
}

main().catch(console.error);
