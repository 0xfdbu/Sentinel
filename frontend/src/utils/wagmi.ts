import { configureChains, createConfig } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { Address } from 'viem'

// Only use public providers and Hardhat local - no Alchemy required for demo
export const { chains, publicClient } = configureChains(
  [hardhat, sepolia],
  [
    // Hardhat local node
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === 31337) {
          return { http: 'http://127.0.0.1:8545' }
        }
        return null
      },
    }),
    // Public provider fallback
    publicProvider(),
  ]
)

const { connectors } = getDefaultWallets({
  appName: 'Sentinel AI Security Oracle',
  projectId: 'a1b2c3d4e5f678901234567890123456', // Valid format project ID
  chains,
})

export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

// Contract ABIs (simplified for frontend)
export const REGISTRY_ABI = [
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'isRegistered',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'metadata', type: 'string' },
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'deregister',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProtectedCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    name: 'getProtectedContracts',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'contractAddr', type: 'address' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'stake', type: 'uint256' },
    ],
    name: 'ContractRegistered',
    type: 'event',
  },
] as const

export const GUARDIAN_ABI = [
  {
    inputs: [{ name: 'target', type: 'address' }],
    name: 'isPaused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActivePauseCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActivePauses',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalPausesExecuted',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'target', type: 'address' },
      { indexed: true, name: 'vulnHash', type: 'bytes32' },
      { indexed: false, name: 'expiresAt', type: 'uint256' },
      { indexed: false, name: 'sentinel', type: 'address' },
    ],
    name: 'EmergencyPauseTriggered',
    type: 'event',
  },
] as const

export const AUDIT_LOGGER_ABI = [
  {
    inputs: [],
    name: 'totalScans',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    name: 'getAllScans',
    outputs: [{ name: '', type: 'tuple[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStats',
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'criticalCount', type: 'uint256' },
      { name: 'highCount', type: 'uint256' },
      { name: 'mediumCount', type: 'uint256' },
      { name: 'lowCount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'scanId', type: 'uint256' },
      { indexed: true, name: 'target', type: 'address' },
      { indexed: true, name: 'vulnHash', type: 'bytes32' },
      { indexed: false, name: 'severity', type: 'uint8' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'ScanLogged',
    type: 'event',
  },
] as const

// Contract addresses are loaded dynamically from deployment files
// See src/utils/contracts.ts for dynamic loading
export const CONTRACT_ADDRESSES = {
  hardhat: {
    registry: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
    guardian: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
    auditLogger: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
  },
  sepolia: {
    registry: '' as Address,
    guardian: '' as Address,
    auditLogger: '' as Address,
  },
}
