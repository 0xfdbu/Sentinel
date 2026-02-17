import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useNetwork } from 'wagmi'
import { parseEther, Address } from 'viem'
import { REGISTRY_ABI, GUARDIAN_ABI, AUDIT_LOGGER_ABI, CONTRACT_ADDRESSES } from '../utils/wagmi'

// Helper to get addresses based on chain
const getAddresses = (chainId?: number) => {
  if (chainId === 11155111) return CONTRACT_ADDRESSES.sepolia
  return CONTRACT_ADDRESSES.hardhat
}

export function useRegistry() {
  const { address } = useAccount()
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)

  const addresses = getAddresses(chain?.id)

  const register = useCallback(async (contractAddr: string, metadata: string = '', stakeAmount: string = '0.01') => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: addresses.registry,
        abi: REGISTRY_ABI,
        functionName: 'register',
        args: [contractAddr as Address, metadata],
        value: parseEther(stakeAmount),
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, address, addresses.registry])

  const deregister = useCallback(async (contractAddr: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: addresses.registry,
        abi: REGISTRY_ABI,
        functionName: 'deregister',
        args: [contractAddr as Address],
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, addresses.registry])

  const getProtectedContracts = useCallback(async (offset: number = 0, limit: number = 10) => {
    if (!publicClient) return []
    try {
      const result = await publicClient.readContract({
        address: addresses.registry,
        abi: REGISTRY_ABI,
        functionName: 'getProtectedContracts',
        args: [BigInt(offset), BigInt(limit)],
      })
      return result as Address[]
    } catch {
      return []
    }
  }, [publicClient, addresses.registry])

  const getProtectedCount = useCallback(async (): Promise<number> => {
    if (!publicClient) return 0
    try {
      const result = await publicClient.readContract({
        address: addresses.registry,
        abi: REGISTRY_ABI,
        functionName: 'getProtectedCount',
      })
      return Number(result)
    } catch {
      return 0
    }
  }, [publicClient, addresses.registry])

  const getContractMetadata = useCallback(async (_contractAddress: string) => {
    if (!publicClient) return null
    try {
      // Try to get metadata from the contract - function may not exist
      // Return a default structure instead
      return {
        owner: '',
        stake: 0n,
        metadata: '',
        registeredAt: 0n,
      }
    } catch {
      return null
    }
  }, [publicClient])

  return {
    register,
    deregister,
    getProtectedContracts,
    getProtectedCount,
    getContractMetadata,
    isLoading,
    REGISTRY_ADDRESS: addresses.registry,
  }
}

export function useGuardian() {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const addresses = getAddresses(chain?.id)

  const emergencyPause = useCallback(async (target: string, vulnHash: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    const tx = await walletClient.writeContract({
      address: addresses.guardian,
      abi: GUARDIAN_ABI,
      functionName: 'emergencyPause',
      args: [target as Address, vulnHash as `0x${string}`],
    })
    return tx
  }, [walletClient, addresses.guardian])

  const liftPause = useCallback(async (target: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    const tx = await walletClient.writeContract({
      address: addresses.guardian,
      abi: GUARDIAN_ABI,
      functionName: 'liftPause',
      args: [target as Address],
    })
    return tx
  }, [walletClient, addresses.guardian])

  const getActivePauses = useCallback(async (): Promise<Address[]> => {
    if (!publicClient) return []
    try {
      const result = await publicClient.readContract({
        address: addresses.guardian,
        abi: GUARDIAN_ABI,
        functionName: 'getActivePauses',
      })
      return result as Address[]
    } catch {
      return []
    }
  }, [publicClient, addresses.guardian])

  const getActivePauseCount = useCallback(async (): Promise<number> => {
    if (!publicClient) return 0
    try {
      const result = await publicClient.readContract({
        address: addresses.guardian,
        abi: GUARDIAN_ABI,
        functionName: 'getActivePauseCount',
      })
      return Number(result)
    } catch {
      return 0
    }
  }, [publicClient, addresses.guardian])

  const getTotalPausesExecuted = useCallback(async (): Promise<number> => {
    if (!publicClient) return 0
    try {
      const result = await publicClient.readContract({
        address: addresses.guardian,
        abi: GUARDIAN_ABI,
        functionName: 'totalPausesExecuted',
      })
      return Number(result)
    } catch {
      return 0
    }
  }, [publicClient, addresses.guardian])

  const isPaused = useCallback(async (target: string): Promise<boolean> => {
    if (!publicClient) return false
    try {
      const result = await publicClient.readContract({
        address: addresses.guardian,
        abi: GUARDIAN_ABI,
        functionName: 'isPaused',
        args: [target as Address],
      })
      return Boolean(result)
    } catch {
      return false
    }
  }, [publicClient, addresses.guardian])

  return {
    emergencyPause,
    liftPause,
    getActivePauses,
    getActivePauseCount,
    getTotalPausesExecuted,
    isPaused,
    GUARDIAN_ADDRESS: addresses.guardian,
  }
}

export function useAuditLogger() {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()

  const addresses = getAddresses(chain?.id)

  const getTotalScans = useCallback(async (): Promise<number> => {
    if (!publicClient) return 0
    try {
      const result = await publicClient.readContract({
        address: addresses.auditLogger,
        abi: AUDIT_LOGGER_ABI,
        functionName: 'totalScans',
      })
      return Number(result)
    } catch {
      return 0
    }
  }, [publicClient, addresses.auditLogger])

  const getStats = useCallback(async () => {
    if (!publicClient) return null
    try {
      const stats = await publicClient.readContract({
        address: addresses.auditLogger,
        abi: AUDIT_LOGGER_ABI,
        functionName: 'getStats',
      }) as readonly [bigint, bigint, bigint, bigint, bigint]
      return {
        total: Number(stats[0]),
        criticalCount: Number(stats[1]),
        highCount: Number(stats[2]),
        mediumCount: Number(stats[3]),
        lowCount: Number(stats[4]),
      }
    } catch {
      return null
    }
  }, [publicClient, addresses.auditLogger])

  return {
    getTotalScans,
    getStats,
    AUDIT_LOGGER_ADDRESS: addresses.auditLogger,
  }
}

// Combined hook for general contract operations
export function useContracts() {
  const registry = useRegistry()
  const guardian = useGuardian()
  const auditLogger = useAuditLogger()

  return {
    ...registry,
    ...guardian,
    ...auditLogger,
    registry,
    guardian,
    auditLogger,
  }
}
