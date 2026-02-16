import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, formatEther, getContract, Address } from 'viem'
import { REGISTRY_ABI, GUARDIAN_ABI, AUDIT_LOGGER_ABI, CONTRACT_ADDRESSES } from '../utils/wagmi'

const REGISTRY_ADDRESS = CONTRACT_ADDRESSES.hardhat.registry
const GUARDIAN_ADDRESS = CONTRACT_ADDRESSES.hardhat.guardian
const AUDIT_LOGGER_ADDRESS = CONTRACT_ADDRESSES.hardhat.auditLogger

export function useRegistry() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)

  const register = async (contractAddr: string, metadata: string = '', stakeAmount: string = '0.01') => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: REGISTRY_ADDRESS,
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
        address: REGISTRY_ADDRESS,
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
        address: REGISTRY_ADDRESS,
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
        address: REGISTRY_ADDRESS,
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
    REGISTRY_ADDRESS,
  }
}

export function useGuardian() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const emergencyPause = async (target: string, vulnHash: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    const tx = await walletClient.writeContract({
      address: GUARDIAN_ADDRESS,
      abi: GUARDIAN_ABI,
      functionName: 'emergencyPause',
      args: [target as Address, vulnHash as `0x${string}`],
    })
    return tx
  }

  const liftPause = async (target: string) => {
    if (!walletClient) throw new Error('Wallet not connected')
    const tx = await walletClient.writeContract({
      address: GUARDIAN_ADDRESS,
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
        address: GUARDIAN_ADDRESS,
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
        address: GUARDIAN_ADDRESS,
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
        address: GUARDIAN_ADDRESS,
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
    GUARDIAN_ADDRESS,
  }
}

export function useAuditLogger() {
  const publicClient = usePublicClient()

  const getTotalScans = async (): Promise<number> => {
    if (!publicClient) return 0
    try {
      const result = await publicClient.readContract({
        address: AUDIT_LOGGER_ADDRESS,
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
        address: AUDIT_LOGGER_ADDRESS,
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
    AUDIT_LOGGER_ADDRESS,
  }
}
