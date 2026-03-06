/**
 * useCCIPBridge Hook
 * 
 * Handles cross-chain bridging operations for USDA Stablecoin V4
 * Uses Chainlink CCIP TokenPool architecture
 */

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'react-hot-toast'

// CCIP Chain Selectors (mainnet and testnet)
export const CCIP_CHAIN_SELECTORS = {
  // Mainnet
  ethereum: 5009297550715157269n,
  polygon: 4051577828743386545n,
  arbitrum: 4949039107694359620n,
  base: 15971525489660198786n,
  optimism: 3734403246176062136n,
  avalanche: 6433500567565415381n,
  // Testnet
  sepolia: 16015286601757825753n,
  amoy: 16281711391670634445n,
  arbitrumSepolia: 3478487238524512106n,
  baseSepolia: 10344971235874465080n,
}

// Chain names for display
export const CHAIN_NAMES: Record<string, string> = {
  [CCIP_CHAIN_SELECTORS.ethereum.toString()]: 'Ethereum',
  [CCIP_CHAIN_SELECTORS.polygon.toString()]: 'Polygon',
  [CCIP_CHAIN_SELECTORS.arbitrum.toString()]: 'Arbitrum',
  [CCIP_CHAIN_SELECTORS.base.toString()]: 'Base',
  [CCIP_CHAIN_SELECTORS.optimism.toString()]: 'Optimism',
  [CCIP_CHAIN_SELECTORS.avalanche.toString()]: 'Avalanche',
  [CCIP_CHAIN_SELECTORS.sepolia.toString()]: 'Sepolia',
  [CCIP_CHAIN_SELECTORS.amoy.toString()]: 'Amoy (Polygon)',
  [CCIP_CHAIN_SELECTORS.arbitrumSepolia.toString()]: 'Arbitrum Sepolia ✅',
  [CCIP_CHAIN_SELECTORS.baseSepolia.toString()]: 'Base Sepolia',
}

// Chain icons/colors
export const CHAIN_COLORS: Record<string, string> = {
  [CCIP_CHAIN_SELECTORS.ethereum.toString()]: '#627EEA',
  [CCIP_CHAIN_SELECTORS.polygon.toString()]: '#8247E5',
  [CCIP_CHAIN_SELECTORS.arbitrum.toString()]: '#28A0F0',
  [CCIP_CHAIN_SELECTORS.base.toString()]: '#0052FF',
  [CCIP_CHAIN_SELECTORS.optimism.toString()]: '#FF0420',
  [CCIP_CHAIN_SELECTORS.avalanche.toString()]: '#E84142',
  [CCIP_CHAIN_SELECTORS.sepolia.toString()]: '#627EEA',
  [CCIP_CHAIN_SELECTORS.amoy.toString()]: '#8247E5',
  [CCIP_CHAIN_SELECTORS.arbitrumSepolia.toString()]: '#28A0F0',
  [CCIP_CHAIN_SELECTORS.baseSepolia.toString()]: '#0052FF',
}

export interface BridgeParams {
  destinationChainSelector: bigint
  receiver: string
  amount: string
}

export interface BridgeEstimate {
  ccipFee: bigint
  bridgeFee: bigint
  amountAfterFee: bigint
  ccipFeeFormatted: string
  bridgeFeeFormatted: string
  amountAfterFeeFormatted: string
}

export interface BridgeStatus {
  messageId?: string
  sourceChain: bigint
  destinationChain: bigint
  sender: string
  receiver: string
  amount: bigint
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
}

// TokenPool ABI for V4 architecture
const tokenPoolABI = [
  {
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'lockOrBurn',
    outputs: [{ name: 'messageId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'receiver', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'getFee',
    outputs: [{ name: 'fee', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'chainSelector', type: 'uint64' }],
    name: 'isSupportedChain',
    outputs: [{ name: 'supported', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
]

// ERC20 ABI
const erc20ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
]

export function useCCIPBridge(stablecoinAddress?: string) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeHistory, setBridgeHistory] = useState<BridgeStatus[]>([])

  // Get TokenPool address based on chain
  const getTokenPoolAddress = useCallback((): `0x${string}` | null => {
    const sepoliaPool = import.meta.env.VITE_TOKEN_POOL_ADDRESS as `0x${string}` | undefined
    const arbitrumPool = import.meta.env.VITE_TOKEN_POOL_ADDRESS_ARBITRUM as `0x${string}` | undefined
    
    // Sepolia chainId = 11155111, Arbitrum Sepolia = 421614
    if (chainId === 11155111 && sepoliaPool) return sepoliaPool
    if (chainId === 421614 && arbitrumPool) return arbitrumPool
    
    return null
  }, [chainId])

  // Get LINK token address based on chain
  const getLinkTokenAddress = useCallback((): `0x${string}` => {
    if (chainId === 421614) {
      return import.meta.env.VITE_LINK_TOKEN_ADDRESS_ARBITRUM as `0x${string}`
    }
    return import.meta.env.VITE_LINK_TOKEN_ADDRESS as `0x${string}`
  }, [chainId])

  /**
   * Get bridge fee estimate
   */
  const getBridgeEstimate = useCallback(async (
    destinationChainSelector: bigint,
    receiver: string,
    amount: string
  ): Promise<BridgeEstimate | null> => {
    if (!publicClient || !stablecoinAddress) return null

    const tokenPoolAddress = getTokenPoolAddress()
    if (!tokenPoolAddress) {
      // Fallback: use stablecoin's estimate if TokenPool not deployed
      try {
        const stablecoinABI = [
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
            type: 'function'
          },
          { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
          { inputs: [], name: 'bridgeFeeBps', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' }
        ]

        const decimals = await publicClient.readContract({
          address: stablecoinAddress as `0x${string}`,
          abi: stablecoinABI,
          functionName: 'decimals'
        }) as number

        const amountParsed = parseUnits(amount, decimals)
        const [ccipFee, bridgeFee] = await publicClient.readContract({
          address: stablecoinAddress as `0x${string}`,
          abi: stablecoinABI,
          functionName: 'getBridgeFeeEstimate',
          args: [destinationChainSelector, receiver, amountParsed]
        }) as [bigint, bigint]

        const amountAfterFee = amountParsed - bridgeFee

        return {
          ccipFee,
          bridgeFee,
          amountAfterFee,
          ccipFeeFormatted: formatUnits(ccipFee, 18),
          bridgeFeeFormatted: formatUnits(bridgeFee, decimals),
          amountAfterFeeFormatted: formatUnits(amountAfterFee, decimals)
        }
      } catch {
        return null
      }
    }

    // TokenPool-based fee estimation
    try {
      const decimals = await publicClient.readContract({
        address: stablecoinAddress as `0x${string}`,
        abi: erc20ABI,
        functionName: 'decimals'
      }) as number

      const amountParsed = parseUnits(amount, decimals)
      
      const ccipFee = await publicClient.readContract({
        address: tokenPoolAddress,
        abi: tokenPoolABI,
        functionName: 'getFee',
        args: [destinationChainSelector, receiver as `0x${string}`, amountParsed]
      }) as bigint

      // Get bridge fee bps from stablecoin
      const bridgeFeeBps = await publicClient.readContract({
        address: stablecoinAddress as `0x${string}`,
        abi: [{ inputs: [], name: 'bridgeFeeBps', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' }],
        functionName: 'bridgeFeeBps'
      }) as bigint

      const bridgeFee = (amountParsed * bridgeFeeBps) / 10000n
      const amountAfterFee = amountParsed - bridgeFee

      return {
        ccipFee,
        bridgeFee,
        amountAfterFee,
        ccipFeeFormatted: formatUnits(ccipFee, 18),
        bridgeFeeFormatted: formatUnits(bridgeFee, decimals),
        amountAfterFeeFormatted: formatUnits(amountAfterFee, decimals)
      }
    } catch (error: any) {
      console.error('Failed to get bridge estimate:', error)
      return null
    }
  }, [publicClient, stablecoinAddress, getTokenPoolAddress])

  /**
   * Check if destination chain is configured
   */
  const isChainConfigured = useCallback(async (
    chainSelector: bigint
  ): Promise<boolean> => {
    if (!publicClient || !stablecoinAddress) return false

    const tokenPoolAddress = getTokenPoolAddress()
    if (tokenPoolAddress) {
      // Check via TokenPool
      try {
        return await publicClient.readContract({
          address: tokenPoolAddress,
          abi: tokenPoolABI,
          functionName: 'isSupportedChain',
          args: [chainSelector]
        }) as boolean
      } catch {
        return false
      }
    }

    // Fallback: check via stablecoin's remoteStablecoins mapping
    try {
      const remoteAddress = await publicClient.readContract({
        address: stablecoinAddress as `0x${string}`,
        abi: [{ inputs: [{ name: '', type: 'uint64' }], name: 'remoteStablecoins', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' }],
        functionName: 'remoteStablecoins',
        args: [chainSelector]
      })

      return remoteAddress !== '0x0000000000000000000000000000000000000000'
    } catch {
      return false
    }
  }, [publicClient, stablecoinAddress, getTokenPoolAddress])

  /**
   * Bridge tokens to another chain
   */
  const bridgeTokens = useCallback(async ({
    destinationChainSelector,
    receiver,
    amount
  }: BridgeParams): Promise<string | null> => {
    if (!walletClient || !address || !stablecoinAddress) {
      toast.error('Wallet not connected')
      return null
    }

    setIsBridging(true)

    try {
      const decimals = await publicClient?.readContract({
        address: stablecoinAddress as `0x${string}`,
        abi: erc20ABI,
        functionName: 'decimals'
      }) as number

      const amountParsed = parseUnits(amount, decimals)
      const tokenPoolAddress = getTokenPoolAddress()
      const linkTokenAddress = getLinkTokenAddress()

      // Get fee estimate
      const estimate = await getBridgeEstimate(destinationChainSelector, receiver, amount)
      if (!estimate) {
        toast.error('Failed to estimate bridge fees')
        return null
      }

      if (tokenPoolAddress) {
        // V4 TokenPool-based bridging
        
        // Step 1: Approve USDA to TokenPool
        toast.loading('Approving USDA for TokenPool...', { id: 'bridge-approve-usda' })
        
        const approveUsdTx = await walletClient.writeContract({
          address: stablecoinAddress as `0x${string}`,
          abi: erc20ABI,
          functionName: 'approve',
          args: [tokenPoolAddress, amountParsed]
        })
        
        await publicClient?.waitForTransactionReceipt({ hash: approveUsdTx })
        toast.success('USDA approved!', { id: 'bridge-approve-usda' })

        // Step 2: Approve LINK for CCIP fees
        toast.loading('Approving LINK for CCIP fees...', { id: 'bridge-approve-link' })
        
        const approveLinkTx = await walletClient.writeContract({
          address: linkTokenAddress,
          abi: erc20ABI,
          functionName: 'approve',
          args: [tokenPoolAddress, estimate.ccipFee * 2n] // 2x for safety
        })
        
        await publicClient?.waitForTransactionReceipt({ hash: approveLinkTx })
        toast.success('LINK approved!', { id: 'bridge-approve-link' })

        // Step 3: Bridge via TokenPool
        const tx = await walletClient.writeContract({
          address: tokenPoolAddress,
          abi: tokenPoolABI,
          functionName: 'lockOrBurn',
          args: [destinationChainSelector, receiver as `0x${string}`, amountParsed]
        })

        toast.loading('Bridge transaction submitted...', { id: 'bridge-tx' })

        const receipt = await publicClient?.waitForTransactionReceipt({ hash: tx })

        if (receipt?.status === 'success') {
          toast.success('Bridge transaction confirmed!', { id: 'bridge-tx' })
          
          const messageId = receipt.transactionHash

          const newBridge: BridgeStatus = {
            messageId,
            sourceChain: BigInt(chainId || 0),
            destinationChain: destinationChainSelector,
            sender: address,
            receiver,
            amount: amountParsed,
            timestamp: Date.now(),
            status: 'pending'
          }
          
          setBridgeHistory(prev => [newBridge, ...prev])
          return messageId
        } else {
          toast.error('Bridge transaction failed', { id: 'bridge-tx' })
          return null
        }
      } else {
        // Fallback: V3-style bridging via stablecoin contract
        toast.loading('Approving LINK for CCIP fees...', { id: 'bridge-approve' })
        
        const approveTx = await walletClient.writeContract({
          address: linkTokenAddress,
          abi: erc20ABI,
          functionName: 'approve',
          args: [stablecoinAddress as `0x${string}`, estimate.ccipFee * 2n]
        })
        
        await publicClient?.waitForTransactionReceipt({ hash: approveTx })
        toast.success('LINK approved!', { id: 'bridge-approve' })

        const stablecoinBridgeABI = [
          {
            inputs: [
              { name: 'destinationChainSelector', type: 'uint64' },
              { name: 'receiver', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            name: 'bridgeToChain',
            outputs: [{ name: 'messageId', type: 'bytes32' }],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ]

        const tx = await walletClient.writeContract({
          address: stablecoinAddress as `0x${string}`,
          abi: stablecoinBridgeABI,
          functionName: 'bridgeToChain',
          args: [destinationChainSelector, receiver as `0x${string}`, amountParsed]
        })

        toast.loading('Bridge transaction submitted...', { id: 'bridge-tx' })

        const receipt = await publicClient?.waitForTransactionReceipt({ hash: tx })

        if (receipt?.status === 'success') {
          toast.success('Bridge transaction confirmed!', { id: 'bridge-tx' })
          
          const messageId = receipt.transactionHash

          const newBridge: BridgeStatus = {
            messageId,
            sourceChain: BigInt(chainId || 0),
            destinationChain: destinationChainSelector,
            sender: address,
            receiver,
            amount: amountParsed,
            timestamp: Date.now(),
            status: 'pending'
          }
          
          setBridgeHistory(prev => [newBridge, ...prev])
          return messageId
        } else {
          toast.error('Bridge transaction failed', { id: 'bridge-tx' })
          return null
        }
      }
    } catch (error: any) {
      console.error('Bridge failed:', error)
      toast.error(error.message || 'Bridge failed', { id: 'bridge-tx' })
      return null
    } finally {
      setIsBridging(false)
    }
  }, [walletClient, address, stablecoinAddress, publicClient, getBridgeEstimate, getTokenPoolAddress, getLinkTokenAddress, chainId])

  /**
   * Get LINK balance for CCIP fees
   */
  const getLinkBalance = useCallback(async (): Promise<bigint> => {
    if (!publicClient || !address) return 0n
    
    const linkTokenAddress = getLinkTokenAddress()
    
    try {
      const balance = await publicClient.readContract({
        address: linkTokenAddress,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address]
      }) as bigint
      
      return balance
    } catch {
      return 0n
    }
  }, [publicClient, address, getLinkTokenAddress])

  /**
   * Get available destination chains
   */
  const getAvailableChains = useCallback(async (): Promise<bigint[]> => {
    const chains = Object.values(CCIP_CHAIN_SELECTORS)
    const configured: bigint[] = []

    for (const chain of chains) {
      if (await isChainConfigured(chain)) {
        configured.push(chain)
      }
    }

    return configured
  }, [isChainConfigured])

  return {
    isBridging,
    bridgeTokens,
    getBridgeEstimate,
    isChainConfigured,
    getAvailableChains,
    getLinkBalance,
    bridgeHistory,
    chainSelectors: CCIP_CHAIN_SELECTORS,
    chainNames: CHAIN_NAMES,
    chainColors: CHAIN_COLORS,
    tokenPoolAddress: getTokenPoolAddress()
  }
}

export default useCCIPBridge
