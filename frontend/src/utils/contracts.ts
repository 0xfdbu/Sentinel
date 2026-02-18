/**
 * Contract Address Management
 * 
 * Dynamically loads contract addresses from deployment files
 * Falls back to environment variables or defaults
 */

import { Address } from 'viem';

// Default Hardhat addresses (will be overridden by deployment files)
const DEFAULT_ADDRESSES = {
  hardhat: {
    registry: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
    guardian: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
    auditLogger: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
    mockToken: '0x0000000000000000000000000000000000000000' as Address,
    pausableVault: '0x0000000000000000000000000000000000000000' as Address,
    reentrancyAttacker: '0x0000000000000000000000000000000000000000' as Address,
    reserveHealthMonitor: '0x0000000000000000000000000000000000000000' as Address,
    riskProfileRegistry: '0x0000000000000000000000000000000000000000' as Address,
  },
  sepolia: {
    // Core Sentinel Contracts
    registry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address,
    guardian: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1' as Address,
    auditLogger: '0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD' as Address,
    // New Risk & Compliance Contracts (Deployed Feb 2026)
    mockToken: '0xEa9dfB83A202253B79A6C23A0B40a2e786CF06D3' as Address,
    pausableVault: '0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C' as Address,
    reentrancyAttacker: '0x44EF43391d83B6c89Eba95591329fEAD9fC24ED8' as Address,
    reserveHealthMonitor: '0x4fDC65D9B02df818d3BcA82cd1d5dc6Be7D8838a' as Address,
    riskProfileRegistry: '0x33d347Fbe9552Dbafb2005b4c59793fEc4bdD643' as Address,
  },
};

// Cache for loaded addresses
let cachedAddresses: typeof DEFAULT_ADDRESSES | null = null;

/**
 * Load contract addresses from deployment file or environment
 */
export async function loadContractAddresses(): Promise<typeof DEFAULT_ADDRESSES> {
  if (cachedAddresses) return cachedAddresses;

  try {
    // Try to fetch the latest deployment
    const response = await fetch('/contracts/deployments/hardhat-latest.json');
    if (response.ok) {
      const deployment = await response.json();
      cachedAddresses = {
        ...DEFAULT_ADDRESSES,
        hardhat: {
          registry: deployment.addresses.registry as Address,
          guardian: deployment.addresses.guardian as Address,
          auditLogger: deployment.addresses.auditLogger as Address,
          mockToken: (deployment.addresses.mockToken || '0x0000000000000000000000000000000000000000') as Address,
          pausableVault: (deployment.addresses.pausableVault || '0x0000000000000000000000000000000000000000') as Address,
          reentrancyAttacker: (deployment.addresses.reentrancyAttacker || '0x0000000000000000000000000000000000000000') as Address,
          reserveHealthMonitor: (deployment.addresses.reserveHealthMonitor || '0x0000000000000000000000000000000000000000') as Address,
          riskProfileRegistry: (deployment.addresses.riskProfileRegistry || '0x0000000000000000000000000000000000000000') as Address,
        }
      };
      console.log('Loaded contract addresses from deployment:', cachedAddresses);
      return cachedAddresses;
    }
  } catch (e) {
    console.warn('Could not load deployment file, using defaults:', e);
  }

  cachedAddresses = DEFAULT_ADDRESSES;
  return cachedAddresses;
}

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 31337: // Hardhat
      return cachedAddresses?.hardhat || DEFAULT_ADDRESSES.hardhat;
    case 11155111: // Sepolia
      return cachedAddresses?.sepolia || DEFAULT_ADDRESSES.sepolia;
    default:
      return DEFAULT_ADDRESSES.hardhat;
  }
}

// Export default addresses for immediate use
export const CONTRACT_ADDRESSES = DEFAULT_ADDRESSES;

/**
 * Contract ABIs for interacting with Sentinel contracts
 */
export const CONTRACT_ABIS = {
  // ERC20 Mock Token
  mockToken: [
    'function mint(address to, uint256 amount) external',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  ],
  // Pausable Vault with intentional vulnerability for demo
  pausableVault: [
    'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
    'function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)',
    'function balanceOf(address account) external view returns (uint256)',
    'function totalAssets() external view returns (uint256)',
    'function pause() external',
    'function unpause() external',
    'function paused() external view returns (bool)',
    'function asset() external view returns (address)',
  ],
  // Reentrancy Attacker (for demo)
  reentrancyAttacker: [
    'function attack(uint256 amount) external',
    'function executeAttack() external',
    'function getProfit() external view returns (uint256)',
  ],
  // Reserve Health Monitor
  reserveHealthMonitor: [
    'function addForMonitoring(address contractAddr, bytes32 assetType, uint256 tvlThreshold, uint256 collateralThreshold) external',
    'function updateHealthMetrics(address contractAddr, uint256 newTVL, uint256 newCollateralRatio) external returns (uint8)',
    'function getHealthStatus(address contractAddr) external view returns (uint8)',
    'function checkDepeg(address stablecoin) external view returns (bool, uint256)',
    'function pause() external',
    'function unpause() external',
  ],
  // Risk Profile Registry
  riskProfileRegistry: [
    'function registerContract(address contractAddr, uint8 riskLevel, uint8 kycLevel, bytes32 jurisdiction) external',
    'function updateRiskProfile(address contractAddr, uint8 newRiskLevel, string calldata reason) external',
    'function addComplianceOracle(address oracle) external',
    'function getRiskProfile(address contractAddr) external view returns (tuple(uint8 level, uint8 kycRequirement, bytes32 jurisdiction, bool isActive))',
    'function meetsCompliance(address contractAddr, address user) external view returns (bool)',
  ],
} as const;

/**
 * Pause Format Requirements
 * 
 * For Sentinel's emergency pause to work, the target contract MUST implement
 * the IPausable interface with the following function:
 * 
 * ```solidity
 * interface IPausable {
 *     function pause() external;
 *     function unpause() external;
 * }
 * ```
 * 
 * The EmergencyGuardian calls:
 *   emergencyPause(address target, bytes32 vulnerabilityHash)
 * 
 * Where:
 *   - target: The contract address to pause
 *   - vulnerabilityHash: SHA256 hash of vulnerability details (bytes32)
 * 
 * Example:
 *   await guardian.emergencyPause(
 *     "0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C",
 *     "0x1234...abcd" // 32-byte hash
 *   );
 */
export const PAUSE_REQUIREMENTS = {
  // Function signature required on target contract
  requiredInterface: [
    'function pause() external',
    'function unpause() external',
  ],
  // Guardian function signature
  guardianFunction: 'function emergencyPause(address target, bytes32 vulnerabilityHash) external',
  // Parameters
  params: {
    target: 'address - The contract to pause',
    vulnerabilityHash: 'bytes32 - SHA256 hash of vulnerability details (0x + 64 hex chars)',
  },
  // Example hash format
  exampleHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
} as const;
