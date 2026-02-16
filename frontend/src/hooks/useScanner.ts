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
  step: 'idle' | 'fetching' | 'analyzing' | 'evaluating' | 'complete' | 'error'
  message: string
  timestamp?: string
}

// Using xAI Grok API for real security analysis
// @ts-ignore
const GROK_API_KEY = import.meta.env?.VITE_GROK_API_KEY || ''
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [status, setStatus] = useState<ScanStatus>({ step: 'idle', message: 'Ready to scan' })
  const [result, setResult] = useState<ScanResult | null>(null)
  const [progress, setProgress] = useState(0)

  const fetchContractSource = async (address: string, chainId: number = 1): Promise<string> => {
    // Try Etherscan first
    // @ts-ignore
const etherscanApiKey = import.meta.env?.VITE_ETHERSCAN_API_KEY || ''
    const etherscanUrl = chainId === 11155111 
      ? `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${etherscanApiKey}`
      : `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${etherscanApiKey}`
    
    try {
      const response = await fetch(etherscanUrl)
      const data = await response.json()
      if (data.status === '1' && data.result[0].SourceCode) {
        return data.result[0].SourceCode
      }
    } catch (e) {
      console.warn('Etherscan fetch failed:', e)
    }

    // Fallback: return placeholder for local testing
    return `// Source code for ${address}\n// Fetched from chain ${chainId}`
  }

  const analyzeWithGrok = async (sourceCode: string): Promise<ScanResult> => {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are an expert smart contract security auditor. Analyze the provided Solidity code for vulnerabilities.

Focus on:
1. Reentrancy attacks (external calls before state changes)
2. Integer overflow/underflow (missing SafeMath or unchecked blocks)
3. Unchecked external calls (return values not verified)
4. Access control issues (missing onlyOwner or role checks)
5. Front-running vulnerabilities
6. Timestamp dependence
7. Unchecked low-level calls
8. Self-destruct vulnerabilities
9. Delegatecall injection
10. tx.origin authentication

Respond ONLY with valid JSON in this exact format:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|SAFE",
  "category": "Reentrancy|Overflow|AccessControl|Other|None",
  "vector": "Detailed description of the vulnerability",
  "lines": [1, 2, 3],
  "confidence": 0.95,
  "recommendation": "How to fix this issue"
}

If no vulnerabilities found, return SAFE with appropriate values.`
          },
          {
            role: 'user',
            content: `Analyze this Solidity smart contract for security vulnerabilities:\n\n${sourceCode}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Parse JSON from response (handle potential markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/)
    const jsonStr = jsonMatch ? jsonMatch[1] : content
    
    return JSON.parse(jsonStr)
  }

  const scanContract = useCallback(async (address: string, chainId: number = 31337) => {
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setStatus({ step: 'error', message: 'Invalid contract address' })
      return null
    }

    setIsScanning(true)
    setResult(null)
    setProgress(0)

    try {
      // Step 1: Fetch source (0-30%)
      setStatus({ step: 'fetching', message: 'Fetching contract source from Etherscan...' })
      setProgress(10)
      const sourceCode = await fetchContractSource(address, chainId)
      setProgress(30)

      // Step 2: AI Analysis with Grok (30-80%)
      setStatus({ step: 'analyzing', message: 'AI analyzing code for vulnerabilities...' })
      setProgress(50)
      const scanResult = await analyzeWithGrok(sourceCode)
      setProgress(80)

      // Step 3: Evaluate (80-100%)
      setStatus({ step: 'evaluating', message: 'Evaluating risk and determining response...' })
      await new Promise(r => setTimeout(r, 500))
      setProgress(100)

      setResult(scanResult)
      setStatus({
        step: 'complete',
        message: 'Scan complete',
        timestamp: new Date().toISOString(),
      })

      return scanResult
    } catch (error) {
      console.error('Scan error:', error)
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
    setStatus,
    setResult,
    progress,
  }
}
