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

export interface Vulnerability {
  type: string
  severity: Severity
  description: string
  confidence: number
  recommendation: string
}

// Legacy format for backward compatibility with existing components
export interface ScanResult {
  severity: Severity
  category: string
  vector: string
  lines: number[]
  confidence: number
  recommendation: string
  // New fields from API
  status?: string
  contractAddress?: string
  chainId?: number
  contractName?: string
  compilerVersion?: string
  riskLevel?: Severity
  overallScore?: number
  summary?: string
  vulnerabilities?: Vulnerability[]
  confidential?: boolean
  tee?: boolean
  timestamp?: number
}

export interface CRELogEntry {
  timestamp: string
  level: 'info' | 'success' | 'error' | 'warn' | 'simulation' | 'user' | 'result' | 'raw'
  message: string
}

export interface ScanStatus {
  step: 'idle' | 'submitting' | 'fetching' | 'analyzing' | 'evaluating' | 'executing' | 'complete' | 'error'
  message: string
  timestamp?: string
}

export interface APIScanResponse {
  scanId: string
  status: string
  contractAddress: string
  result: {
    status: string
    contractAddress: string
    chainId: number
    contractName: string
    compilerVersion: string
    riskLevel: Severity
    overallScore: number
    summary: string
    vulnerabilities: Vulnerability[]
    confidential: boolean
    tee: boolean
    timestamp: number
  }
  creLogs: CRELogEntry[]
  rawOutput: string
}

// CRE API endpoint
const CRE_API_URL = import.meta.env?.VITE_CRE_API_URL || 'http://localhost:3001'

// Map new API result to legacy ScanResult format
function mapToLegacyFormat(apiResult: APIScanResponse['result']): ScanResult {
  const primaryVuln = apiResult.vulnerabilities[0]
  
  return {
    // Legacy fields
    severity: apiResult.riskLevel,
    category: primaryVuln?.type || 'None',
    vector: primaryVuln?.description || apiResult.summary,
    lines: [],
    confidence: primaryVuln?.confidence || 0.95,
    recommendation: primaryVuln?.recommendation || 'No issues detected',
    // New fields
    status: apiResult.status,
    contractAddress: apiResult.contractAddress,
    chainId: apiResult.chainId,
    contractName: apiResult.contractName,
    compilerVersion: apiResult.compilerVersion,
    riskLevel: apiResult.riskLevel,
    overallScore: apiResult.overallScore,
    summary: apiResult.summary,
    vulnerabilities: apiResult.vulnerabilities,
    confidential: apiResult.confidential,
    tee: apiResult.tee,
    timestamp: apiResult.timestamp,
  }
}

export function useScannerCRE() {
  const [isScanning, setIsScanning] = useState(false)
  const [status, setStatus] = useState<ScanStatus>({ step: 'idle', message: 'Ready to scan' })
  const [result, setResult] = useState<ScanResult | null>(null)
  const [creLogs, setCreLogs] = useState<CRELogEntry[]>([])
  const [scanId, setScanId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const scanContract = useCallback(async (address: string, chainId: number = 31337) => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setStatus({ step: 'error', message: 'Invalid contract address' })
      return null
    }

    setIsScanning(true)
    setResult(null)
    setCreLogs([])
    setScanId(null)
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

      const scanData: APIScanResponse = data.data
      setScanId(scanData.scanId)
      setCreLogs(scanData.creLogs)
      
      // Try to get result from API response, or parse from creLogs if null
      let scanResult = scanData.result
      
      if (!scanResult && scanData.creLogs) {
        // Find the raw log entry containing the JSON result data
        // The JSON is double-escaped: "{\"status\":\"success\"...}"
        const rawResultLog = scanData.creLogs.find((log: any) => 
          log.level === 'raw' && 
          log.message &&
          log.message.startsWith('"{') && 
          log.message.includes('status\\":\\"success')
        )
        
        if (rawResultLog) {
          try {
            // The message is a quoted JSON string, parse it twice:
            // 1. First parse: unquote the string "{...}" -> {...}
            // 2. Second parse: parse the actual JSON object
            const message = rawResultLog.message.trim()
            const unquoted = JSON.parse(message)
            const parsed = JSON.parse(unquoted)
            scanResult = parsed
          } catch (e) {
            console.error('Failed to parse result from logs:', e)
          }
        }
      }
      
      // Map to legacy format for backward compatibility
      const legacyResult = mapToLegacyFormat(scanResult)
      setResult(legacyResult)

      // Map CRE workflow steps to UI progress
      setProgress(100)
      setStatus({
        step: 'complete',
        message: `Scan complete: ${legacyResult.riskLevel} risk detected`,
        timestamp: new Date().toISOString(),
      })

      return legacyResult
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
    creLogs,
    scanId,
    setStatus,
    setResult,
    progress,
  }
}

export default useScannerCRE
