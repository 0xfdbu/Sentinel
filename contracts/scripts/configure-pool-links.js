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
    
    console.log("Configuring Cross-Chain TokenPool Links");
    console.log("=======================================\n");
    
    // Pool ABI
    const poolAbi = [
        "function applyChainUpdates(uint64[] calldata remoteChainSelectorsToRemove, tuple(uint64 remoteChainSelector, bytes remotePoolAddress, bytes remoteTokenAddress, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) outboundRateLimiterConfig, tuple(bool isEnabled, uint256 minTokens, uint256 maxTokens) inboundRateLimiterConfig)[] calldata chainsToAdd) external",
        "function owner() view returns (address)",
        "function getSupportedChains() view returns (uint64[] memory)",
        "function getRemotePool(uint64 chainSelector) view returns (bytes memory)",
        "function getRemoteToken(uint64 chainSelector) view returns (bytes memory)"
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
    
    // Check current owners
    const sepoliaOwner = await sepoliaPool.owner();
    const arbitrumOwner = await arbitrumPool.owner();
    
    console.log("Sepolia Pool Owner:", sepoliaOwner);
    console.log("Arbitrum Pool Owner:", arbitrumOwner);
    console.log("");
    
    // Check if wallet is owner
    if (sepoliaOwner.toLowerCase() !== sepoliaWallet.address.toLowerCase()) {
        console.error("❌ Wallet is not owner of Sepolia pool!");
        return;
    }
    if (arbitrumOwner.toLowerCase() !== arbitrumWallet.address.toLowerCase()) {
        console.error("❌ Wallet is not owner of Arbitrum pool!");
        return;
    }
    
    // Check current configuration
    console.log("Current Configuration:");
    try {
        const sepoliaChains = await sepoliaPool.getSupportedChains();
        console.log("  Sepolia supported chains:", sepoliaChains.map(c => c.toString()));
    } catch (e) { console.log("  Sepolia chains: error"); }
    
    try {
        const arbitrumChains = await arbitrumPool.getSupportedChains();
        console.log("  Arbitrum supported chains:", arbitrumChains.map(c => c.toString()));
    } catch (e) { console.log("  Arbitrum chains: error"); }
    
    console.log("");
    
    // Prepare chain updates
    // Sepolia → Arbitrum
    const sepoliaUpdate = [{
        remoteChainSelector: ARBITRUM_CHAIN,
        remotePoolAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ARBITRUM_POOL]),
        remoteTokenAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], ["0x543b8555f9284D106422F0eD7B9d25F9520a17Ad"]),
        outboundRateLimiterConfig: {
            isEnabled: false,
            minTokens: 0,
            maxTokens: 0
        },
        inboundRateLimiterConfig: {
            isEnabled: false,
            minTokens: 0,
            maxTokens: 0
        }
    }];
    
    // Arbitrum → Sepolia
    const arbitrumUpdate = [{
        remoteChainSelector: SEPOLIA_CHAIN,
        remotePoolAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [SEPOLIA_POOL]),
        remoteTokenAddress: ethers.AbiCoder.defaultAbiCoder().encode(["address"], ["0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6"]),
        outboundRateLimiterConfig: {
            isEnabled: false,
            minTokens: 0,
            maxTokens: 0
        },
        inboundRateLimiterConfig: {
            isEnabled: false,
            minTokens: 0,
            maxTokens: 0
        }
    }];
    
    console.log("Chain Update Configs:");
    console.log("  Sepolia → Arbitrum:", JSON.stringify(sepoliaUpdate, null, 2));
    console.log("  Arbitrum → Sepolia:", JSON.stringify(arbitrumUpdate, null, 2));
    console.log("");
    
    // Apply updates
    console.log("Applying Sepolia update...");
    try {
        const tx1 = await sepoliaPool.applyChainUpdates([], sepoliaUpdate);
        console.log("Transaction:", tx1.hash);
        await tx1.wait();
        console.log("✅ Sepolia pool updated\n");
    } catch (e) {
        console.error("❌ Sepolia update failed:", e.message);
        if (e.data) console.error("Error data:", e.data);
    }
    
    console.log("Applying Arbitrum update...");
    try {
        const tx2 = await arbitrumPool.applyChainUpdates([], arbitrumUpdate);
        console.log("Transaction:", tx2.hash);
        await tx2.wait();
        console.log("✅ Arbitrum pool updated\n");
    } catch (e) {
        console.error("❌ Arbitrum update failed:", e.message);
        if (e.data) console.error("Error data:", e.data);
    }
    
    // Verify configuration
    console.log("Verifying configuration...");
    try {
        const remotePool = await sepoliaPool.getRemotePool(ARBITRUM_CHAIN);
        console.log("Sepolia → Arbitrum remote pool:", remotePool);
    } catch (e) { console.log("Sepolia remote pool: error"); }
    
    try {
        const remotePool = await arbitrumPool.getRemotePool(SEPOLIA_CHAIN);
        console.log("Arbitrum → Sepolia remote pool:", remotePool);
    } catch (e) { console.log("Arbitrum remote pool: error"); }
}

main().catch(console.error);
