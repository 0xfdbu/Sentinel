import { useState, useCallback, useRef, useEffect } from 'react'
import { usePublicClient, useNetwork } from 'wagmi'
import { Address, formatEther } from 'viem'
import { toast } from 'react-hot-toast'
import { REGISTRY_ABI, GUARDIAN_ABI } from '../utils/wagmi'

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export interface SentinelEvent {
  id: string
  timestamp: number
  level: ThreatLevel
  type: 'EXPLOIT_ATTEMPT' | 'SUSPICIOUS_TX' | 'PAUSE_TRIGGERED' | 'SCAN_COMPLETE' | 'REGISTRATION'
  contractAddress: string
  txHash: string
  from: string
  details: string
  value?: string
  confidence: number
  action?: 'PAUSED' | 'ALERTED' | 'LOGGED'
}

export interface MonitoredContract {
  address: string
  name: string
  owner: string
  registeredAt: number
  isPaused: boolean
  totalEvents: number
  lastActivity: number
  riskScore?: number
}

// Production monitoring configuration
const MONITOR_CONFIG = {
  // Block range to analyze for patterns
  PATTERN_BLOCK_RANGE: 10,
  
  // Heuristic thresholds
  THRESHOLDS: {
    LARGE_TRANSFER_ETH: 100, // 100 ETH
    HIGH_GAS: 5000000, // 5M gas
    FLASH_LOAN_SIGS: ['0x6318967b', '0xefefaba7', '0xc42079f9', '0xab9c4b5d'],
    REENTRANCY_MAX_CALLS: 3, // Multiple calls to same contract in one tx
  },
  
  // CRE Webhook endpoint (for production)
  CRE_WEBHOOK_URL: '',
}

// Storage key for persistence
const MONITOR_STATE_KEY = 'sentinel-monitor-state'

interface PersistedState {
  isMonitoring: boolean
  lastActive: number
  chainId: number
}

export function useSentinelMonitor(registryAddress: Address, guardianAddress: Address) {
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  
  // Initialize state from localStorage
  const [isMonitoring, setIsMonitoring] = useState(() => {
    try {
      const saved = localStorage.getItem(MONITOR_STATE_KEY)
      if (saved) {
        const state: PersistedState = JSON.parse(saved)
        // Only restore if it was active recently (within last hour) and same chain
        const wasRecentlyActive = Date.now() - state.lastActive < 60 * 60 * 1000
        const sameChain = chain?.id === state.chainId
        return wasRecentlyActive && sameChain && state.isMonitoring
      }
    } catch {
      // ignore parse errors
    }
    return false
  })
  
  const [events, setEvents] = useState<SentinelEvent[]>([])
  const [monitoredContracts, setMonitoredContracts] = useState<MonitoredContract[]>([])
  const [stats, setStats] = useState({
    totalScans: 0,
    threatsDetected: 0,
    contractsPaused: 0,
    lastBlock: 0,
  })
  
  const wsRef = useRef<WebSocket | null>(null)
  const unwatchRef = useRef<(() => void) | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Persist monitoring state to localStorage
  useEffect(() => {
    const state: PersistedState = {
      isMonitoring,
      lastActive: Date.now(),
      chainId: chain?.id || 0
    }
    localStorage.setItem(MONITOR_STATE_KEY, JSON.stringify(state))
  }, [isMonitoring, chain?.id])

  // Load registered contracts from Registry
  const loadMonitoredContracts = useCallback(async () => {
    if (!publicClient || !registryAddress) return
    
    try {
      // Get count first
      const count = await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'getProtectedCount',
      })
      
      if (count === 0n) {
        setMonitoredContracts([])
        return
      }
      
      // Get all protected addresses
      const addresses = await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'getProtectedContracts',
        args: [0n, count],
      }) as Address[]
      
      // Get pause status for each (read directly from contract, not Guardian)
      const contracts: MonitoredContract[] = await Promise.all(
        addresses.map(async (addr) => {
          // Read paused() directly from the contract for accurate status
          const isPaused = await publicClient.readContract({
            address: addr,
            abi: [{ inputs: [], name: 'paused', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }],
            functionName: 'paused',
          }).catch(() => false)
          
          return {
            address: addr,
            name: 'Protected Contract',
            owner: '',
            registeredAt: Date.now(),
            isPaused: Boolean(isPaused),
            totalEvents: 0,
            lastActivity: Date.now(),
          }
        })
      )
      
      setMonitoredContracts(contracts)
    } catch (error) {
      console.error('Failed to load monitored contracts:', error)
    }
  }, [publicClient, registryAddress, guardianAddress])

  // Analyze transaction for threats
  const analyzeTransaction = useCallback(async (tx: any, receipt?: any): Promise<SentinelEvent | null> => {
    const threats: string[] = []
    let level: ThreatLevel = 'INFO'
    let confidence = 0.5
    
    const value = BigInt(tx.value || '0')
    const valueEth = Number(value) / 1e18
    
    // Check 1: Flash Loan Pattern
    const input = (tx.input || '').toLowerCase()
    const hasFlashLoan = MONITOR_CONFIG.THRESHOLDS.FLASH_LOAN_SIGS.some(
      sig => input.includes(sig.slice(2))
    )
    
    if (hasFlashLoan) {
      threats.push('Flash loan pattern detected')
      level = 'CRITICAL'
      confidence = 0.95
    }
    
    // Check 2: Large Transfer
    if (valueEth > MONITOR_CONFIG.THRESHOLDS.LARGE_TRANSFER_ETH) {
      threats.push(`Large transfer: ${valueEth.toFixed(2)} ETH`)
      level = level === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
      confidence = Math.max(confidence, 0.8)
    }
    
    // Check 3: High Gas Usage (complex exploit)
    const gasUsed = receipt?.gasUsed ? Number(receipt.gasUsed) : 0
    if (gasUsed > MONITOR_CONFIG.THRESHOLDS.HIGH_GAS) {
      threats.push(`High gas usage: ${gasUsed.toLocaleString()}`)
      level = level === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM'
      confidence = Math.max(confidence, 0.7)
    }
    
    // Check 4: Reentrancy (multiple internal calls to same address)
    if (receipt?.logs) {
      const internalCalls = receipt.logs.filter(
        (log: any) => log.address?.toLowerCase() === tx.to?.toLowerCase()
      ).length
      
      if (internalCalls > MONITOR_CONFIG.THRESHOLDS.REENTRANCY_MAX_CALLS) {
        threats.push(`Multiple internal calls (${internalCalls}): Possible reentrancy`)
        level = 'CRITICAL'
        confidence = 0.9
      }
    }
    
    // Check 5: Multiple transfers in single tx (drain pattern)
    if (receipt?.logs) {
      const transferEvents = receipt.logs.filter((log: any) => 
        log.topics?.[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event
      )
      
      if (transferEvents.length > 5) {
        threats.push(`Multiple transfers (${transferEvents.length}): Possible drain`)
        level = level === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
        confidence = Math.max(confidence, 0.85)
      }
    }
    
    // If no threats, don't create event
    if (threats.length === 0) return null
    
    // Determine action based on level
    let action: SentinelEvent['action'] = 'LOGGED'
    if (level === 'CRITICAL') action = 'PAUSED'
    else if (level === 'HIGH') action = 'ALERTED'
    
    return {
      id: `${tx.hash}-${Date.now()}`,
      timestamp: Date.now(),
      level,
      type: level === 'CRITICAL' ? 'EXPLOIT_ATTEMPT' : 'SUSPICIOUS_TX',
      contractAddress: tx.to || '',
      txHash: tx.hash,
      from: tx.from,
      details: threats.join('; '),
      value: valueEth > 0 ? `${valueEth.toFixed(4)} ETH` : undefined,
      confidence,
      action,
    }
  }, [])

  // Rate limiting for pollBlocks
  const lastPollRef = useRef<number>(0)

  // BLOCK POLLING DISABLED - Using WebSocket events from Sentinel Node instead
  // This prevents excessive RPC calls to Tenderly
  const pollBlocks = useCallback(async () => {
    // No-op - block polling disabled to prevent RPC rate limits
    // Monitor now relies on WebSocket events from Sentinel Node only
  }, [])

  // Trigger CRE workflow for emergency response
  const triggerCREWorkflow = async (event: SentinelEvent) => {
    try {
      const response = await fetch(MONITOR_CONFIG.CRE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: event.contractAddress,
          threatLevel: event.level,
          confidence: event.confidence,
          txHash: event.txHash,
          details: event.details,
          timestamp: event.timestamp,
          chainId: chain?.id,
        }),
      })
      
      if (!response.ok) {
        console.error('CRE webhook failed:', await response.text())
      }
    } catch (error) {
      console.error('Failed to trigger CRE workflow:', error)
    }
  }

  // Listen for on-chain events
  const setupEventListeners = useCallback(() => {
    if (!publicClient || !registryAddress || !guardianAddress) return () => {}
    
    // Watch for registrations
    const unwatchRegistered = publicClient.watchContractEvent({
      address: registryAddress,
      abi: REGISTRY_ABI,
      eventName: 'ContractRegistered',
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          const event: SentinelEvent = {
            id: `reg-${log.transactionHash}`,
            timestamp: Date.now(),
            level: 'INFO',
            type: 'REGISTRATION',
            contractAddress: log.args?.contractAddr || '',
            txHash: log.transactionHash,
            from: log.args?.owner || '',
            details: `Contract registered with ${formatEther(log.args?.stake || 0n)} ETH stake`,
            confidence: 1,
          }
          setEvents(prev => [event, ...prev].slice(0, 100))
          loadMonitoredContracts() // Refresh list
        })
      },
    })
    
    // Watch for pauses
    const unwatchPaused = publicClient.watchContractEvent({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      eventName: 'EmergencyPauseTriggered',
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          const event: SentinelEvent = {
            id: `pause-${log.transactionHash}`,
            timestamp: Date.now(),
            level: 'CRITICAL',
            type: 'PAUSE_TRIGGERED',
            contractAddress: log.args?.target || '',
            txHash: log.transactionHash,
            from: log.args?.sentinel || '',
            details: 'Emergency pause executed via CRE',
            confidence: 1,
            action: 'PAUSED',
          }
          setEvents(prev => [event, ...prev].slice(0, 100))
          loadMonitoredContracts() // Refresh pause status
        })
      },
    })
    
    return () => {
      unwatchRegistered()
      unwatchPaused()
    }
  }, [publicClient, registryAddress, guardianAddress, loadMonitoredContracts])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return
    
    setIsMonitoring(true)
    
    // Load initial contracts
    loadMonitoredContracts()
    
    // Setup event listeners
    const cleanup = setupEventListeners()
    unwatchRef.current = cleanup
    
    // BLOCK POLLING DISABLED - Using WebSocket events only
    // pollingRef.current = setInterval(pollBlocks, 1000)
    
    return () => stopMonitoring()
  }, [isMonitoring, loadMonitoredContracts, setupEventListeners, pollBlocks])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    
    if (unwatchRef.current) {
      unwatchRef.current()
      unwatchRef.current = null
    }
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  // Auto-restart monitoring on mount if it was previously active
  useEffect(() => {
    if (isMonitoring && publicClient) {
      // Small delay to ensure component is fully mounted
      const timeout = setTimeout(() => {
        console.log('🔄 Auto-restarting Sentinel Monitor...')
        
        // Load contracts
        loadMonitoredContracts()
        
        // Setup event listeners
        const cleanup = setupEventListeners()
        unwatchRef.current = cleanup
        
        // BLOCK POLLING DISABLED - Using WebSocket events only
        // pollingRef.current = setInterval(pollBlocks, 5000)
      }, 500)
      
      return () => clearTimeout(timeout)
    }
  }, [isMonitoring, publicClient, loadMonitoredContracts, setupEventListeners, pollBlocks])

  // Initial load of contracts on mount (regardless of monitoring state)
  useEffect(() => {
    if (publicClient && registryAddress) {
      console.log('📋 Loading monitored contracts...')
      loadMonitoredContracts()
    }
  }, [publicClient, registryAddress, loadMonitoredContracts])

  // Note: Auto-start disabled to prevent conflict with WebSocket reconnection
  // User should manually start monitoring from the Monitor page

  // Always watch for pause events (even when not monitoring)
  useEffect(() => {
    if (!publicClient || !guardianAddress) return
    
    console.log('👂 Watching for pause events...')
    
    const unwatch = publicClient.watchContractEvent({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      eventName: 'EmergencyPauseTriggered',
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          console.log('🔒 Pause event detected:', log.args?.target)
          toast.success(`Contract paused: ${log.args?.target?.slice(0, 10)}...`)
          loadMonitoredContracts() // Refresh pause status
        })
      },
    })
    
    return () => {
      unwatch()
    }
  }, [publicClient, guardianAddress, loadMonitoredContracts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't fully stop on unmount, just cleanup refs
      if (unwatchRef.current) {
        unwatchRef.current()
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return {
    isMonitoring,
    events,
    monitoredContracts,
    stats,
    startMonitoring,
    stopMonitoring,
    loadMonitoredContracts,
    analyzeTransaction,
  }
}

export default useSentinelMonitor
