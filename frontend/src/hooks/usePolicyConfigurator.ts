import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useNetwork } from 'wagmi'
import { parseEther, formatEther, Address } from 'viem'

// PolicyConfigurator ABI (partial - only the functions we need)
const POLICY_CONFIGURATOR_ABI = [
  {
    name: 'arePoliciesEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'getVolumeLimits',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: [
      { name: 'min', type: 'uint256' },
      { name: 'max', type: 'uint256' },
      { name: 'daily', type: 'uint256' }
    ]
  },
  {
    name: 'getPauseThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: [{ type: 'uint8' }]
  },
  {
    name: 'getCustomBlacklist',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: [{ type: 'address[]' }]
  },
  {
    name: 'isBlacklisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'addr', type: 'address' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'isWhitelisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'addr', type: 'address' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'isAllowlistMode',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'enablePolicies',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: []
  },
  {
    name: 'disablePolicies',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'contractAddr', type: 'address' }],
    outputs: []
  },
  {
    name: 'setVolumeLimits',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'minValue', type: 'uint256' },
      { name: 'maxValue', type: 'uint256' },
      { name: 'dailyLimit', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'setPauseThreshold',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'threshold', type: 'uint8' }
    ],
    outputs: []
  },
  {
    name: 'addToCustomBlacklist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'addr', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'removeFromCustomBlacklist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'addr', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'addToWhitelist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'addr', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'removeFromWhitelist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'addr', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'blockFunction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'sig', type: 'bytes4' }
    ],
    outputs: []
  },
  {
    name: 'allowFunction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'sig', type: 'bytes4' }
    ],
    outputs: []
  },
  {
    name: 'setAllowlistMode',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'enabled', type: 'bool' }
    ],
    outputs: []
  }
] as const

// IACECompliant ABI (for checking ACE compliance)
const IACE_COMPLIANT_ABI = [
  {
    name: 'aceEnforcementEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'policyEngine',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },
  {
    name: 'setACEEnforcement',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: []
  },
  {
    name: 'setPolicyEngine',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newPolicyEngine', type: 'address' }],
    outputs: []
  }
] as const

// Sepolia addresses
const POLICY_CONFIGURATOR_ADDRESS = '0xC9380c3af2C809c2d669ad55cDc9b118264224bF'

export interface ContractPolicy {
  enabled: boolean
  minValue: string
  maxValue: string
  dailyLimit: string
  pauseThreshold: number
  blacklist: string[]
  isAllowlistMode: boolean
}

export interface ACEComplianceInfo {
  isCompliant: boolean
  aceEnforcementEnabled: boolean
  policyEngine: string
}

export function usePolicyConfigurator() {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)

  // Check if contract is ACE compliant
  const checkACECompliance = useCallback(async (contractAddr: string): Promise<ACEComplianceInfo> => {
    if (!publicClient) return { isCompliant: false, aceEnforcementEnabled: false, policyEngine: '' }
    
    try {
      const [aceEnabled, policyEngineAddr] = await Promise.all([
        publicClient.readContract({
          address: contractAddr as Address,
          abi: IACE_COMPLIANT_ABI,
          functionName: 'aceEnforcementEnabled'
        }).catch(() => false),
        publicClient.readContract({
          address: contractAddr as Address,
          abi: IACE_COMPLIANT_ABI,
          functionName: 'policyEngine'
        }).catch(() => '0x0000000000000000000000000000000000000000')
      ])
      
      return {
        isCompliant: policyEngineAddr !== '0x0000000000000000000000000000000000000000',
        aceEnforcementEnabled: aceEnabled,
        policyEngine: policyEngineAddr
      }
    } catch {
      return { isCompliant: false, aceEnforcementEnabled: false, policyEngine: '' }
    }
  }, [publicClient])

  // Get policy settings for a contract
  const getContractPolicy = useCallback(async (contractAddr: string): Promise<ContractPolicy | null> => {
    if (!publicClient) return null
    
    try {
      const [enabled, limits, threshold, blacklist, allowlistMode] = await Promise.all([
        publicClient.readContract({
          address: POLICY_CONFIGURATOR_ADDRESS,
          abi: POLICY_CONFIGURATOR_ABI,
          functionName: 'arePoliciesEnabled',
          args: [contractAddr as Address]
        }),
        publicClient.readContract({
          address: POLICY_CONFIGURATOR_ADDRESS,
          abi: POLICY_CONFIGURATOR_ABI,
          functionName: 'getVolumeLimits',
          args: [contractAddr as Address]
        }),
        publicClient.readContract({
          address: POLICY_CONFIGURATOR_ADDRESS,
          abi: POLICY_CONFIGURATOR_ABI,
          functionName: 'getPauseThreshold',
          args: [contractAddr as Address]
        }),
        publicClient.readContract({
          address: POLICY_CONFIGURATOR_ADDRESS,
          abi: POLICY_CONFIGURATOR_ABI,
          functionName: 'getCustomBlacklist',
          args: [contractAddr as Address]
        }),
        publicClient.readContract({
          address: POLICY_CONFIGURATOR_ADDRESS,
          abi: POLICY_CONFIGURATOR_ABI,
          functionName: 'isAllowlistMode',
          args: [contractAddr as Address]
        })
      ])
      
      return {
        enabled,
        minValue: formatEther(limits[0]),
        maxValue: formatEther(limits[1]),
        dailyLimit: formatEther(limits[2]),
        pauseThreshold: Number(threshold),
        blacklist: blacklist as string[],
        isAllowlistMode: allowlistMode
      }
    } catch (error) {
      console.error('Failed to get contract policy:', error)
      return null
    }
  }, [publicClient])

  // Enable custom policies
  const enablePolicies = useCallback(async (contractAddr: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'enablePolicies',
        args: [contractAddr as Address]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Disable custom policies
  const disablePolicies = useCallback(async (contractAddr: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'disablePolicies',
        args: [contractAddr as Address]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Set volume limits
  const setVolumeLimits = useCallback(async (
    contractAddr: string,
    minValue: string,
    maxValue: string,
    dailyLimit: string
  ) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'setVolumeLimits',
        args: [
          contractAddr as Address,
          parseEther(minValue),
          parseEther(maxValue),
          parseEther(dailyLimit)
        ]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Set pause threshold
  const setPauseThreshold = useCallback(async (contractAddr: string, threshold: number) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'setPauseThreshold',
        args: [contractAddr as Address, threshold]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Add to custom blacklist
  const addToBlacklist = useCallback(async (contractAddr: string, addrToBlacklist: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'addToCustomBlacklist',
        args: [contractAddr as Address, addrToBlacklist as Address]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Remove from custom blacklist
  const removeFromBlacklist = useCallback(async (contractAddr: string, addrToRemove: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'removeFromCustomBlacklist',
        args: [contractAddr as Address, addrToRemove as Address]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Add to whitelist
  const addToWhitelist = useCallback(async (contractAddr: string, addrToWhitelist: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: POLICY_CONFIGURATOR_ADDRESS,
        abi: POLICY_CONFIGURATOR_ABI,
        functionName: 'addToWhitelist',
        args: [contractAddr as Address, addrToWhitelist as Address]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  // Set ACE enforcement on the contract itself
  const setACEEnforcement = useCallback(async (contractAddr: string, enabled: boolean) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: contractAddr as Address,
        abi: IACE_COMPLIANT_ABI,
        functionName: 'setACEEnforcement',
        args: [enabled]
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient])

  return {
    checkACECompliance,
    getContractPolicy,
    enablePolicies,
    disablePolicies,
    setVolumeLimits,
    setPauseThreshold,
    addToBlacklist,
    removeFromBlacklist,
    addToWhitelist,
    setACEEnforcement,
    isLoading,
    POLICY_CONFIGURATOR_ADDRESS
  }
}
