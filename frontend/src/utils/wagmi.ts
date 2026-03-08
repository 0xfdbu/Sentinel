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
    sentinelRegistry: '0x0000000000000000000000000000000000000000' as Address,
    guardian: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
    auditLogger: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
    policyEngine: '0x0000000000000000000000000000000000000000' as Address,
    volumePolicy: '0x0000000000000000000000000000000000000000' as Address,
    blacklistPolicy: '0x0000000000000000000000000000000000000000' as Address,
    policyConfigurator: '0x0000000000000000000000000000000000000000' as Address,
    usda: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
  },
  sepolia: {
    registry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address, // SentinelRegistry V8
    sentinelRegistry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address, // V8
    guardian: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1' as Address, // EmergencyGuardian V8
    auditLogger: '0x12DfF0223Cf652091b2360Ecf1592EDB696F3cbD' as Address,
    policyEngine: '0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347' as Address, // PolicyEngine V8
    volumePolicy: '0x84e1b5E100393105608Ab05d549Da936cD7E995a' as Address, // VolumePolicyDON V8
    blacklistPolicy: '0x62CC29A58404631B7db65CE14E366F63D3B96B16' as Address, // PolicyEngine (Blacklist) V8
    policyConfigurator: '0xC9380c3af2C809c2d669ad55cDc9b118264224bF' as Address,
    usda: '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45' as Address, // USDA V8
    vault: '0x12fe97b889158380e1D94b69718F89E521b38c11' as Address, // SentinelVaultETH V8
    mintingConsumer: '0xb59f7feb8e609faec000783661d4197ee38a8b07' as Address, // MintingConsumerV8
    freezer: '0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21' as Address, // USDAFreezer V8
  },
  arbitrumSepolia: {
    registry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address,
    sentinelRegistry: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9' as Address,
    guardian: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1' as Address,
    auditLogger: '0x0000000000000000000000000000000000000000' as Address,
    policyEngine: '0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347' as Address,
    volumePolicy: '0x84e1b5E100393105608Ab05d549Da936cD7E995a' as Address,
    blacklistPolicy: '0x62CC29A58404631B7db65CE14E366F63D3B96B16' as Address,
    policyConfigurator: '0x0000000000000000000000000000000000000000' as Address,
    usda: '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45' as Address,
    vault: '0x12fe97b889158380e1D94b69718F89E521b38c11' as Address,
    mintingConsumer: '0xb59f7feb8e609faec000783661d4197ee38a8b07' as Address,
    freezer: '0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21' as Address,
  },
}

// Helper to get addresses based on chain
export const getAddresses = (chainId?: number) => {
  if (chainId === 11155111) return CONTRACT_ADDRESSES.sepolia
  if (chainId === 421614) return CONTRACT_ADDRESSES.arbitrumSepolia
  return CONTRACT_ADDRESSES.hardhat
}
