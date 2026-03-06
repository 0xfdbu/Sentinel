// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Wrapper to expose BurnMintTokenPool from @chainlink/contracts-ccip for Hardhat compilation
// Uses remapped path from foundry.toml

import "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";

// This contract exists solely to trigger Hardhat compilation of the BurnMintTokenPool
// Deploy the BurnMintTokenPool directly using the imported artifact
contract BurnMintTokenPoolWrapper is BurnMintTokenPool {
    constructor(
        IBurnMintERC20 token,
        uint8 decimals,
        address[] memory allowlist,
        address rmnProxy,
        address router
    ) BurnMintTokenPool(token, decimals, allowlist, rmnProxy, router) {}
}
