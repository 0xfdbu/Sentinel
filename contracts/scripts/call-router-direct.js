const { ethers } = require("ethers");

async function main() {
    // Configuration
    const RPC_URL = "https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    
    const ROUTER = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const USDA = "0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6";
    const TOKEN_POOL = "0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480";
    const RECEIVER = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const ARBITRUM_CHAIN = "3478487238524512106";
    
    console.log("STEP 3: Call CCIP Router Directly (Fixed + Small Amount)");
    console.log("=========================================================\n");
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log("Wallet:", wallet.address);
    
    // Check balance first
    const usdaAbi = [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const usda = new ethers.Contract(USDA, usdaAbi, wallet);
    const balance = await usda.balanceOf(wallet.address);
    console.log("USDA Balance:", balance.toString(), "=", ethers.formatEther(balance));
    
    // Router ABI
    const routerAbi = [
        "function ccipSend(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) payable returns (bytes32)",
        "function getFee(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) view returns (uint256)"
    ];
    
    const router = new ethers.Contract(ROUTER, routerAbi, wallet);
    
    // Use tiny amount (0.00001 USDA)
    const amount = 10000; // 0.00001 USDA with 9 decimals
    
    if (balance < BigInt(amount)) {
        console.error("\n❌ Insufficient balance. Have:", balance.toString(), "Need:", amount);
        console.log("\nGetting tokens from minting consumer...");
        
        // Call emergencyMint on MintingConsumer V5 to get some tokens
        const mintingConsumerAbi = [
            "function emergencyMint(address to, uint256 amount) external"
        ];
        const mintingConsumer = new ethers.Contract(
            "0xFe0747c381A2227a954FeE7f99F41E382c6039a6",
            mintingConsumerAbi,
            wallet
        );
        
        try {
            const mintTx = await mintingConsumer.emergencyMint(wallet.address, amount * 100);
            await mintTx.wait();
            console.log("✅ Minted", amount * 100, "USDA");
            
            const newBalance = await usda.balanceOf(wallet.address);
            console.log("New balance:", newBalance.toString());
        } catch (e) {
            console.error("❌ Mint failed:", e.message);
            return;
        }
    }
    
    // CORRECT EVMExtraArgsV1 encoding with version tag
    // EVMExtraArgsV1: version tag 0x97a657c9 + uint256 gasLimit
    const versionTag = "0x97a657c9";
    const gasLimit = 200000;
    const extraArgs = versionTag + gasLimit.toString(16).padStart(64, "0");
    
    console.log("\nExtraArgs:", extraArgs);
    
    // Build message
    const message = {
        receiver: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [RECEIVER]),
        data: "0x",
        tokenAmounts: [{
            token: USDA,
            amount: amount
        }],
        feeToken: ethers.ZeroAddress,
        extraArgs: extraArgs
    };
    
    console.log("Message:", JSON.stringify(message, null, 2));
    console.log("");
    
    // Get fee
    console.log("Getting fee estimate...");
    try {
        const fee = await router.getFee(ARBITRUM_CHAIN, message);
        console.log("Fee required:", ethers.formatEther(fee), "ETH");
        
        // Add 50% buffer
        const feeWithBuffer = fee * 150n / 100n;
        console.log("Fee with buffer:", ethers.formatEther(feeWithBuffer), "ETH");
        
        // Approve tokens
        console.log("\nApproving tokens...");
        const approveTx = await usda.approve(ROUTER, amount);
        await approveTx.wait();
        console.log("✅ Approved", amount, "USDA to Router");
        
        // Send CCIP
        console.log("\nSending CCIP message...");
        const tx = await router.ccipSend(ARBITRUM_CHAIN, message, {
            value: feeWithBuffer
        });
        
        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("\n✅ CCIP message sent!");
        console.log("Transaction hash:", receipt.hash);
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Block number:", receipt.blockNumber);
        
        // Parse logs for message ID
        const ccipSendTopic = ethers.id("CCIPSendRequested(bytes32,(bytes,bytes,(address,uint256)[],address,bytes))");
        for (const log of receipt.logs) {
            if (log.topics[0] === ccipSendTopic) {
                console.log("\n🎉 CCIPSendRequested event found!");
                console.log("Message ID:", log.topics[1]);
                console.log("\nMonitor on CCIP Explorer:");
                console.log(`https://ccip.chain.link/msg/${receipt.hash}`);
                break;
            }
        }
        
    } catch (e) {
        console.error("\n❌ Error:", e.message);
        if (e.data) {
            console.error("Error data:", e.data);
            // Try to decode
            if (e.data.startsWith("0x5247fdce")) {
                console.error("→ InvalidExtraArgsTag() - wrong extraArgs format");
            } else if (e.data.startsWith("0xe3a1a7b5")) {
                console.error("→ InvalidTokenPool() - token not configured for CCIP");
            } else if (e.data.startsWith("0x7b3e08")) {
                console.error("→ UnsupportedDestinationChain()");
            } else if (e.data.startsWith("0xea3319") || e.data.startsWith("0x4b634dd5")) {
                console.error("→ InsufficientFee()");
            } else if (e.data.startsWith("0x8b58f0ac")) {
                console.error("→ TokenRateLimitExceeded()");
            } else if (e.data.startsWith("0x08c379a0")) {
                console.error("→ Generic string revert");
            }
        }
    }
}

main().catch(console.error);
