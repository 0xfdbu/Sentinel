const { ethers } = require("ethers");

async function main() {
    const txHash = "0x1c5d9e31693755d6a69293e5dae7e49afa77d84b15b045c7aa9f1dd78ca99cd0";
    
    const provider = new ethers.JsonRpcProvider(
        "https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH"
    );
    
    console.log("Analyzing CCIP Transaction");
    console.log("==========================\n");
    console.log("Transaction:", txHash);
    console.log("");
    
    const receipt = await provider.getTransactionReceipt(txHash);
    
    console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Block Number:", receipt.blockNumber);
    console.log("");
    
    // Check for CCIP Router event
    const CCIP_ROUTER = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const ccipSendTopic = ethers.id("CCIPSendRequested(bytes32,(bytes,bytes,(address,uint256)[],address,bytes))");
    
    console.log("Looking for CCIPSendRequested event...");
    console.log("Router:", CCIP_ROUTER);
    console.log("Expected Topic:", ccipSendTopic);
    console.log("");
    
    let foundCCIP = false;
    for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        if (log.address.toLowerCase() === CCIP_ROUTER.toLowerCase()) {
            console.log(`Found log from Router at index ${i}:`);
            console.log("  Topic:", log.topics[0]);
            if (log.topics[0] === ccipSendTopic) {
                console.log("  ✅ This is CCIPSendRequested!");
                foundCCIP = true;
                if (log.topics.length > 1) {
                    console.log("  Message ID:", log.topics[1]);
                }
            }
        }
    }
    
    if (!foundCCIP) {
        console.log("❌ CCIPSendRequested event NOT found in logs");
        console.log("");
        console.log("This means the CCIP message may not have been properly sent.");
        console.log("Check if:");
        console.log("  1. Fee was sufficient");
        console.log("  2. TokenPool is properly configured");
        console.log("  3. Destination chain is supported");
    }
    
    console.log("\n\nAll addresses in logs:");
    const addresses = new Set();
    for (const log of receipt.logs) {
        addresses.add(log.address.toLowerCase());
    }
    for (const addr of addresses) {
        console.log("  -", addr);
    }
}

main().catch(console.error);
