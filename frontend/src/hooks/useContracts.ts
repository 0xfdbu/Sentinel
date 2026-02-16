import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient, useNetwork } from 'wagmi'
import { parseEther, formatEther, getContract, Address } from 'viem'
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

  const register = async (contractAddr: string, metadata: string = '', stakeAmount: string = '0.01') => {
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
  }

  const deregister = async (contractAddr: string) => {
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
  }

  const getProtectedContracts = async (offset: number = 0, limit: number = 10) => {
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
  }

  const getProtectedCount = async (): Promise<number> => {
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
  }

  return {
    register,
    deregister,
    getProtectedContracts,
    getProtectedCount,
    isLoading,
    REGISTRY_ADDRESS: addresses.registry,
  }
}

export function useGuardian() {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const addresses = getAddresses(chain?.id)

  const emergencyPause = async (target: string, vulnHash: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    const tx = await walletClient.writeContract({
      address: addresses.guardian,
      abi: GUARDIAN_ABI,
      functionName: 'emergencyPause',
      args: [target as Address, vulnHash as `0x${string}`],
    })
    return tx
  }

  const liftPause = async (target: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    const tx = await walletClient.writeContract({
      address: addresses.guardian,
      abi: GUARDIAN_ABI,
      functionName: 'liftPause',
      args: [target as Address],
    })
    return tx
  }

  const getActivePauses = async (): Promise<Address[]> => {
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
  }

  const getActivePauseCount = async (): Promise<number> => {
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
  }

  const getTotalPausesExecuted = async (): Promise<number> => {
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
  }

  return {
    emergencyPause,
    liftPause,
    getActivePauses,
    getActivePauseCount,
    getTotalPausesExecuted,
    GUARDIAN_ADDRESS: addresses.guardian,
  }
}

export function useAuditLogger() {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()

  const addresses = getAddresses(chain?.id)

  const getTotalScans = async (): Promise<number> => {
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
  }

  const getStats = async () => {
    if (!publicClient) return null
    try {
      const stats = await publicClient.readContract({
        address: addresses.auditLogger,
        abi: AUDIT_LOGGER_ABI,
        functionName: 'getStats',
      })
      return {
        total: Number((stats as any[])[0]),
        criticalCount: Number((stats as any[])[1]),
        highCount: Number((stats as any[])[2]),
        mediumCount: Number((stats as any[])[3]),
        lowCount: Number((stats as any[])[4]),
      }
    } catch {
      return null
    }
  }

  return {
    getTotalScans,
    getStats,
    AUDIT_LOGGER_ADDRESS: addresses.auditLogger,
  }
}
