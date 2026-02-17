/**
 * CRE Consumer Usage Script
 * 
 * Shows how to request a confidential pause through Chainlink Functions
 */

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Load deployment info
  const network = hre.network.name;
  const deploymentPath = `./deployments/cre-consumer-${network}.json`;
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment not found at ${deploymentPath}`);
    console.log("Run: npx hardhat run deploy-cre-consumer.js --network sepolia");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath));
  console.log("📄 Loaded deployment:", deployment.creConsumer);

  // Get contract instance
  const CREConsumer = await hre.ethers.getContractFactory("CREConsumer");
  const creConsumer = CREConsumer.attach(deployment.creConsumer);

  // Contract address to pause (example: your VulnerableVault)
  const targetContract = process.env.TARGET_CONTRACT || "0xYOUR_CONTRACT";
  const vulnHash = process.env.VULN_HASH || "0x1234567890abcdef";

  console.log(`\n🎯 Requesting confidential pause:`);
  console.log(`   Target: ${targetContract}`);
  console.log(`   VulnHash: ${vulnHash}`);

  // The JavaScript source that runs on Chainlink DON
  const source = `
    const apiKey = secrets.SENTINEL_API_KEY;
    const response = await Functions.makeHttpRequest({
      url: secrets.BACKEND_URL + "/api/v1/emergency-pause",
      method: "POST",
      headers: { "X-API-Key": apiKey },
      data: { target: args[0], vulnHash: args[1] }
    });
    if (response.error) throw Error("Request failed");
    return Functions.encodeUint256(response.data.success ? 1 : 0);
  `;

  // No encrypted secrets for this example (you'd upload these to DON)
  const encryptedSecretsReference = "0x";

  // Send request
  console.log("\n📡 Sending Chainlink Functions request...");
  
  try {
    const tx = await creConsumer.requestConfidentialPause(
      targetContract,
      vulnHash,
      encryptedSecretsReference,
      source
    );

    console.log(`⏳ Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();

    // Parse request ID from event
    const event = receipt.logs.find(
      log => log.topics[0] === hre.ethers.id("PauseRequestInitiated(bytes32,address,bytes32,uint256)")
    );

    if (event) {
      const requestId = event.topics[1];
      console.log(`✅ Request ID: ${requestId}`);
      console.log(`\n🔍 Monitor at: https://functions.chain.link/sepolia/${deployment.subscriptionId}`);
    }

  } catch (error) {
    console.error("❌ Request failed:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Make sure your subscription has enough LINK!");
    }
    if (error.message.includes("not authorized")) {
      console.log("\n💡 Make sure you've added the consumer to your subscription!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
