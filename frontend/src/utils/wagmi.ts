import { configureChains, createConfig } from 'wagmi'
import { sepolia, hardhat } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { Address } from 'viem'

// Configure chains with better RPC endpoints
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
    // Sepolia via Tenderly Gateway
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === 11155111) {
          return { http: 'https://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH' }
        }
        return null
      },
    }),
    // Public provider fallback
    publicProvider(),
  ]
)

// WalletConnect Project ID (optional - for WalletConnect support)
const projectId = (import.meta as any).env?.VITE_WALLET_CONNECT_PROJECT_ID || ''

// Create wallet connectors
const wallets = [
  injectedWallet({ chains }),
  metaMaskWallet({ projectId: projectId || 'demo', chains }),
  coinbaseWallet({ appName: 'Sentinel AI Security Oracle', chains }),
]

// Add WalletConnect if project ID is available
if (projectId) {
  wallets.push(walletConnectWallet({ projectId, chains }))
}

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets,
  },
])

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
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'vulnHash', type: 'bytes32' },
    ],
    name: 'emergencyPause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'target', type: 'address' }],
    name: 'liftPause',
    outputs: [],
    stateMutability: 'nonpayable',
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

// Contract addresses
export const CONTRACT_ADDRESSES = {
  hardhat: {
    registry: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
    guardian: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
    auditLogger: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
    reserveHealthMonitor: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
    riskProfileRegistry: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
  },
  sepolia: {
    registry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address,
    guardian: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1' as Address,
    auditLogger: '0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD' as Address,
    reserveHealthMonitor: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
    riskProfileRegistry: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
  },
}

// Helper to get addresses based on chain
export const getAddresses = (chainId?: number) => {
  if (chainId === 11155111) return CONTRACT_ADDRESSES.sepolia
  return CONTRACT_ADDRESSES.hardhat
}
