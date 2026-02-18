/**
 * CRE Scanner Hook
 * 
 * This hook sends scan requests to the Sentinel CRE API backend,
 * which then triggers the Chainlink CRE workflow.
 * 
 * IMPORTANT: This does NOT call xAI/Grok directly from the browser.
 * All API keys are kept server-side in the CRE workflow.
 */

import { useState, useCallback } from 'react'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE'

export interface ScanResult {
  severity: Severity
  category: string
  vector: string
  lines: number[]
  confidence: number
  recommendation: string
}

export interface ScanStatus {
  step: 'idle' | 'submitting' | 'fetching' | 'analyzing' | 'evaluating' | 'executing' | 'complete' | 'error'
  message: string
  timestamp?: string
}

export interface CWorkflowResult {
  success: boolean
  scanResult: ScanResult
  action: 'PAUSE' | 'ALERT' | 'WARN' | 'LOG'
  vulnerabilityHash: string
  isRegistered: boolean
  paused: boolean
  auditLogged: boolean
  executionTime: number
}

// CRE API endpoint
const CRE_API_URL = import.meta.env?.VITE_CRE_API_URL || 'http://localhost:3001'

export function useScannerCRE() {
  const [isScanning, setIsScanning] = useState(false)
  const [status, setStatus] = useState<ScanStatus>({ step: 'idle', message: 'Ready to scan' })
  const [result, setResult] = useState<ScanResult | null>(null)
  const [workflowResult, setWorkflowResult] = useState<CWorkflowResult | null>(null)
  const [progress, setProgress] = useState(0)

  const scanContract = useCallback(async (address: string, chainId: number = 31337) => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setStatus({ step: 'error', message: 'Invalid contract address' })
      return null
    }

    setIsScanning(true)
    setResult(null)
    setWorkflowResult(null)
    setProgress(0)

    try {
      // Step 1: Submit scan request to CRE API
      setStatus({ step: 'submitting', message: 'Submitting scan request to CRE...' })
      setProgress(10)

      const response = await fetch(`${CRE_API_URL}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractAddress: address,
          chainId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || error.error || 'Scan failed')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Scan failed')
      }

      const creResult: CWorkflowResult = data.result
      setWorkflowResult(creResult)
      setResult(creResult.scanResult)

      // Map CRE workflow steps to UI progress
      setProgress(100)
      setStatus({
        step: 'complete',
        message: `Scan complete: ${creResult.scanResult.severity} risk detected`,
        timestamp: new Date().toISOString(),
      })

      return creResult.scanResult
    } catch (error) {
      console.error('CRE scan error:', error)
      setStatus({
        step: 'error',
        message: error instanceof Error ? error.message : 'Scan failed',
      })
      return null
    } finally {
      setIsScanning(false)
    }
  }, [])

  return {
    scanContract,
    isScanning,
    status,
    result,
    workflowResult,
    setStatus,
    setResult,
    progress,
  }
}

export default useScannerCRE
