// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Vault V2 interface
interface ISentinelBankVault {
    function requestMint() external payable;
    function previewMint(uint256 ethAmount) external view returns (uint256 usdaAmount);
    function mintRequests(bytes32 requestId) external view returns (
        address user,
        uint256 ethDeposited,
        uint256 usdToMint,
        uint256 requestTime,
        uint256 ethPrice,
        uint8 status
    );
    function fulfillPoR(bytes32 requestId, bool bankHasReserves, uint256 bankReservesAmount) external;
}

// USDA V4 interface
interface IUSDAStablecoin {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract TestMint is Script {
    // Configuration
    address constant VAULT_V2 = 0xDBF3C1D3CEC639C0a9Ed3d40946076a9Bc042c45;
    address constant USDA_V4 = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== MINT TEST ===");
        console.log("Tester:", deployer);
        console.log("Vault V2:", VAULT_V2);
        console.log("USDA V4:", USDA_V4);
        
        ISentinelBankVault vault = ISentinelBankVault(VAULT_V2);
        IUSDAStablecoin usda = IUSDAStablecoin(USDA_V4);
        
        // Check initial balances
        uint256 initialBalance = usda.balanceOf(deployer);
        console.log("Initial USDA Balance:", initialBalance / 1e6, "USDA");
        
        // Calculate expected mint amount
        uint256 ethAmount = 0.01 ether;
        uint256 expectedUsd = vault.previewMint(ethAmount);
        console.log("Depositing:", ethAmount / 1e18, "ETH");
        console.log("Expected USDA:", expectedUsd / 1e6, "USDA");
        
        // Step 1: Request mint with ETH
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Step 1: Requesting mint with ETH...");
        vault.requestMint{value: ethAmount}();
        
        vm.stopBroadcast();
        
        console.log("Mint request submitted!");
        console.log("Request ID: Check MintRequested event in transaction receipt");
        
        // Check balance after (may not have changed if PoR not fulfilled yet)
        uint256 afterBalance = usda.balanceOf(deployer);
        console.log("USDA Balance after request:", afterBalance / 1e6, "USDA");
        
        if (afterBalance > initialBalance) {
            console.log("MINT SUCCESSFUL!");
            console.log("Minted:", (afterBalance - initialBalance) / 1e6, "USDA");
        } else {
            console.log("Mint pending PoR verification");
            console.log("Use API server to trigger PoR verification:");
            console.log("POST /api/por/verify with autoFulfill:true");
        }
    }
}
