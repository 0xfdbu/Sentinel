/**
 * useUSDAStablecoin Hook
 * 
 * Interacts with the USDA Stablecoin contract for minting, burning, and bridging
 */

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient, useBalance, useChainId } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'react-hot-toast'

// Contract addresses from environment
const USDA_ADDRESSES: Record<number, string> = {
  11155111: import.meta.env.VITE_USDA_STABLECOIN_ADDRESS || '0xCd4D3D34e92a529270b261dA5ba5a55eE6e11da6', // V4 TokenPool Compatible
  421614: import.meta.env.VITE_USDA_STABLECOIN_ADDRESS_ARBITRUM || '0x543b8555f9284D106422F0eD7B9d25F9520a17Ad', // V4 TokenPool Compatible
}

// CCIP Chain Selectors
export const CCIP_CHAIN_SELECTORS = {
  sepolia: 16015286601757825753n,
  arbitrumSepolia: 3478487238524512106n,
}

// Chain names
export const CHAIN_NAMES: Record<string, string> = {
  [CCIP_CHAIN_SELECTORS.sepolia.toString()]: 'Sepolia',
  [CCIP_CHAIN_SELECTORS.arbitrumSepolia.toString()]: 'Arbitrum Sepolia',
}

// USDA Stablecoin ABI (V2 compatible)
const USDA_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'bridgeToChain',
    outputs: [{ name: 'messageId', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'getBridgeFeeEstimate',
    outputs: [
      { name: 'ccipFee', type: 'uint256' },
      { name: 'bridgeFee', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
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
    name: 'mintCap',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'bridgeFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint64' }],
    name: 'remoteStablecoins',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
    name: 'checkTransferCompliance',
    outputs: [{ name: 'compliant', type: 'bool' }, { name: 'reason', type: 'string' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'aceEnforcementEnabled',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'policyEngine',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    name: 'checkTransferCompliance',
    outputs: [
      { name: 'compliant', type: 'bool' },
      { name: 'reason', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // V4 TokenPool Functions
  {
    inputs: [{ name: 'minterBurner', type: 'address' }],
    name: 'grantMintAndBurnRoles',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINTER_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BURNER_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export function useUSDAStablecoin() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { data: ethBalance } = useBalance({ address })
  
  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null)
  const [bridgeFeeBps, setBridgeFeeBps] = useState<number>(30)

  const usdaAddress = chainId ? USDA_ADDRESSES[chainId] : null

  // Fetch balance and supply
  const fetchData = useCallback(async () => {
    if (!publicClient || !address || !usdaAddress) return

    try {
      console.log('[USDA Hook] Fetching data for:', { address, usdaAddress, chainId })
      
      const [bal, supply, feeBps, decs] = await Promise.all([
        publicClient.readContract({
          address: usdaAddress as `0x${string}`,
          abi: USDA_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: usdaAddress as `0x${string}`,
          abi: USDA_ABI,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: usdaAddress as `0x${string}`,
          abi: USDA_ABI,
          functionName: 'bridgeFeeBps',
        }),
        publicClient.readContract({
          address: usdaAddress as `0x${string}`,
          abi: USDA_ABI,
          functionName: 'decimals',
        }).catch(() => 6n), // Default to 6 if not available
      ])
      
      console.log('[USDA Hook] Raw data:', { 
        balance: bal?.toString(), 
        supply: supply?.toString(), 
        feeBps: feeBps?.toString(),
        decimals: decs?.toString()
      })
      
      setBalance(bal as bigint)
      setTotalSupply(supply as bigint)
      setBridgeFeeBps(Number(feeBps))
    } catch (error) {
      console.error('[USDA Hook] Failed to fetch USDA data:', error)
    }
  }, [publicClient, address, usdaAddress, chainId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Get bridge fee estimate
  const getBridgeFeeEstimate = useCallback(async (
    destinationChainSelector: bigint,
    receiver: string,
    amount: string
  ) => {
    if (!publicClient || !usdaAddress) return null

    try {
      const decimals = 6
      const amountParsed = parseUnits(amount, decimals)

      const [ccipFee, bridgeFee] = await publicClient.readContract({
        address: usdaAddress as `0x${string}`,
        abi: USDA_ABI,
        functionName: 'getBridgeFeeEstimate',
        args: [destinationChainSelector, receiver as `0x${string}`, amountParsed],
      }) as [bigint, bigint]

      return {
        ccipFee,
        bridgeFee,
        amountAfterFee: amountParsed - bridgeFee,
        ccipFeeFormatted: formatUnits(ccipFee, 18),
        bridgeFeeFormatted: formatUnits(bridgeFee, decimals),
        amountAfterFeeFormatted: formatUnits(amountParsed - bridgeFee, decimals),
      }
    } catch (error: any) {
      console.error('Failed to get bridge estimate:', error)
      return null
    }
  }, [publicClient, usdaAddress])

  // Bridge tokens
  const bridgeTokens = useCallback(async (
    destinationChainSelector: bigint,
    receiver: string,
    amount: string
  ) => {
    if (!walletClient || !address || !usdaAddress) {
      toast.error('Wallet not connected')
      return null
    }

    setIsLoading(true)

    try {
      // Get fee estimate
      const estimate = await getBridgeFeeEstimate(destinationChainSelector, receiver, amount)
      if (!estimate) {
        toast.error('Failed to estimate bridge fees')
        return null
      }

      const decimals = 6
      const amountParsed = parseUnits(amount, decimals)

      // Send bridge transaction
      const tx = await walletClient.writeContract({
        address: usdaAddress as `0x${string}`,
        abi: USDA_ABI,
        functionName: 'bridgeToChain',
        args: [destinationChainSelector, receiver as `0x${string}`, amountParsed],
        value: estimate.ccipFee,
      })

      toast.loading('Bridge transaction submitted...', { id: 'bridge-tx' })

      const receipt = await publicClient?.waitForTransactionReceipt({ hash: tx })

      if (receipt?.status === 'success') {
        toast.success('Bridge initiated! Check CCIP Explorer.', { id: 'bridge-tx' })
        await fetchData()
        return tx
      } else {
        toast.error('Bridge transaction failed', { id: 'bridge-tx' })
        return null
      }
    } catch (error: any) {
      console.error('Bridge failed:', error)
      toast.error(error.message || 'Bridge failed', { id: 'bridge-tx' })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, address, usdaAddress, publicClient, getBridgeFeeEstimate, fetchData])

  // Check ACE compliance
  const checkCompliance = useCallback(async (
    from: string,
    to: string,
    value: bigint
  ) => {
    if (!publicClient || !usdaAddress) return { compliant: false, reason: 'Not connected' }

    try {
      const [compliant, reason] = await publicClient.readContract({
        address: usdaAddress as `0x${string}`,
        abi: USDA_ABI,
        functionName: 'checkTransferCompliance',
        args: [from as `0x${string}`, to as `0x${string}`, value],
      }) as [boolean, string]

      return { compliant, reason }
    } catch (error: any) {
      return { compliant: false, reason: error.message }
    }
  }, [publicClient, usdaAddress])

  return {
    usdaAddress,
    balance,
    totalSupply,
    bridgeFeeBps,
    ethBalance,
    isLoading,
    chainId,
    getBridgeFeeEstimate,
    bridgeTokens,
    checkCompliance,
    refetch: fetchData,
  }
}

export default useUSDAStablecoin
