import { useState, useCallback } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import { toast } from 'react-hot-toast'

const TEE_API_URL = 'https://convergence2026-token-api.cldev.cloud'

const CONFIDENTIAL_DOMAIN = {
  name: "CompliantPrivateTokenDemo",
  version: "0.0.1",
  chainId: 11155111,
  verifyingContract: "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13"
} as const

interface PrivateBalance {
  token: string
  amount: string
}

interface RescueState {
  isLoading: boolean
  balances: PrivateBalance[]
  shieldedAddress: string | null
  lastTxId: string | null
}

export function useConfidentialRescue() {
  const { address } = useAccount()
  const [state, setState] = useState<RescueState>({
    isLoading: false,
    balances: [],
    shieldedAddress: null,
    lastTxId: null
  })

  const { signTypedDataAsync } = useSignTypedData()

  // Get private balances from TEE
  const fetchBalances = useCallback(async () => {
    if (!address) return

    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      
      const signature = await signTypedDataAsync({
        domain: CONFIDENTIAL_DOMAIN,
        types: {
          'Retrieve Balances': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' }
          ]
        },
        primaryType: 'Retrieve Balances',
        message: { account: address, timestamp }
      })

      const response = await fetch(`${TEE_API_URL}/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address, timestamp, auth: signature })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setState(prev => ({ 
        ...prev, 
        balances: data.balances || [],
        isLoading: false 
      }))
      
      return data.balances
    } catch (error: any) {
      toast.error(`Failed to fetch balances: ${error.message}`)
      setState(prev => ({ ...prev, isLoading: false }))
      return []
    }
  }, [address, signTypedDataAsync])

  // Generate shielded address
  const generateShieldedAddress = useCallback(async () => {
    if (!address) return null

    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      
      const signature = await signTypedDataAsync({
        domain: CONFIDENTIAL_DOMAIN,
        types: {
          'Generate Shielded Address': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' }
          ]
        },
        primaryType: 'Generate Shielded Address',
        message: { account: address, timestamp }
      })

      const response = await fetch(`${TEE_API_URL}/shielded-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: address, timestamp, auth: signature })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setState(prev => ({ 
        ...prev, 
        shieldedAddress: data.address,
        isLoading: false 
      }))
      
      toast.success('Shielded address generated!')
      return data.address
    } catch (error: any) {
      toast.error(`Failed to generate shielded address: ${error.message}`)
      setState(prev => ({ ...prev, isLoading: false }))
      return null
    }
  }, [address, signTypedDataAsync])

  // Execute confidential rescue (transfer to shielded address)
  const executeRescue = useCallback(async (
    tokenAddress: string,
    amount: string,
    recipientShieldedAddress?: string
  ) => {
    if (!address) {
      toast.error('Connect wallet first')
      return null
    }

    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Generate shielded address if not provided
      let shieldedAddr = recipientShieldedAddress
      if (!shieldedAddr) {
        shieldedAddr = await generateShieldedAddress()
        if (!shieldedAddr) throw new Error('Failed to generate shielded address')
      }

      const timestamp = Math.floor(Date.now() / 1000)
      
      const signature = await signTypedDataAsync({
        domain: CONFIDENTIAL_DOMAIN,
        types: {
          'Private Token Transfer': [
            { name: 'sender', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'flags', type: 'string[]' },
            { name: 'timestamp', type: 'uint256' }
          ]
        },
        primaryType: 'Private Token Transfer',
        message: {
          sender: address,
          recipient: shieldedAddr,
          token: tokenAddress,
          amount,
          flags: ['hide-sender'],
          timestamp
        }
      })

      const response = await fetch(`${TEE_API_URL}/private-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: address,
          sender: address,
          recipient: shieldedAddr,
          token: tokenAddress,
          amount,
          flags: ['hide-sender'],
          timestamp,
          auth: signature
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setState(prev => ({ 
        ...prev, 
        lastTxId: data.transaction_id,
        isLoading: false 
      }))
      
      toast.success(`Confidential rescue executed! TX: ${data.transaction_id.slice(0, 20)}...`)
      return data.transaction_id
    } catch (error: any) {
      toast.error(`Rescue failed: ${error.message}`)
      setState(prev => ({ ...prev, isLoading: false }))
      return null
    }
  }, [address, signTypedDataAsync, generateShieldedAddress])

  // Check if can rescue (has private balance)
  const canRescue = state.balances.length > 0 && BigInt(state.balances[0]?.amount || 0) > 0n

  return {
    ...state,
    canRescue,
    fetchBalances,
    generateShieldedAddress,
    executeRescue
  }
}

export default useConfidentialRescue
