import { useState, useCallback, useEffect, useRef } from 'react'
import { usePublicClient } from 'wagmi'

export interface HeuristicThreat {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  pattern: string
  confidence: number
  victim: string
  attacker: string
  txHash: string
  timestamp: number
  estimatedLoss?: string
  details: string
}

export interface TransactionFeed {
  hash: string
  from: string
  to: string
  value: string
  gasUsed: number
  timestamp: number
  threats: HeuristicThreat[]
}

export function useHeuristics() {
  const publicClient = usePublicClient()
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [threats, setThreats] = useState<HeuristicThreat[]>([])
  const [recentTxs, setRecentTxs] = useState<TransactionFeed[]>([])
  const [stats, setStats] = useState({
    totalThreats: 0,
    criticalCount: 0,
    lastScan: null as Date | null,
    avgGasUsed: 0
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // BLOCK FETCHING DISABLED - Returns empty to prevent RPC rate limits
  // Frontend now relies on WebSocket events from Sentinel Node
  const fetchRecentTransactions = useCallback(async (_blockRange: number = 5) => {
    return []
  }, [publicClient])

  // Analyze transaction for threats
  const analyzeTransaction = useCallback(async (tx: any): Promise<HeuristicThreat[]> => {
    const threats: HeuristicThreat[] = []
    
    // Heuristic 1: Flash Loan Pattern
    if (isFlashLoanPattern(tx)) {
      threats.push({
        level: 'CRITICAL',
        pattern: 'FLASH_LOAN_DRAIN',
        confidence: 0.95,
        victim: tx.to,
        attacker: tx.from,
        txHash: tx.hash,
        timestamp: Date.now(),
        estimatedLoss: tx.value,
        details: 'Flash loan with multiple transfers detected'
      })
    }
    
    // Heuristic 2: Large Transfer
    const value = BigInt(tx.value || '0')
    if (value > BigInt('1000000000000000000000000')) { // > $1M
      threats.push({
        level: 'HIGH',
        pattern: 'LARGE_TRANSFER',
        confidence: 0.75,
        victim: tx.to,
        attacker: tx.from,
        txHash: tx.hash,
        timestamp: Date.now(),
        estimatedLoss: tx.value,
        details: `Large transfer: ${formatValue(value)}`
      })
    }
    
    // Heuristic 3: Gas Anomaly
    if (tx.gasUsed > 5000000) {
      threats.push({
        level: 'MEDIUM',
        pattern: 'GAS_ANOMALY',
        confidence: 0.70,
        victim: tx.to,
        attacker: tx.from,
        txHash: tx.hash,
        timestamp: Date.now(),
        details: `High gas usage: ${tx.gasUsed}`
      })
    }
    
    return threats
  }, [])

  // Run heuristic scan
  const runHeuristicScan = useCallback(async () => {
    setIsMonitoring(true)
    
    try {
      const transfers = await fetchRecentTransactions()
      const analyzedTxs: TransactionFeed[] = []
      const allThreats: HeuristicThreat[] = []
      
      for (const tx of transfers.slice(0, 10)) {
        const txThreats = await analyzeTransaction(tx)
        
        analyzedTxs.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gasUsed: tx.gasUsed || 100000,
          timestamp: tx.timestamp || Date.now(),
          threats: txThreats
        })
        
        allThreats.push(...txThreats)
      }
      
      // Update state
      setRecentTxs(analyzedTxs)
      
      // Only add CRITICAL threats to the main list
      const criticalThreats = allThreats.filter(t => t.level === 'CRITICAL')
      if (criticalThreats.length > 0) {
        setThreats(prev => [...criticalThreats, ...prev].slice(0, 50))
      }
      
      // Update stats
      const totalGas = analyzedTxs.reduce((sum, tx) => sum + tx.gasUsed, 0)
      setStats({
        totalThreats: allThreats.length,
        criticalCount: criticalThreats.length,
        lastScan: new Date(),
        avgGasUsed: Math.round(totalGas / analyzedTxs.length) || 0
      })
      
      return criticalThreats
    } catch (e) {
      console.error('Heuristic scan failed:', e)
      return []
    } finally {
      setIsMonitoring(false)
    }
  }, [fetchRecentTransactions, analyzeTransaction])

  // Start continuous monitoring
  const startMonitoring = useCallback((intervalMs: number = 30000) => {
    // Run immediately
    runHeuristicScan()
    
    // Then schedule
    intervalRef.current = setInterval(runHeuristicScan, intervalMs)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [runHeuristicScan])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopMonitoring()
  }, [stopMonitoring])

  return {
    runHeuristicScan,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    threats,
    recentTxs,
    stats
  }
}

// Helper functions
function isFlashLoanPattern(tx: any): boolean {
  // Check for flash loan signatures in input data
  const flashLoanSigs = ['0x6318967b', '0xefefaba7', '0xc42079f9']
  const input = tx.input?.toLowerCase() || ''
  
  return flashLoanSigs.some(sig => input.includes(sig.slice(2)))
}

function formatValue(value: bigint): string {
  const eth = Number(value) / 1e18
  if (eth > 1e6) return `${(eth / 1e6).toFixed(2)}M ETH`
  if (eth > 1e3) return `${(eth / 1e3).toFixed(2)}K ETH`
  return `${eth.toFixed(4)} ETH`
}

export default useHeuristics
