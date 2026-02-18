/**
 * Reserve Health Monitoring Hooks
 * 
 * Provides real-time reserve health data for DeFi protocols
 * - TVL tracking
 * - Collateral ratio monitoring
 * - Health scores
 * - Depeg alerts
 */

import { useState, useCallback, useEffect } from 'react'
import { usePublicClient, useWalletClient, useNetwork } from 'wagmi'
import { Address, formatEther } from 'viem'
import { getAddresses } from '../utils/wagmi'

// Health status enum matching contract
export enum HealthStatus { HEALTHY = 0, WARNING = 1, CRITICAL = 2, PAUSED = 3 }

// Risk level enum
export enum RiskLevel { CONSERVATIVE = 0, MODERATE = 1, AGGRESSIVE = 2, CUSTOM = 3 }

// Health metrics structure
export interface HealthMetrics {
  tvl: bigint
  tvlSnapshot: bigint
  snapshotBlock: bigint
  collateralRatio: bigint
  minCollateralRatio: bigint
  lastUpdateBlock: bigint
  lastUpdateTime: bigint
  isHealthy: boolean
  healthScore: number
}

// Asset configuration
export interface AssetConfig {
  asset: Address
  priceFeed: Address
  weight: bigint
  isStablecoin: boolean
  depegThreshold: bigint
}

// Risk thresholds
export interface RiskThresholds {
  maxTVLDropPercent: bigint
  maxCollateralRatioDrop: bigint
  minHealthScore: bigint
  volatilityThreshold: bigint
  autoPauseEnabled: boolean
}

// Monitoring configuration
export interface MonitoringConfig {
  isActive: boolean
  assets: AssetConfig[]
  thresholds: RiskThresholds
}

// Risk profile
export interface RiskProfile {
  level: RiskLevel
  maxDailyVolume: bigint
  maxSingleTxValue: bigint
  maxTxPerHour: bigint
  volatilityThreshold: bigint
  requireKYC: boolean
  requireWhitelist: boolean
  circuitBreakerThreshold: bigint
  timelockDelay: bigint
  isActive: boolean
}

// Contract health data
export interface ContractHealthData {
  address: Address
  name: string
  status: HealthStatus
  metrics: HealthMetrics
  config: MonitoringConfig
  riskProfile?: RiskProfile
  tvlChange24h: number
  alerts: HealthAlert[]
}

// Health alert
export interface HealthAlert {
  type: 'tvl_drop' | 'depeg' | 'collateral_ratio' | 'circuit_breaker' | 'compliance'
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  value?: string
}

// Simplified ABI for ReserveHealthMonitor
const RESERVE_HEALTH_ABI = [
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'healthMetrics',
    outputs: [
      { name: 'tvl', type: 'uint256' },
      { name: 'tvlSnapshot', type: 'uint256' },
      { name: 'snapshotBlock', type: 'uint256' },
      { name: 'collateralRatio', type: 'uint256' },
      { name: 'minCollateralRatio', type: 'uint256' },
      { name: 'lastUpdateBlock', type: 'uint256' },
      { name: 'lastUpdateTime', type: 'uint256' },
      { name: 'isHealthy', type: 'bool' },
      { name: 'healthScore', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'monitoringConfigs',
    outputs: [
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'getHealthStatus',
    outputs: [
      { name: 'status', type: 'uint8' },
      {
        name: 'metrics',
        type: 'tuple',
        components: [
          { name: 'tvl', type: 'uint256' },
          { name: 'tvlSnapshot', type: 'uint256' },
          { name: 'snapshotBlock', type: 'uint256' },
          { name: 'collateralRatio', type: 'uint256' },
          { name: 'minCollateralRatio', type: 'uint256' },
          { name: 'lastUpdateBlock', type: 'uint256' },
          { name: 'lastUpdateTime', type: 'uint256' },
          { name: 'isHealthy', type: 'bool' },
          { name: 'healthScore', type: 'uint8' },
        ],
      },
      {
        name: 'thresholds',
        type: 'tuple',
        components: [
          { name: 'maxTVLDropPercent', type: 'uint256' },
          { name: 'maxCollateralRatioDrop', type: 'uint256' },
          { name: 'minHealthScore', type: 'uint256' },
          { name: 'volatilityThreshold', type: 'uint256' },
          { name: 'autoPauseEnabled', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMonitoredContracts',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'newTVL', type: 'uint256' },
      { name: 'newCollateralRatio', type: 'uint256' },
    ],
    name: 'updateHealthMetrics',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'contractAddr', type: 'address' },
      {
        name: 'assets',
        type: 'tuple[]',
        components: [
          { name: 'asset', type: 'address' },
          { name: 'priceFeed', type: 'address' },
          { name: 'weight', type: 'uint256' },
          { name: 'isStablecoin', type: 'bool' },
          { name: 'depegThreshold', type: 'uint256' },
        ],
      },
      {
        name: 'thresholds',
        type: 'tuple',
        components: [
          { name: 'maxTVLDropPercent', type: 'uint256' },
          { name: 'maxCollateralRatioDrop', type: 'uint256' },
          { name: 'minHealthScore', type: 'uint256' },
          { name: 'volatilityThreshold', type: 'uint256' },
          { name: 'autoPauseEnabled', type: 'bool' },
        ],
      },
    ],
    name: 'addMonitoring',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'removeMonitoring',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'contractAddr', type: 'address' },
      { indexed: false, name: 'tvl', type: 'uint256' },
      { indexed: false, name: 'healthScore', type: 'uint8' },
      { indexed: false, name: 'status', type: 'uint8' },
    ],
    name: 'HealthMetricsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'contractAddr', type: 'address' },
      { indexed: false, name: 'oldTVL', type: 'uint256' },
      { indexed: false, name: 'newTVL', type: 'uint256' },
      { indexed: false, name: 'dropPercent', type: 'uint256' },
    ],
    name: 'TVLAlert',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'price', type: 'int256' },
      { indexed: false, name: 'deviation', type: 'uint256' },
    ],
    name: 'DepegAlert',
    type: 'event',
  },
] as const

// Simplified ABI for RiskProfileRegistry
const RISK_PROFILE_ABI = [
  {
    inputs: [{ name: 'contractAddr', type: 'address' }],
    name: 'riskProfiles',
    outputs: [
      { name: 'level', type: 'uint8' },
      { name: 'maxDailyVolume', type: 'uint256' },
      { name: 'maxSingleTxValue', type: 'uint256' },
      { name: 'maxTxPerHour', type: 'uint256' },
      { name: 'volatilityThreshold', type: 'uint256' },
      { name: 'requireKYC', type: 'bool' },
      { name: 'requireWhitelist', type: 'bool' },
      { name: 'circuitBreakerThreshold', type: 'uint256' },
      { name: 'timelockDelay', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'level', type: 'uint8' },
    ],
    name: 'setRiskProfilePreset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'user', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'validateTransaction',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'contractAddr', type: 'address' },
      { name: 'user', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'canTransact',
    outputs: [
      { name: 'passed', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Contract addresses - update after deployment
const RESERVE_HEALTH_ADDRESSES = {
  hardhat: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
  sepolia: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
}

const RISK_PROFILE_ADDRESSES = {
  hardhat: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
  sepolia: '0x0000000000000000000000000000000000000000' as Address, // Update after deploy
}

export function useReserveHealth() {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)

  const reserveHealthAddress = chain?.id === 11155111 
    ? RESERVE_HEALTH_ADDRESSES.sepolia 
    : RESERVE_HEALTH_ADDRESSES.hardhat

  const riskProfileAddress = chain?.id === 11155111 
    ? RISK_PROFILE_ADDRESSES.sepolia 
    : RISK_PROFILE_ADDRESSES.hardhat

  // Get health status for a contract
  const getHealthStatus = useCallback(async (contractAddr: Address): Promise<{
    status: HealthStatus
    metrics: HealthMetrics
    thresholds: RiskThresholds
  } | null> => {
    if (!publicClient || reserveHealthAddress === '0x0000000000000000000000000000000000000000') {
      return null
    }
    
    try {
      const result = await publicClient.readContract({
        address: reserveHealthAddress,
        abi: RESERVE_HEALTH_ABI,
        functionName: 'getHealthStatus',
        args: [contractAddr],
      })

      return {
        status: result[0] as HealthStatus,
        metrics: {
          tvl: result[1].tvl,
          tvlSnapshot: result[1].tvlSnapshot,
          snapshotBlock: result[1].snapshotBlock,
          collateralRatio: result[1].collateralRatio,
          minCollateralRatio: result[1].minCollateralRatio,
          lastUpdateBlock: result[1].lastUpdateBlock,
          lastUpdateTime: result[1].lastUpdateTime,
          isHealthy: result[1].isHealthy,
          healthScore: result[1].healthScore,
        },
        thresholds: {
          maxTVLDropPercent: result[2].maxTVLDropPercent,
          maxCollateralRatioDrop: result[2].maxCollateralRatioDrop,
          minHealthScore: result[2].minHealthScore,
          volatilityThreshold: result[2].volatilityThreshold,
          autoPauseEnabled: result[2].autoPauseEnabled,
        },
      }
    } catch (error) {
      console.error('Failed to get health status:', error)
      return null
    }
  }, [publicClient, reserveHealthAddress])

  // Get all monitored contracts
  const getMonitoredContracts = useCallback(async (): Promise<Address[]> => {
    if (!publicClient || reserveHealthAddress === '0x0000000000000000000000000000000000000000') {
      return []
    }
    
    try {
      const result = await publicClient.readContract({
        address: reserveHealthAddress,
        abi: RESERVE_HEALTH_ABI,
        functionName: 'getMonitoredContracts',
      })
      return result as Address[]
    } catch {
      return []
    }
  }, [publicClient, reserveHealthAddress])

  // Get risk profile for a contract
  const getRiskProfile = useCallback(async (contractAddr: Address): Promise<RiskProfile | null> => {
    if (!publicClient || riskProfileAddress === '0x0000000000000000000000000000000000000000') {
      return null
    }
    
    try {
      const result = await publicClient.readContract({
        address: riskProfileAddress,
        abi: RISK_PROFILE_ABI,
        functionName: 'riskProfiles',
        args: [contractAddr],
      })

      return {
        level: result[0] as RiskLevel,
        maxDailyVolume: result[1],
        maxSingleTxValue: result[2],
        maxTxPerHour: result[3],
        volatilityThreshold: result[4],
        requireKYC: result[5],
        requireWhitelist: result[6],
        circuitBreakerThreshold: result[7],
        timelockDelay: result[8],
        isActive: result[9],
      }
    } catch (error) {
      console.error('Failed to get risk profile:', error)
      return null
    }
  }, [publicClient, riskProfileAddress])

  // Add monitoring to a contract
  const addMonitoring = useCallback(async (
    contractAddr: Address,
    assets: AssetConfig[],
    thresholds: RiskThresholds
  ) => {
    if (!walletClient) throw new Error('Wallet not connected')
    
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: reserveHealthAddress,
        abi: RESERVE_HEALTH_ABI,
        functionName: 'addMonitoring',
        args: [contractAddr, assets, thresholds],
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, reserveHealthAddress])

  // Remove monitoring from a contract
  const removeMonitoring = useCallback(async (contractAddr: Address) => {
    if (!walletClient) throw new Error('Wallet not connected')
    
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: reserveHealthAddress,
        abi: RESERVE_HEALTH_ABI,
        functionName: 'removeMonitoring',
        args: [contractAddr],
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, reserveHealthAddress])

  // Set risk profile preset
  const setRiskProfilePreset = useCallback(async (
    contractAddr: Address,
    level: RiskLevel
  ) => {
    if (!walletClient) throw new Error('Wallet not connected')
    
    setIsLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: riskProfileAddress,
        abi: RISK_PROFILE_ABI,
        functionName: 'setRiskProfilePreset',
        args: [contractAddr, level],
      })
      return tx
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, riskProfileAddress])

  // Check if user can transact
  const canTransact = useCallback(async (
    contractAddr: Address,
    user: Address,
    value: bigint
  ): Promise<{ passed: boolean; reason: string }> => {
    if (!publicClient || riskProfileAddress === '0x0000000000000000000000000000000000000000') {
      return { passed: true, reason: '' }
    }
    
    try {
      const result = await publicClient.readContract({
        address: riskProfileAddress,
        abi: RISK_PROFILE_ABI,
        functionName: 'canTransact',
        args: [contractAddr, user, value],
      })

      return {
        passed: result[0],
        reason: result[1],
      }
    } catch {
      return { passed: true, reason: '' }
    }
  }, [publicClient, riskProfileAddress])

  // Get comprehensive health data for all monitored contracts
  const getAllHealthData = useCallback(async (): Promise<ContractHealthData[]> => {
    const monitored = await getMonitoredContracts()
    
    const data = await Promise.all(
      monitored.map(async (addr) => {
        const health = await getHealthStatus(addr)
        const riskProfile = await getRiskProfile(addr)
        
        // Calculate TVL change
        let tvlChange24h = 0
        if (health?.metrics.tvlSnapshot && health.metrics.tvlSnapshot > 0n) {
          const snapshot = Number(formatEther(health.metrics.tvlSnapshot))
          const current = Number(formatEther(health.metrics.tvl))
          tvlChange24h = ((current - snapshot) / snapshot) * 100
        }

        // Generate alerts based on status
        const alerts: HealthAlert[] = []
        if (health?.status === HealthStatus.CRITICAL) {
          alerts.push({
            type: 'tvl_drop',
            severity: 'critical',
            message: 'Critical TVL drop detected',
            timestamp: Date.now(),
            value: `${tvlChange24h.toFixed(2)}%`,
          })
        } else if (health?.status === HealthStatus.WARNING) {
          alerts.push({
            type: 'tvl_drop',
            severity: 'warning',
            message: 'TVL below healthy threshold',
            timestamp: Date.now(),
            value: `Health score: ${health.metrics.healthScore}/100`,
          })
        }

        return {
          address: addr,
          name: `Contract ${addr.slice(0, 6)}...${addr.slice(-4)}`,
          status: health?.status ?? HealthStatus.HEALTHY,
          metrics: health?.metrics ?? {
            tvl: 0n,
            tvlSnapshot: 0n,
            snapshotBlock: 0n,
            collateralRatio: 0n,
            minCollateralRatio: 0n,
            lastUpdateBlock: 0n,
            lastUpdateTime: 0n,
            isHealthy: true,
            healthScore: 100,
          },
          config: {
            isActive: true,
            assets: [],
            thresholds: health?.thresholds ?? {
              maxTVLDropPercent: 1000n,
              maxCollateralRatioDrop: 500n,
              minHealthScore: 70n,
              volatilityThreshold: 500n,
              autoPauseEnabled: false,
            },
          },
          riskProfile,
          tvlChange24h,
          alerts,
        }
      })
    )

    return data
  }, [getMonitoredContracts, getHealthStatus, getRiskProfile])

  return {
    getHealthStatus,
    getMonitoredContracts,
    getRiskProfile,
    addMonitoring,
    removeMonitoring,
    setRiskProfilePreset,
    canTransact,
    getAllHealthData,
    isLoading,
    RESERVE_HEALTH_ADDRESS: reserveHealthAddress,
    RISK_PROFILE_ADDRESS: riskProfileAddress,
  }
}

// Hook for polling health data
export function useHealthPolling(intervalMs: number = 30000) {
  const [healthData, setHealthData] = useState<ContractHealthData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getAllHealthData } = useReserveHealth()

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const data = await getAllHealthData()
        if (isMounted) {
          setHealthData(data)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to fetch health data:', error)
        if (isMounted) setIsLoading(false)
      }
    }

    // Initial fetch
    fetchData()

    // Set up polling
    const interval = setInterval(fetchData, intervalMs)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [getAllHealthData, intervalMs])

  return { healthData, isLoading, refetch: () => getAllHealthData() }
}

// Hook for TVL history simulation (until we have historical data)
export function useTVLHistory(contractAddr?: Address) {
  const [history, setHistory] = useState<{ timestamp: number; tvl: number }[]>([])

  useEffect(() => {
    if (!contractAddr) return

    // Generate simulated history for demo
    const now = Date.now()
    const data = []
    let baseTVL = 100 + Math.random() * 900 // 100-1000 ETH

    for (let i = 30; i >= 0; i--) {
      const timestamp = now - i * 24 * 60 * 60 * 1000
      // Add some randomness and trends
      const change = (Math.random() - 0.48) * 0.1 // Slight upward bias
      baseTVL = baseTVL * (1 + change)
      
      data.push({
        timestamp,
        tvl: baseTVL,
      })
    }

    setHistory(data)
  }, [contractAddr])

  return history
}

// Helper to format health status
export function getHealthStatusLabel(status: HealthStatus): string {
  switch (status) {
    case HealthStatus.HEALTHY: return 'Healthy'
    case HealthStatus.WARNING: return 'Warning'
    case HealthStatus.CRITICAL: return 'Critical'
    case HealthStatus.PAUSED: return 'Paused'
    default: return 'Unknown'
  }
}

export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case HealthStatus.HEALTHY: return 'text-emerald-400'
    case HealthStatus.WARNING: return 'text-amber-400'
    case HealthStatus.CRITICAL: return 'text-red-400'
    case HealthStatus.PAUSED: return 'text-neutral-400'
    default: return 'text-neutral-400'
  }
}

export function getHealthStatusBg(status: HealthStatus): string {
  switch (status) {
    case HealthStatus.HEALTHY: return 'bg-emerald-500/10 border-emerald-500/30'
    case HealthStatus.WARNING: return 'bg-amber-500/10 border-amber-500/30'
    case HealthStatus.CRITICAL: return 'bg-red-500/10 border-red-500/30'
    case HealthStatus.PAUSED: return 'bg-neutral-500/10 border-neutral-500/30'
    default: return 'bg-neutral-500/10 border-neutral-500/30'
  }
}

// Helper to format risk level
export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case RiskLevel.CONSERVATIVE: return 'Conservative'
    case RiskLevel.MODERATE: return 'Moderate'
    case RiskLevel.AGGRESSIVE: return 'Aggressive'
    case RiskLevel.CUSTOM: return 'Custom'
    default: return 'Unknown'
  }
}
