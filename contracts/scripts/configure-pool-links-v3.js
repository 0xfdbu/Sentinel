const { ethers } = require("ethers");

async function main() {
    // Configuration
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    
    const SEPOLIA_RPC = "https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH";
    const ARBITRUM_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
    
    const SEPOLIA_CHAIN = "16015286601757825753";
    const ARBITRUM_CHAIN = "3478487238524512106";
    
    const SEPOLIA_POOL = "0xfdc9AE0fd6209872CFe07AEfCcCbFE1607A8c480";
    const ARBITRUM_POOL = "0x76F7699344b4b2DAcfE8FBd93Fe60ea4000D3B2C";
    
    console.log("Configuring Cross-Chain TokenPool Links (V3 - Fixed params)");
    console.log("===========================================================\n");
    
    // Try different ABI formats
    // Format 1: remotePoolAddresses as bytes[]
    const poolAbiV1 = [
        "function applyRampUpdates(tuple(uint64 remoteChainSelector, bytes[] remotePoolAddresses, bytes remoteTokenAddress, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) outboundRateLimiterConfig, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) inboundRateLimiterConfig)[] calldata onRampUpdates, tuple(uint64 remoteChainSelector, bytes[] remotePoolAddresses, bytes remoteTokenAddress, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) outboundRateLimiterConfig, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) inboundRateLimiterConfig)[] calldata offRampUpdates) external"
    ];
    
    // Setup providers and wallets
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const arbitrumProvider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const sepoliaWallet = new ethers.Wallet(PRIVATE_KEY, sepoliaProvider);
    const arbitrumWallet = new ethers.Wallet(PRIVATE_KEY, arbitrumProvider);
    
    console.log("Wallet:", sepoliaWallet.address);
    console.log("");
    
    // Sepolia pool
    const sepoliaPool = new ethers.Contract(SEPOLIA_POOL, poolAbiV1, sepoliaWallet);
    
    const rateLimiterConfig = {
        isEnabled: false,
        minTokens: 0,
        maxTokens: 0
    };
    
    // Sepolia → Arbitrum with bytes[] for remotePoolAddresses
    const sepoliaOnRampUpdates = [{
        remoteChainSelector: ARBITRUM_CHAIN,
        remotePoolAddresses: [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ARBITRUM_POOL])],
        remoteTokenAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], ["0x543b8555f9284D106422F0eD7B9d25F9520a17Ad"]),
        outboundRateLimiterConfig: rateLimiterConfig,
        inboundRateLimiterConfig: rateLimiterConfig
    }];
    
    console.log("OnRamp Update Config (with bytes[]):");
    console.log(JSON.stringify(sepoliaOnRampUpdates, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log("");
    
    // Apply Sepolia updates
    console.log("Applying Sepolia onRamp updates...");
    try {
        const tx1 = await sepoliaPool.applyRampUpdates(sepoliaOnRampUpdates, []);
        console.log("Transaction:", tx1.hash);
        await tx1.wait();
        console.log("✅ Sepolia pool updated\n");
    } catch (e) {
        console.error("❌ Sepolia update failed:", e.message);
        if (e.data && e.data !== "0x") console.error("Error data:", e.data);
        
        // Try to get more error info
        console.log("\nTrying to decode error...");
        console.log("Error data:", e.data);
    }
}

main().catch(console.error);
