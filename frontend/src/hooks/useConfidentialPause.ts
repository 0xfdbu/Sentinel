/**
 * Confidential Pause Hook
 * 
 * Executes emergency pause through Chainlink Confidential Compute (TEE).
 * This keeps the pause reason and admin identity private.
 */

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env?.VITE_CRE_API_URL || 'http://localhost:3001'

export interface ConfidentialPauseResult {
  success: boolean
  contractAddress: string
  txHash?: string
  confidential: boolean
  tee: boolean
  adminAddress?: string
  error?: string
}

export function useConfidentialPause() {
  const [isPausing, setIsPausing] = useState(false)

  const executeConfidentialPause = useCallback(async (
    contractAddress: string,
    reason: string = 'Fraud detection'
  ): Promise<ConfidentialPauseResult | null> => {
    setIsPausing(true)

    try {
      toast.loading('🛡️ Executing confidential pause...', { id: 'confidential-pause' })

      const response = await fetch(`${API_URL}/api/confidential/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress, reason })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Confidential pause failed')
      }

      toast.success(
        `🔒 Confidential pause executed! TX: ${data.data.txHash?.slice(0, 20)}...`,
        { id: 'confidential-pause' }
      )

      return {
        success: true,
        contractAddress: data.data.contractAddress,
        txHash: data.data.txHash,
        confidential: data.data.confidential,
        tee: data.data.tee,
        adminAddress: data.data.adminAddress
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Confidential pause failed'
      toast.error(`❌ ${message}`, { id: 'confidential-pause' })
      
      return {
        success: false,
        contractAddress,
        confidential: false,
        tee: false,
        error: message
      }
    } finally {
      setIsPausing(false)
    }
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/confidential/status`)
      const data = await response.json()
      return data.data
    } catch {
      return { available: false }
    }
  }, [])

  return {
    executeConfidentialPause,
    checkStatus,
    isPausing
  }
}

export default useConfidentialPause
