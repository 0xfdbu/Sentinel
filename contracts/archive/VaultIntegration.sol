// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title VaultIntegration
 * @notice Interface to interact with Chainlink Compliant Private Transfer Vault
 */
interface IVault {
    function deposit(address token, uint256 amount) external;
    function withdraw(address token, uint256 amount, bytes calldata ticket) external;
    function getTokenPolicyEngine(address token) external view returns (address);
    function isTokenRegistered(address token) external view returns (bool);
}

contract USDAVaultIntegration {
    address public constant VAULT = 0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13;
    address public constant USDA = 0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6;
    
    function isUSDARegistered() external view returns (bool) {
        return IVault(VAULT).isTokenRegistered(USDA);
    }
    
    function getUSDAPolicyEngine() external view returns (address) {
        return IVault(VAULT).getTokenPolicyEngine(USDA);
    }
}
