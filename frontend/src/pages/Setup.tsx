/**
 * Setup Wizard - 4-Step Sentinel Configuration
 * Landing page style design with dark neutral theme
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Loader2,
  ExternalLink,
  Users,
  FileCode,
  Key,
  Zap,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  Medal,
  Link,
  Search,
  CheckCircle
} from 'lucide-react'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { Link as RouterLink } from 'react-router-dom'
import { getAddresses } from '../utils/wagmi'
import { keccak256, toHex, formatEther } from 'viem'

// Role bytes32 helpers
const getRoleHash = (role: string) => keccak256(toHex(role))

const ROLES = {
  ADMIN: getRoleHash('ADMIN_ROLE'),
  GUARDIAN: getRoleHash('GUARDIAN_ROLE'),
  SENTINEL: getRoleHash('SENTINEL_ROLE'),
  PAUSER: getRoleHash('PAUSER_ROLE'),
  DON_SIGNER: getRoleHash('DON_SIGNER_ROLE'),
  BLACKLIST_MANAGER: getRoleHash('BLACKLIST_MANAGER_ROLE'),
  POLICY_MANAGER: getRoleHash('POLICY_MANAGER_ROLE'),
}

// Contract ABIs
const REGISTRY_V3_ABI = [
  {
    name: 'registerGuardian',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'metadata', type: 'string' }],
    outputs: []
  },
  {
    name: 'deregisterGuardian',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'getGuardian',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{
      components: [
        { name: 'status', type: 'uint8' },
        { name: 'stakedAmount', type: 'uint256' },
        { name: 'registeredAt', type: 'uint256' },
        { name: 'lastActivityAt', type: 'uint256' },
        { name: 'totalActions', type: 'uint256' },
        { name: 'successfulActions', type: 'uint256' },
        { name: 'falsePositives', type: 'uint256' },
        { name: 'reputation', type: 'uint256' },
        { name: 'metadata', type: 'string' }
      ],
      type: 'tuple'
    }]
  },
  {
    name: 'getActiveGuardians',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }]
  },
  {
    name: 'getGuardianCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'isActiveGuardian',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'GUARDIAN_STAKE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'linkToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  }
] as const

const POLICY_ABI = [
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'isActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  }
] as const

const TOKEN_ABI = [
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  }
] as const

const LINK_TOKEN_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
] as const

// Guardian status enum
const GUARDIAN_STATUS = ['Inactive', 'Active', 'Suspended', 'Slashed'] as const

type Step = 1 | 2 | 3 | 4

interface GuardianInfo {
  address: string
  status: number
  stakedAmount: bigint
  registeredAt: bigint
  lastActivityAt: bigint
  totalActions: bigint
  successfulActions: bigint
  falsePositives: bigint
  reputation: bigint
  metadata: string
}

interface ContractToProtect {
  id: string
  address: string
  name: string
  type: 'token' | 'policy' | 'custom'
}

interface PermissionRole {
  id: string
  name: string
  contract: string
  contractAddress: string
  roleHash: string
  granted: boolean
}

// Grid Background Component
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        backgroundSize: '100% 4px'
      }} />
      <div className="absolute inset-0 opacity-[0.15]" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10" />
    </div>
  )
}

export default function Setup() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const ADDRESSES = getAddresses(chainId)

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Step 1: Guardian selection
  const [guardians, setGuardians] = useState<GuardianInfo[]>([])
  const [selectedGuardian, setSelectedGuardian] = useState<string>('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  
  // Step 2: Contracts
  const [contracts, setContracts] = useState<ContractToProtect[]>([])
  const [newContractAddress, setNewContractAddress] = useState('')
  const [newContractName, setNewContractName] = useState('')
  
  // Step 3: Permissions
  const [permissions, setPermissions] = useState<PermissionRole[]>([])
  
  // Step 4: Summary
  const [completed, setCompleted] = useState(false)

  // Load guardians
  const loadGuardians = useCallback(async () => {
    console.log('Loading guardians...', { 
      hasPublicClient: !!publicClient, 
      registry: ADDRESSES.sentinelRegistry,
      chainId 
    })
    
    if (!publicClient || !ADDRESSES.sentinelRegistry) {
      console.log('Missing publicClient or registry address')
      return
    }

    if (ADDRESSES.sentinelRegistry === '0x0000000000000000000000000000000000000000') {
      console.log('Registry address is zero')
      return
    }

    try {
      const registry = ADDRESSES.sentinelRegistry
      
      console.log('Calling getActiveGuardians on', registry)
      
      // Check if contract exists first
      const code = await publicClient.getBytecode({ address: registry as `0x${string}` })
      if (!code || code === '0x') {
        console.log('No contract found at registry address')
        setGuardians([])
        return
      }
      
      const guardianAddresses = await publicClient.readContract({
        address: registry as `0x${string}`,
        abi: REGISTRY_V3_ABI,
        functionName: 'getActiveGuardians'
      }) as `0x${string}`[]

      console.log('Got guardians:', guardianAddresses)

      if (guardianAddresses.length === 0) {
        console.log('No guardians found')
        setGuardians([])
        return
      }

      const guardianDetails = await Promise.all(
        guardianAddresses.map(async (addr) => {
          console.log('Loading details for', addr)
          const info = await publicClient.readContract({
            address: registry as `0x${string}`,
            abi: REGISTRY_V3_ABI,
            functionName: 'getGuardian',
            args: [addr]
          }) as {
            status: number
            stakedAmount: bigint
            registeredAt: bigint
            lastActivityAt: bigint
            totalActions: bigint
            successfulActions: bigint
            falsePositives: bigint
            reputation: bigint
            metadata: string
          }

          return {
            address: addr,
            status: info.status,
            stakedAmount: info.stakedAmount,
            registeredAt: info.registeredAt,
            lastActivityAt: info.lastActivityAt,
            totalActions: info.totalActions,
            successfulActions: info.successfulActions,
            falsePositives: info.falsePositives,
            reputation: info.reputation,
            metadata: info.metadata
          }
        })
      )

      console.log('Guardian details:', guardianDetails)
      setGuardians(guardianDetails)
    } catch (error: any) {
      console.error('Failed to load guardians:', error)
      // Check if it's a contract error
      if (error.message?.includes('returned no data') || error.message?.includes('0x')) {
        console.log('Contract may not be deployed or ABI mismatch')
        setGuardians([])
        // Don't show error toast - just empty state
        return
      }
      toast.error('Failed to load guardians: ' + (error as Error).message)
    }
  }, [publicClient, ADDRESSES.sentinelRegistry, chainId])

  // Load permissions for selected guardian
  const loadPermissions = useCallback(async () => {
    if (!publicClient || !selectedGuardian) return

    setIsLoading(true)
    try {
      const perms: PermissionRole[] = []
      let id = 0

      // Check each contract
      if (ADDRESSES.blacklistPolicy) {
        const hasRole = await publicClient.readContract({
          address: ADDRESSES.blacklistPolicy as `0x${string}`,
          abi: POLICY_ABI,
          functionName: 'hasRole',
          args: [ROLES.DON_SIGNER, selectedGuardian as `0x${string}`]
        }).catch(() => false)

        perms.push({
          id: `perm-${id++}`,
          name: 'DON Signer',
          contract: 'BlacklistPolicy',
          contractAddress: ADDRESSES.blacklistPolicy,
          roleHash: ROLES.DON_SIGNER,
          granted: hasRole as boolean
        })
      }

      if (ADDRESSES.volumePolicy) {
        const hasRole = await publicClient.readContract({
          address: ADDRESSES.volumePolicy as `0x${string}`,
          abi: POLICY_ABI,
          functionName: 'hasRole',
          args: [ROLES.DON_SIGNER, selectedGuardian as `0x${string}`]
        }).catch(() => false)

        perms.push({
          id: `perm-${id++}`,
          name: 'DON Signer',
          contract: 'VolumePolicy',
          contractAddress: ADDRESSES.volumePolicy,
          roleHash: ROLES.DON_SIGNER,
          granted: hasRole as boolean
        })
      }

      if (ADDRESSES.usda) {
        const hasRole = await publicClient.readContract({
          address: ADDRESSES.usda as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'hasRole',
          args: [ROLES.PAUSER, selectedGuardian as `0x${string}`]
        }).catch(() => false)

        perms.push({
          id: `perm-${id++}`,
          name: 'Pauser',
          contract: 'USDA Token',
          contractAddress: ADDRESSES.usda,
          roleHash: ROLES.PAUSER,
          granted: hasRole as boolean
        })
      }

      // Check custom contracts
      for (const contract of contracts) {
        if (contract.type === 'custom' && contract.address) {
          const hasRole = await publicClient.readContract({
            address: contract.address as `0x${string}`,
            abi: TOKEN_ABI,
            functionName: 'hasRole',
            args: [ROLES.PAUSER, selectedGuardian as `0x${string}`]
          }).catch(() => false)

          perms.push({
            id: `perm-${id++}`,
            name: 'Pauser',
            contract: contract.name,
            contractAddress: contract.address,
            roleHash: ROLES.PAUSER,
            granted: hasRole as boolean
          })
        }
      }

      setPermissions(perms)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, selectedGuardian, contracts, ADDRESSES])

  // Add default contracts on step 2
  useEffect(() => {
    if (currentStep === 2 && contracts.length === 0) {
      const defaults: ContractToProtect[] = []
      if (ADDRESSES.usda) {
        defaults.push({ id: 'default-usda', address: ADDRESSES.usda, name: 'USDA Token', type: 'token' })
      }
      if (ADDRESSES.blacklistPolicy) {
        defaults.push({ id: 'default-blacklist', address: ADDRESSES.blacklistPolicy, name: 'BlacklistPolicy', type: 'policy' })
      }
      if (ADDRESSES.volumePolicy) {
        defaults.push({ id: 'default-volume', address: ADDRESSES.volumePolicy, name: 'VolumePolicy', type: 'policy' })
      }
      setContracts(defaults)
    }
  }, [currentStep, ADDRESSES])

  // Load permissions on step 3
  useEffect(() => {
    if (currentStep === 3) {
      loadPermissions()
    }
  }, [currentStep, loadPermissions])

  // Initial load
  useEffect(() => {
    if (isConnected && publicClient) {
      console.log('Initial load triggered')
      loadGuardians()
    }
  }, [isConnected, publicClient, loadGuardians])

  const addContract = () => {
    if (!newContractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid address')
      return
    }
    setContracts([...contracts, {
      id: `custom-${Date.now()}`,
      address: newContractAddress,
      name: newContractName || 'Custom Contract',
      type: 'custom'
    }])
    setNewContractAddress('')
    setNewContractName('')
  }

  const removeContract = (id: string) => {
    setContracts(contracts.filter(c => c.id !== id))
  }

  const grantPermission = async (perm: PermissionRole) => {
    if (!walletClient) return

    setIsLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: perm.contractAddress as `0x${string}`,
        abi: POLICY_ABI,
        functionName: 'grantRole',
        args: [perm.roleHash as `0x${string}`, selectedGuardian as `0x${string}`]
      })

      toast.loading(`Granting ${perm.name} on ${perm.contract}...`, { id: 'grant' })
      await publicClient!.waitForTransactionReceipt({ hash })
      toast.success('Permission granted!', { id: 'grant' })

      // Update local state
      setPermissions(permissions.map(p => 
        p.id === perm.id ? { ...p, granted: true } : p
      ))
    } catch (error: any) {
      console.error('Grant failed:', error)
      toast.error(error?.message || 'Failed to grant permission', { id: 'grant' })
    } finally {
      setIsLoading(false)
    }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedGuardian
      case 2: return true // Optional step
      case 3: return permissions.every(p => p.granted)
      default: return true
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white relative">
        <GridBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-24 h-24 rounded-3xl border border-white/10 bg-neutral-900/50 flex items-center justify-center mx-auto mb-8">
              <Wallet className="w-12 h-12 text-neutral-400" />
            </div>
            <h1 className="text-4xl font-semibold text-white mb-4">Connect Wallet</h1>
            <p className="text-neutral-400 mb-8">
              Connect your wallet to configure Sentinel protection for your contracts.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white relative">
      <GridBackground />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-neutral-900/50 text-neutral-400 text-sm mb-6">
            <Shield className="w-4 h-4" />
            <span>Sentinel Setup Wizard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Protect Your Contracts
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Configure Sentinel guardians and permissions in 4 simple steps
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3, 4].map((step, idx) => (
              <div key={step} className="flex items-center">
                <motion.div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                    currentStep >= step 
                      ? "bg-white text-neutral-950" 
                      : "border border-white/10 text-neutral-500"
                  )}
                  animate={{ scale: currentStep === step ? 1.1 : 1 }}
                >
                  {currentStep > step ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </motion.div>
                {idx < 3 && (
                  <div className={cn(
                    "w-16 h-px mx-4",
                    currentStep > step ? "bg-white/40" : "bg-white/10"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-16 mt-3 text-xs text-neutral-500">
            <span className={currentStep === 1 ? 'text-white' : ''}>Guardian</span>
            <span className={currentStep === 2 ? 'text-white' : ''}>Contracts</span>
            <span className={currentStep === 3 ? 'text-white' : ''}>Permissions</span>
            <span className={currentStep === 4 ? 'text-white' : ''}>Complete</span>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Select Guardian */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl border border-white/10 bg-neutral-800/50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-neutral-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Select Guardian</h2>
                      <p className="text-neutral-400 text-sm">Choose a guardian to protect your contracts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadGuardians}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                      Refresh
                    </button>
                    <button
                      onClick={() => setShowRegisterModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Register New
                    </button>
                  </div>
                </div>

                {/* Contract Addresses */}
                <div className="mb-4 p-3 rounded-lg border border-white/5 bg-neutral-950/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Registry:</span>
                    <code className="text-neutral-400 font-mono">{ADDRESSES.sentinelRegistry?.slice(0, 10)}...{ADDRESSES.sentinelRegistry?.slice(-8)}</code>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Guardian (DON):</span>
                    <code className="text-neutral-400 font-mono">{ADDRESSES.guardian?.slice(0, 10)}...{ADDRESSES.guardian?.slice(-8)}</code>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Forwarder:</span>
                    <code className="text-neutral-400 font-mono">{ADDRESSES.forwarder?.slice(0, 10)}...{ADDRESSES.forwarder?.slice(-8)}</code>
                  </div>
                </div>

                {guardians.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                    <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400">No guardians found</p>
                    <p className="text-neutral-600 text-sm mt-2">
                      Chain ID: {chainId} • Registry: {ADDRESSES.sentinelRegistry ? 'Set' : 'Not set'}
                    </p>
                    <button
                      onClick={() => setShowRegisterModal(true)}
                      className="mt-4 text-white hover:underline"
                    >
                      Register as guardian →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {guardians.map((g) => (
                      <div
                        key={g.address}
                        onClick={() => setSelectedGuardian(g.address)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                          selectedGuardian === g.address
                            ? "border-white/30 bg-white/5"
                            : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800 flex items-center justify-center">
                            <Medal className="w-5 h-5 text-neutral-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm text-neutral-300 font-mono">
                                {g.address.slice(0, 6)}...{g.address.slice(-4)}
                              </code>
                              {g.address === address && (
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 text-xs">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                              Reputation: {Number(g.reputation) / 100}% • Stake: {formatEther(g.stakedAmount)} LINK
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            g.status === 1 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          )}>
                            {GUARDIAN_STATUS[g.status]}
                          </span>
                          {selectedGuardian === g.address && (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Contracts */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-neutral-800/50 flex items-center justify-center">
                    <FileCode className="w-6 h-6 text-neutral-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Contracts to Protect</h2>
                    <p className="text-neutral-400 text-sm">Optional: Add additional contracts to protect</p>
                  </div>
                </div>

                {/* Default contracts */}
                <div className="space-y-3 mb-6">
                  {contracts.filter(c => c.id.startsWith('default')).map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-white/10 bg-neutral-800 flex items-center justify-center">
                          {contract.type === 'token' ? <Zap className="w-4 h-4 text-neutral-400" /> : <Shield className="w-4 h-4 text-neutral-400" />}
                        </div>
                        <div>
                          <div className="text-white font-medium">{contract.name}</div>
                          <code className="text-xs text-neutral-500 font-mono">{contract.address}</code>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500">Default</span>
                    </div>
                  ))}
                </div>

                {/* Custom contracts */}
                <div className="space-y-3 mb-6">
                  {contracts.filter(c => !c.id.startsWith('default')).map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-white/10 bg-neutral-800 flex items-center justify-center">
                          <FileCode className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{contract.name}</div>
                          <code className="text-xs text-neutral-500 font-mono">{contract.address}</code>
                        </div>
                      </div>
                      <button
                        onClick={() => removeContract(contract.id)}
                        className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new contract */}
                <div className="p-4 rounded-xl border border-dashed border-white/10">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Contract address (0x...)"
                      value={newContractAddress}
                      onChange={(e) => setNewContractAddress(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
                    />
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={newContractName}
                      onChange={(e) => setNewContractName(e.target.value)}
                      className="w-40 bg-neutral-950 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
                    />
                    <button
                      onClick={addContract}
                      disabled={!newContractAddress.match(/^0x[a-fA-F0-9]{40}$/)}
                      className="px-4 py-2 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Grant Permissions */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-neutral-800/50 flex items-center justify-center">
                    <Key className="w-6 h-6 text-neutral-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Grant Permissions</h2>
                    <p className="text-neutral-400 text-sm">Give the guardian necessary roles on each contract</p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                    <CheckCircle2 className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400">No permissions needed</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {permissions.map((perm) => (
                      <div
                        key={perm.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border",
                          perm.granted 
                            ? "border-emerald-500/30 bg-emerald-500/5" 
                            : "border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg border flex items-center justify-center",
                            perm.granted 
                              ? "border-emerald-500/30 bg-emerald-500/10" 
                              : "border-white/10 bg-neutral-800"
                          )}>
                            {perm.granted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Key className="w-5 h-5 text-neutral-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-white font-medium">{perm.name}</div>
                            <div className="text-xs text-neutral-500">{perm.contract}</div>
                          </div>
                        </div>
                        {!perm.granted && (
                          <button
                            onClick={() => grantPermission(perm)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors text-sm"
                          >
                            Grant
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {permissions.every(p => p.granted) && permissions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10"
                  >
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>All permissions granted!</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-semibold text-white mb-4">Setup Complete!</h2>
              <p className="text-neutral-400 max-w-md mx-auto mb-8">
                Your guardian is now configured and ready to protect your contracts. 
                You can monitor activity and manage settings from the dashboard.
              </p>
              <div className="flex justify-center gap-4">
                <RouterLink
                  to="/setup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Go to Monitor
                </RouterLink>
                <button
                  onClick={() => {
                    setCurrentStep(1)
                    setSelectedGuardian('')
                    setContracts([])
                    setPermissions([])
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-white rounded-lg font-medium hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Setup Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep((prev) => (prev > 1 ? (prev - 1) as Step : prev))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => {
                if (currentStep === 3) {
                  setCompleted(true)
                }
                setCurrentStep((prev) => (prev < 4 ? (prev + 1) as Step : prev))
              }}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {currentStep === 3 ? 'Complete' : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Register Guardian Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowRegisterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-2">Register as Guardian</h3>
              <p className="text-neutral-400 text-sm mb-6">
                Stake 5 LINK to become a Sentinel guardian and protect contracts.
              </p>
              
              <div className="p-4 rounded-xl border border-white/10 bg-neutral-950 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-400">Required Stake</span>
                  <span className="text-white font-medium">5 LINK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Your Balance</span>
                  <span className="text-neutral-300">{formatEther(0n)} LINK</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 px-4 py-3 border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRegisterModal(false)
                    toast('Registration coming soon', { icon: '🔜' })
                  }}
                  className="flex-1 px-4 py-3 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
                >
                  Register
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
