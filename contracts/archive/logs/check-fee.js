const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider(
        "https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH"
    );
    
    const router = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const usda = "0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6";
    const receiver = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const arbitrumChain = "3478487238524512106";
    
    console.log("Checking CCIP Fee");
    console.log("=================\n");
    
    // Router ABI for getFee
    const routerAbi = [
        "function getFee(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) view returns (uint256)"
    ];
    
    const routerContract = new ethers.Contract(router, routerAbi, provider);
    
    // Build message
    const message = {
        receiver: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [receiver]),
        data: "0x",
        tokenAmounts: [{
            token: usda,
            amount: 250000
        }],
        feeToken: ethers.ZeroAddress, // Use native ETH
        extraArgs: "0x"
    };
    
    try {
        const fee = await routerContract.getFee(arbitrumChain, message);
        console.log("CCIP Fee Required:", ethers.formatEther(fee), "ETH");
        console.log("Fee in wei:", fee.toString());
        console.log("");
        console.log("Current fee being sent: 0.01 ETH");
        if (fee > ethers.parseEther("0.01")) {
            console.log("❌ Fee is TOO LOW! Need to send more ETH");
        } else {
            console.log("✅ Fee should be sufficient");
        }
    } catch (e) {
        console.error("Error getting fee:", e.message);
    }
}

main().catch(console.error);
