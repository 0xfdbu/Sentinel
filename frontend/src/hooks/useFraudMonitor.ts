/**
 * useFraudMonitor Hook
 * 
 * Enhanced monitoring with fraud scoring and automatic pause
 * Integrates with Sentinel Node for real-time threat detection
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePublicClient, useNetwork, useWalletClient } from 'wagmi'
import { Address, formatEther, keccak256, toHex } from 'viem'
import { toast } from 'react-hot-toast'
import { useConfidentialPause } from './useConfidentialPause'

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'NONE'

export interface FraudFactor {
  type: string
  weight: number
  description: string
  evidence: any
}

export interface FraudAnalysis {
  score: number
  level: ThreatLevel
  factors: FraudFactor[]
  recommendedAction: 'MONITOR' | 'ALERT' | 'PAUSE'
  confidence: number
  timestamp: number
}

export interface ThreatEvent {
  id: string
  timestamp: number
  level: ThreatLevel
  contractAddress: string
  txHash: string
  from: string
  fraudAnalysis: FraudAnalysis
  actionTaken: 'NONE' | 'ALERT' | 'PAUSE_TRIGGERED'
  confidence: number
}

// Flash loan signatures
const FLASH_LOAN_SIGS = [
  '0x6318967b', '0xefefaba7', '0xc42079f9', '0xab9c4b5d', '0x6b07c94f'
]

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Fraud detection weights
const FRAUD_WEIGHTS = {
  VERY_LARGE_TRANSFER: 50,      // > 500 ETH
  LARGE_TRANSFER: 25,           // > 50 ETH
  VERY_HIGH_GAS: 25,            // > 5M gas
  HIGH_GAS: 10,                 // > 1M gas
  FLASH_LOAN: 40,
  MASS_TRANSFER: 50,            // > 10 transfers
  MULTIPLE_TRANSFERS: 20,       // > 3 transfers
  REENTRANCY_PATTERN: 30,       // Multiple calls to same contract
  KNOWN_ATTACKER: 100,
  RAPID_TRANSACTIONS: 15,
}

const THRESHOLDS = {
  AUTO_PAUSE: 85,
  CRITICAL: 90,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 30,
}

interface UseFraudMonitorOptions {
  guardianAddress: Address
  registryAddress: Address
  wsUrl?: string
  apiUrl?: string
  autoPause?: boolean
}

export function useFraudMonitor(options: UseFraudMonitorOptions) {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { executeConfidentialPause } = useConfidentialPause()
  
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [threats, setThreats] = useState<ThreatEvent[]>([])
  const [lastAnalysis, setLastAnalysis] = useState<FraudAnalysis | null>(null)
  const [stats, setStats] = useState({
    totalScans: 0,
    threatsDetected: 0,
    autoPauses: 0,
    lastBlock: 0,
  })
  
  const wsRef = useRef<WebSocket | null>(null)
  const unwatchRef = useRef<(() => void) | null>(null)
  const knownAttackers = useRef<Set<string>>(new Set())

  /**
   * Calculate fraud score for a transaction
   */
  const analyzeTransaction = useCallback((tx: any, receipt: any, contractAddress: string): FraudAnalysis => {
    const factors: FraudFactor[] = []
    let score = 0

    // 1. Value analysis
    const valueEth = Number(formatEther(tx.value || 0n))
    if (valueEth > 500) {
      factors.push({
        type: 'VERY_LARGE_TRANSFER',
        weight: FRAUD_WEIGHTS.VERY_LARGE_TRANSFER,
        description: `Transfer of ${valueEth.toFixed(2)} ETH`,
        evidence: { value: valueEth }
      })
      score += FRAUD_WEIGHTS.VERY_LARGE_TRANSFER
    } else if (valueEth > 50) {
      factors.push({
        type: 'LARGE_TRANSFER',
        weight: FRAUD_WEIGHTS.LARGE_TRANSFER,
        description: `Transfer of ${valueEth.toFixed(2)} ETH`,
        evidence: { value: valueEth }
      })
      score += FRAUD_WEIGHTS.LARGE_TRANSFER
    }

    // 2. Gas analysis
    const gasUsed = Number(receipt?.gasUsed || 0)
    if (gasUsed > 5_000_000) {
      factors.push({
        type: 'VERY_HIGH_GAS',
        weight: FRAUD_WEIGHTS.VERY_HIGH_GAS,
        description: `Very high gas: ${gasUsed.toLocaleString()}`,
        evidence: { gasUsed }
      })
      score += FRAUD_WEIGHTS.VERY_HIGH_GAS
    } else if (gasUsed > 1_000_000) {
      factors.push({
        type: 'HIGH_GAS',
        weight: FRAUD_WEIGHTS.HIGH_GAS,
        description: `High gas: ${gasUsed.toLocaleString()}`,
        evidence: { gasUsed }
      })
      score += FRAUD_WEIGHTS.HIGH_GAS
    }

    // 3. Flash loan detection
    const input = (tx.input || '').toLowerCase()
    if (FLASH_LOAN_SIGS.some(sig => input.includes(sig.slice(2)))) {
      factors.push({
        type: 'FLASH_LOAN',
        weight: FRAUD_WEIGHTS.FLASH_LOAN,
        description: 'Flash loan detected',
        evidence: { signature: tx.input.slice(0, 10) }
      })
      score += FRAUD_WEIGHTS.FLASH_LOAN
    }

    // 4. Transfer patterns
    if (receipt?.logs) {
      const transfers = receipt.logs.filter((log: any) => 
        log.topics[0]?.toLowerCase() === TRANSFER_TOPIC
      )
      
      if (transfers.length > 10) {
        factors.push({
          type: 'MASS_TRANSFER',
          weight: FRAUD_WEIGHTS.MASS_TRANSFER,
          description: `Mass transfer: ${transfers.length} transfers`,
          evidence: { count: transfers.length }
        })
        score += FRAUD_WEIGHTS.MASS_TRANSFER
      } else if (transfers.length > 3) {
        factors.push({
          type: 'MULTIPLE_TRANSFERS',
          weight: FRAUD_WEIGHTS.MULTIPLE_TRANSFERS,
          description: `Multiple transfers: ${transfers.length}`,
          evidence: { count: transfers.length }
        })
        score += FRAUD_WEIGHTS.MULTIPLE_TRANSFERS
      }

      // Reentrancy indicator
      const internalCalls = receipt.logs.filter(
        (log: any) => log.address?.toLowerCase() === contractAddress.toLowerCase()
      ).length
      
      if (internalCalls > 3) {
        factors.push({
          type: 'REENTRANCY_PATTERN',
          weight: FRAUD_WEIGHTS.REENTRANCY_PATTERN,
          description: `Multiple internal calls: ${internalCalls}`,
          evidence: { internalCalls }
        })
        score += FRAUD_WEIGHTS.REENTRANCY_PATTERN
      }
    }

    // 5. Known attacker check
    if (knownAttackers.current.has(tx.from.toLowerCase())) {
      factors.push({
        type: 'KNOWN_ATTACKER',
        weight: FRAUD_WEIGHTS.KNOWN_ATTACKER,
        description: 'Known attacker address',
        evidence: { from: tx.from }
      })
      score += FRAUD_WEIGHTS.KNOWN_ATTACKER
    }

    // Calculate level and action
    const confidence = Math.min(0.5 + (factors.length * 0.15), 0.99)
    let level: ThreatLevel = 'NONE'
    let action: 'MONITOR' | 'ALERT' | 'PAUSE' = 'MONITOR'

    if (score >= THRESHOLDS.CRITICAL) {
      level = 'CRITICAL'
      action = 'PAUSE'
    } else if (score >= THRESHOLDS.AUTO_PAUSE) {
      level = 'HIGH'
      action = 'PAUSE'
    } else if (score >= THRESHOLDS.HIGH) {
      level = 'HIGH'
      action = 'ALERT'
    } else if (score >= THRESHOLDS.MEDIUM) {
      level = 'MEDIUM'
      action = 'ALERT'
    } else if (score >= THRESHOLDS.LOW) {
      level = 'LOW'
      action = 'MONITOR'
    }

    return {
      score: Math.min(score, 100),
      level,
      factors,
      recommendedAction: action,
      confidence,
      timestamp: Date.now(),
    }
  }, [])

  /**
   * Execute automatic pause via confidential transaction (TEE)
   */
  const executeAutoPause = useCallback(async (contractAddress: string, threat: ThreatEvent): Promise<boolean> => {
    if (!options.autoPause) return false

    try {
      toast.loading(`🛡️ Executing confidential pause for ${contractAddress.slice(0, 10)}...`, { id: 'auto-pause' })
      
      // Use confidential pause via TEE (hides pause reason & admin identity)
      const result = await executeConfidentialPause(
        contractAddress,
        `Fraud detected: ${threat.fraudAnalysis.factors.map(f => f.type).join(', ')}`
      )

      if (!result || !result.success) {
        throw new Error(result?.error || 'Confidential pause failed')
      }

      toast.success(
        `🔒 Confidential pause executed! TX: ${result.txHash?.slice(0, 20)}...`,
        { id: 'auto-pause' }
      )
      
      setStats(prev => ({ ...prev, autoPauses: prev.autoPauses + 1 }))
      
      // Add to known attackers
      knownAttackers.current.add(threat.from.toLowerCase())
      
      return true
    } catch (error: any) {
      toast.error(`Auto-pause failed: ${error.message}`, { id: 'auto-pause' })
      return false
    }
  }, [executeConfidentialPause, options.autoPause])

  /**
   * Process transaction and detect threats
   */
  const processTransaction = useCallback(async (tx: any, contractAddress: string) => {
    if (!publicClient) return

    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash })
      const analysis = analyzeTransaction(tx, receipt, contractAddress)
      
      setLastAnalysis(analysis)
      setStats(prev => ({ ...prev, totalScans: prev.totalScans + 1 }))

      // Skip if no threat
      if (analysis.score < THRESHOLDS.LOW) return

      // Create threat event
      const threat: ThreatEvent = {
        id: `${tx.hash}-${Date.now()}`,
        timestamp: Date.now(),
        level: analysis.level,
        contractAddress,
        txHash: tx.hash,
        from: tx.from,
        fraudAnalysis: analysis,
        actionTaken: 'NONE',
        confidence: analysis.confidence,
      }

      setStats(prev => ({ ...prev, threatsDetected: prev.threatsDetected + 1 }))

      // Handle based on risk level
      if (analysis.recommendedAction === 'PAUSE') {
        const paused = await executeAutoPause(contractAddress, threat)
        threat.actionTaken = paused ? 'PAUSE_TRIGGERED' : 'ALERT'
        
        if (paused) {
          toast.error(
            `🚨 CRITICAL: Contract ${contractAddress.slice(0, 10)}... auto-paused!\n` +
            `Score: ${analysis.score}/100`,
            { duration: 10000 }
          )
        }
      } else if (analysis.recommendedAction === 'ALERT') {
        threat.actionTaken = 'ALERT'
        toast.error(
          `⚠️ ${analysis.level} threat detected!\n` +
          `${analysis.factors.map(f => f.type).join(', ')}`,
          { duration: 5000 }
        )
      }

      setThreats(prev => [threat, ...prev].slice(0, 100))

      // Send to WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'THREAT_DETECTED',
          threat,
          timestamp: Date.now(),
        }))
      }
    } catch (error) {
      console.error('Failed to process transaction:', error)
    }
  }, [publicClient, analyzeTransaction, executeAutoPause])

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return
    
    setIsMonitoring(true)
    toast.success('🔍 Fraud monitoring started')

    // Watch for blocks
    const unwatch = publicClient?.watchBlocks({
      onBlock: async (block) => {
        setStats(prev => ({ ...prev, lastBlock: Number(block.number) }))
        
        // Process transactions to monitored contracts
        for (const tx of block.transactions) {
          // Check if tx is to a registered contract
          // This would filter by registry
          // For now, placeholder
        }
      }
    })

    unwatchRef.current = unwatch || null

    // Connect to Sentinel Node WebSocket if configured
    if (options.wsUrl) {
      const ws = new WebSocket(options.wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        console.log('Connected to Sentinel Node')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'THREAT_DETECTED' && data.threat) {
            setThreats(prev => [data.threat, ...prev].slice(0, 100))
          }
        } catch (e) {
          console.error('WS message error:', e)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
      }
    }
  }, [isMonitoring, publicClient, options.wsUrl])

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    unwatchRef.current?.()
    wsRef.current?.close()
    toast.success('Monitoring stopped')
  }, [])

  /**
   * Add address to blacklist
   */
  const blacklistAddress = useCallback((address: string) => {
    knownAttackers.current.add(address.toLowerCase())
    toast.success(`Address ${address.slice(0, 10)}... blacklisted`)
  }, [])

  /**
   * Get threat summary
   */
  const getThreatSummary = useCallback(() => {
    const critical = threats.filter(t => t.level === 'CRITICAL').length
    const high = threats.filter(t => t.level === 'HIGH').length
    const medium = threats.filter(t => t.level === 'MEDIUM').length
    const paused = threats.filter(t => t.actionTaken === 'PAUSE_TRIGGERED').length

    return { critical, high, medium, paused, total: threats.length }
  }, [threats])

  // Cleanup
  useEffect(() => {
    return () => {
      unwatchRef.current?.()
      wsRef.current?.close()
    }
  }, [])

  return {
    isMonitoring,
    isConnected,
    threats,
    lastAnalysis,
    stats,
    startMonitoring,
    stopMonitoring,
    analyzeTransaction,
    processTransaction,
    blacklistAddress,
    getThreatSummary,
    thresholds: THRESHOLDS,
  }
}

export default useFraudMonitor
