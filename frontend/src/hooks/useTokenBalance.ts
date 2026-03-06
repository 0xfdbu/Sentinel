/**
 * useTokenBalance Hook
 * 
 * Fetches ERC20 token balance for the connected wallet
 */

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useTokenBalance(tokenAddress?: `0x${string}`) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  
  const [balance, setBalance] = useState<bigint | null>(null)
  const [decimals, setDecimals] = useState<number>(18)
  const [symbol, setSymbol] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchBalance = useCallback(async () => {
    if (!publicClient || !address || !tokenAddress) {
      setBalance(null)
      return
    }

    setIsLoading(true)
    try {
      const [bal, dec, sym] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
      ])
      
      setBalance(bal)
      setDecimals(dec)
      setSymbol(sym)
    } catch (error) {
      console.error('Failed to fetch token balance:', error)
      setBalance(null)
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, address, tokenAddress])

  useEffect(() => {
    fetchBalance()
    
    // Poll for balance updates every 10 seconds
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [fetchBalance])

  return {
    balance,
    decimals,
    symbol,
    isLoading,
    refetch: fetchBalance,
  }
}

export default useTokenBalance
