// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IUSDA {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IMintingConsumer {
    function emergencyMint(address to, uint256 amount, bytes32 bankRef) external;
    function bankOperator() external view returns (address);
    function stablecoin() external view returns (address);
}

/**
 * @title TestEmergencyMintV7
 * @notice Test minting via MintingConsumer emergencyMint function
 */
contract TestEmergencyMintV7 is Script {
    address constant MINTING_CONSUMER = 0xFe0747c381A2227a954FeE7f99F41E382c6039a6;
    address constant USDA_V7 = 0x500D640f4fE39dAF609C6E14C83b89A68373EaFe;
    
    function run() external {
        vm.startBroadcast();
        
        // Test recipient (can be any address)
        address recipient = msg.sender;
        uint256 amount = 1000 * 10**18; // 1000 USDA
        bytes32 bankRef = keccak256("TEST_MT103_001");
        
        console.log("=== Testing Emergency Mint ===");
        console.log("MintingConsumer:", MINTING_CONSUMER);
        console.log("USDA V7:", USDA_V7);
        console.log("Recipient:", recipient);
        console.log("Amount:", amount / 1e18, "USDA");
        
        // Check balance before
        IUSDA usda = IUSDA(USDA_V7);
        uint256 balanceBefore = usda.balanceOf(recipient);
        console.log("\nBalance before:", balanceBefore / 1e18, "USDA");
        
        // Call emergencyMint
        IMintingConsumer consumer = IMintingConsumer(MINTING_CONSUMER);
        console.log("\nCalling emergencyMint...");
        consumer.emergencyMint(recipient, amount, bankRef);
        
        // Check balance after
        uint256 balanceAfter = usda.balanceOf(recipient);
        console.log("Balance after:", balanceAfter / 1e18, "USDA");
        console.log("Minted:", (balanceAfter - balanceBefore) / 1e18, "USDA");
        
        vm.stopBroadcast();
        
        console.log("\n=== Test Complete ===");
    }
}
