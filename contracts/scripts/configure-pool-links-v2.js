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
    
    console.log("Configuring Cross-Chain TokenPool Links (V2)");
    console.log("=============================================\n");
    
    // Pool ABI with applyRampUpdates
    const poolAbi = [
        "function applyRampUpdates(tuple(uint64 remoteChainSelector, bytes remotePoolAddresses, bytes remoteTokenAddress, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) outboundRateLimiterConfig, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) inboundRateLimiterConfig)[] calldata onRampUpdates, tuple(uint64 remoteChainSelector, bytes remotePoolAddresses, bytes remoteTokenAddress, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) outboundRateLimiterConfig, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) inboundRateLimiterConfig)[] calldata offRampUpdates) external",
        "function owner() view returns (address)",
        "function getSupportedChains() view returns (uint64[] memory)"
    ];
    
    // Setup providers and wallets
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const arbitrumProvider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const sepoliaWallet = new ethers.Wallet(PRIVATE_KEY, sepoliaProvider);
    const arbitrumWallet = new ethers.Wallet(PRIVATE_KEY, arbitrumProvider);
    
    console.log("Wallet:", sepoliaWallet.address);
    console.log("");
    
    // Sepolia pool
    const sepoliaPool = new ethers.Contract(SEPOLIA_POOL, poolAbi, sepoliaWallet);
    const arbitrumPool = new ethers.Contract(ARBITRUM_POOL, poolAbi, arbitrumWallet);
    
    // Check owners
    const sepoliaOwner = await sepoliaPool.owner();
    const arbitrumOwner = await arbitrumPool.owner();
    
    console.log("Sepolia Pool Owner:", sepoliaOwner);
    console.log("Arbitrum Pool Owner:", arbitrumOwner);
    console.log("");
    
    if (sepoliaOwner.toLowerCase() !== sepoliaWallet.address.toLowerCase()) {
        console.error("❌ Wallet is not owner of Sepolia pool!");
        return;
    }
    if (arbitrumOwner.toLowerCase() !== arbitrumWallet.address.toLowerCase()) {
        console.error("❌ Wallet is not owner of Arbitrum pool!");
        return;
    }
    
    // Prepare ramp updates
    const rateLimiterConfig = {
        isEnabled: false,
        minTokens: 0,
        maxTokens: 0
    };
    
    // Sepolia → Arbitrum (outbound from Sepolia)
    const sepoliaOnRampUpdates = [{
        remoteChainSelector: ARBITRUM_CHAIN,
        remotePoolAddresses: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ARBITRUM_POOL]),
        remoteTokenAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], ["0x543b8555f9284D106422F0eD7B9d25F9520a17Ad"]),
        outboundRateLimiterConfig: rateLimiterConfig,
        inboundRateLimiterConfig: rateLimiterConfig
    }];
    
    // Arbitrum → Sepolia (outbound from Arbitrum)
    const arbitrumOnRampUpdates = [{
        remoteChainSelector: SEPOLIA_CHAIN,
        remotePoolAddresses: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [SEPOLIA_POOL]),
        remoteTokenAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], ["0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6"]),
        outboundRateLimiterConfig: rateLimiterConfig,
        inboundRateLimiterConfig: rateLimiterConfig
    }];
    
    console.log("OnRamp Update Configs:");
    console.log("  Sepolia:", JSON.stringify(sepoliaOnRampUpdates, null, 2));
    console.log("  Arbitrum:", JSON.stringify(arbitrumOnRampUpdates, null, 2));
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
    }
    
    // Apply Arbitrum updates
    console.log("Applying Arbitrum onRamp updates...");
    try {
        const tx2 = await arbitrumPool.applyRampUpdates(arbitrumOnRampUpdates, []);
        console.log("Transaction:", tx2.hash);
        await tx2.wait();
        console.log("✅ Arbitrum pool updated\n");
    } catch (e) {
        console.error("❌ Arbitrum update failed:", e.message);
        if (e.data && e.data !== "0x") console.error("Error data:", e.data);
    }
    
    console.log("Done!");
}

main().catch(console.error);
