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
  },
  sepolia: {
    registry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address,
    guardian: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1' as Address,
    auditLogger: '0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD' as Address,
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
