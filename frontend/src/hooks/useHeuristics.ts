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

// Alchemy API configuration
// @ts-ignore
const ALCHEMY_KEY = import.meta.env?.VITE_ALCHEMY_KEY
const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`

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

  // Fetch recent transactions from Alchemy
  const fetchRecentTransactions = useCallback(async (blockRange: number = 5) => {
    if (!ALCHEMY_KEY) {
      console.warn('Alchemy key not set, using mock data')
      return generateMockTransactions()
    }

    try {
      const currentBlock = await publicClient?.getBlockNumber() || BigInt(0)
      const fromBlock = currentBlock - BigInt(blockRange)

      const response = await fetch(ALCHEMY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: 'latest',
            category: ['external', 'erc20', 'internal'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0x32'
          }]
        })
      })

      const data = await response.json()
      return data.result?.transfers || []
    } catch (e) {
      console.error('Failed to fetch transactions:', e)
      return generateMockTransactions()
    }
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
          timestamp: tx.metadata?.blockTimestamp || Date.now(),
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
  // Check for flash loan signatures in input data or events
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

// Generate mock transactions for demo without API key
function generateMockTransactions(): any[] {
  return [
    {
      hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      from: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      to: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      value: (BigInt(Math.floor(Math.random() * 1000000)) * BigInt(1e18)).toString(),
      gasUsed: 100000 + Math.floor(Math.random() * 500000),
      metadata: { blockTimestamp: Date.now() / 1000 }
    },
    {
      hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      from: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      to: '0xNovelFlashLoanVulnerableDEX',
      value: (BigInt(5000000) * BigInt(1e18)).toString(), // Large value for demo
      gasUsed: 2500000, // High gas
      metadata: { blockTimestamp: Date.now() / 1000 }
    }
  ]
}

export default useHeuristics
