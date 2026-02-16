import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, formatEther, getContract, Address } from 'viem'
import { REGISTRY_ABI, GUARDIAN_ABI, AUDIT_LOGGER_ABI, CONTRACT_ADDRESSES } from '../utils/wagmi'

const REGISTRY_ADDRESS = CONTRACT_ADDRESSES.hardhat.registry as Address
const GUARDIAN_ADDRESS = CONTRACT_ADDRESSES.hardhat.guardian as Address
const AUDIT_LOGGER_ADDRESS = CONTRACT_ADDRESSES.hardhat.auditLogger as Address

export function useRegistry() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)

  const getContractInstance = useCallback(() => {
    if (!publicClient) return null
    return getContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      client: publicClient,
    })
  }, [publicClient])

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

  const isRegistered = async (contractAddr: string): Promise<boolean> => {
    const contract = getContractInstance()
    if (!contract) return false
    return contract.read.isRegistered([contractAddr as Address]) as Promise<boolean>
  }

  const getRegistration = async (contractAddr: string) => {
    const contract = getContractInstance()
    if (!contract) return null
    const result = await contract.read.registrations([contractAddr as Address]) as any
    return {
      isActive: result[0],
      stakedAmount: formatEther(result[1]),
      registeredAt: Number(result[2]),
      owner: result[3],
      metadata: result[4],
    }
  }

  const getProtectedContracts = async (offset: number = 0, limit: number = 10) => {
    const contract = getContractInstance()
    if (!contract) return []
    return contract.read.getProtectedContracts([BigInt(offset), BigInt(limit)]) as Promise<Address[]>
  }

  const getProtectedCount = async (): Promise<number> => {
    const contract = getContractInstance()
    if (!contract) return 0
    const count = await contract.read.getProtectedCount() as bigint
    return Number(count)
  }

  return {
    register,
    deregister,
    isRegistered,
    getRegistration,
    getProtectedContracts,
    getProtectedCount,
    isLoading,
    REGISTRY_ADDRESS,
  }
}

export function useGuardian() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const getContractInstance = useCallback(() => {
    if (!publicClient) return null
    return getContract({
      address: GUARDIAN_ADDRESS,
      abi: GUARDIAN_ABI,
      client: publicClient,
    })
  }, [publicClient])

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

  const isPaused = async (target: string): Promise<boolean> => {
    const contract = getContractInstance()
    if (!contract) return false
    return contract.read.isPaused([target as Address]) as Promise<boolean>
  }

  const getActivePauses = async (): Promise<Address[]> => {
    const contract = getContractInstance()
    if (!contract) return []
    return contract.read.getActivePauses() as Promise<Address[]>
  }

  const getActivePauseCount = async (): Promise<number> => {
    const contract = getContractInstance()
    if (!contract) return 0
    const count = await contract.read.getActivePauseCount() as bigint
    return Number(count)
  }

  const getTotalPausesExecuted = async (): Promise<number> => {
    const contract = getContractInstance()
    if (!contract) return 0
    const count = await contract.read.totalPausesExecuted() as bigint
    return Number(count)
  }

  return {
    emergencyPause,
    liftPause,
    isPaused,
    getActivePauses,
    getActivePauseCount,
    getTotalPausesExecuted,
    GUARDIAN_ADDRESS,
  }
}

export function useAuditLogger() {
  const publicClient = usePublicClient()

  const getContractInstance = useCallback(() => {
    if (!publicClient) return null
    return getContract({
      address: AUDIT_LOGGER_ADDRESS,
      abi: AUDIT_LOGGER_ABI,
      client: publicClient,
    })
  }, [publicClient])

  const getTotalScans = async (): Promise<number> => {
    const contract = getContractInstance()
    if (!contract) return 0
    const count = await contract.read.totalScans() as bigint
    return Number(count)
  }

  const getScan = async (scanId: number) => {
    const contract = getContractInstance()
    if (!contract) return null
    return contract.read.getScan([BigInt(scanId)])
  }

  const getLatestScan = async (target: string) => {
    const contract = getContractInstance()
    if (!contract) return null
    return contract.read.getLatestScan([target as Address])
  }

  const getStats = async () => {
    const contract = getContractInstance()
    if (!contract) return null
    const stats = await contract.read.getStats() as [bigint, bigint, bigint, bigint, bigint]
    return {
      total: Number(stats[0]),
      criticalCount: Number(stats[1]),
      highCount: Number(stats[2]),
      mediumCount: Number(stats[3]),
      lowCount: Number(stats[4]),
    }
  }

  return {
    getTotalScans,
    getScan,
    getLatestScan,
    getStats,
    AUDIT_LOGGER_ADDRESS,
  }
}
