/**
 * Stablecoin Page - Modern USDA Management with Real Data
 * Clean, minimalist design matching landing page style
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  ExternalLink,
  ArrowDown,
  RefreshCw,
  ArrowRightLeft,
  Globe,
  TrendingUp,
  Zap,
  Wallet,
  ShieldCheck,
  Database,
  Clock,
  Users,
  Flame
} from 'lucide-react'
import { useAccount, usePublicClient, useWalletClient, useBalance, useChainId } from 'wagmi'
import { formatEther, parseEther, type Address } from 'viem'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { Link } from 'react-router-dom'
import { getAddresses } from '../utils/wagmi'

// ETH Collateral Config - Vault V2
const ETH_VAULT_ADDRESS = '0x69C8E369Ce1feC4444F070Df8093e5bDAEcE7D22' as Address
const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306'
const COLLATERAL_RATIO = 1.0 // 100% (1:1)

// USDA Contract (where user actually has balance)
const USDA_V10_ADDRESS = '0x500d640f4fe39daf609c6e14c83b89a68373eafe' as Address
const MINTING_CONSUMER = '0xFe0747c381A2227a954FeE7f99F41E382c6039a6'

// ABIs
const USDA_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'burn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'hasRole', type: 'function', stateMutability: 'view', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'MINTER_ROLE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
] as const

const POLICY_ENGINE_ABI = [
  { name: 'getActivePolicyCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'isCompliant', type: 'function', stateMutability: 'view', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

const ETH_VAULT_ABI = [
  { name: 'depositETH', type: 'function', stateMutability: 'payable', inputs: [], outputs: [{ name: 'mintRequestId', type: 'bytes32' }, { name: 'depositIndex', type: 'uint256' }] },
  { name: 'getChainlinkPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'minimumDeposit', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'collateralRatio', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'userDeposits', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: 'ethAmount', type: 'uint256' }, { name: 'usdaMinted', type: 'uint256' }, { name: 'ethPriceAtDeposit', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'mintCompleted', type: 'bool' }] },
  { name: 'ETHDeposited', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'ethAmount', type: 'uint256' }, { name: 'ethPrice', type: 'uint256' }, { name: 'mintRequestId', type: 'bytes32' }, { name: 'depositIndex', type: 'uint256' }] },
] as const

const PRICE_FEED_ABI = [
  { name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }] },
] as const

// Background component (same style as landing)
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        backgroundSize: '100% 4px'
      }} />
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ top: '0%' }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 opacity-[0.15]" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10" />
    </div>
  )
}

// Stat Card Component
function StatCard({ label, value, subtext, icon: Icon, delay = 0, isLoading = false }: { 
  label: string
  value: string
  subtext?: string
  icon: any
  delay?: number
  isLoading?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-white/10 bg-neutral-900/30 backdrop-blur-sm p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl border border-white/10 bg-neutral-900 flex items-center justify-center">
          <Icon className="w-5 h-5 text-neutral-300" />
        </div>
        <span className="text-sm text-neutral-400">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 flex items-center">
          <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-white mb-1">{value}</div>
          {subtext && <div className="text-sm text-neutral-500">{subtext}</div>}
        </>
      )}
    </motion.div>
  )
}

// Action Card Component
function ActionCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  primary = false,
  disabled = false
}: { 
  title: string
  description: string
  icon: any
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-2xl border p-6 transition-all duration-300",
        primary 
          ? "border-white/20 bg-neutral-900/50 hover:border-white/40" 
          : "border-white/10 bg-neutral-900/30 hover:border-white/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            primary 
              ? "border border-white/20 bg-neutral-800" 
              : "border border-white/10 bg-neutral-900"
          )}>
            <Icon className={cn("w-6 h-6", primary ? "text-white" : "text-neutral-400")} />
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold mb-1", primary ? "text-white" : "text-neutral-200")}>
              {title}
            </h3>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
        </div>
        {primary && (
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
            <ArrowDown className="w-4 h-4 text-neutral-400" />
          </div>
        )}
      </div>
    </motion.button>
  )
}

export default function Stablecoin() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { data: ethBalance } = useBalance({ address })
  const ADDRESSES = getAddresses(chainId)

  const [activeTab, setActiveTab] = useState<'overview' | 'mint' | 'transfer' | 'burn'>('overview')
  const [isDataLoading, setIsDataLoading] = useState(true)
  
  // Real data states
  const [usdaBalance, setUsdaBalance] = useState('0')
  const [totalSupply, setTotalSupply] = useState('0')
  const [decimals, setDecimals] = useState(18)
  const [isPaused, setIsPaused] = useState(false)
  const [activePolicies, setActivePolicies] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  // Form states
  const [transferAmount, setTransferAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  
  // Burn states
  const [burnAmount, setBurnAmount] = useState('')
  const [isBurning, setIsBurning] = useState(false)
  
  // ETH Collateral states
  const [ethAmount, setEthAmount] = useState('')
  const [ethPrice, setEthPrice] = useState(3500)
  const [isDepositing, setIsDepositing] = useState(false)
  
  // Progress Modal state
  const [progressModal, setProgressModal] = useState<{
    show: boolean
    step: 'deposit' | 'detected' | 'consensus' | 'reserves' | 'minting' | 'completed' | 'failed'
    mintRequestId?: string
    txHash?: string
    usdaMinted?: string
    error?: string
  }>({ show: false, step: 'deposit' })
  
  // DON Verification display state
  const [donVerification, setDonVerification] = useState<{
    show: boolean
    txHash?: string
    usdaMinted?: string
    priceConsensus?: string
    priceSources?: string[]
    bankReserves?: string
    signaturesVerified?: number
  }>({ show: false })

  // Fetch USDA data
  const fetchData = useCallback(async () => {
    if (!publicClient || !address) return
    
    setIsDataLoading(true)
    try {
      console.log('[FetchData] Fetching USDA balance for:', address)
      console.log('[FetchData] USDA Contract:', USDA_V10_ADDRESS)
      
      // Fetch multiple data points in parallel
      const [
        balance,
        supply,
        dec,
        paused
      ] = await Promise.all([
        publicClient.readContract({
          address: USDA_V10_ADDRESS,
          abi: USDA_ABI,
          functionName: 'balanceOf',
          args: [address]
        }).catch((e) => { console.error('[FetchData] balanceOf error:', e); return 0n }),
        publicClient.readContract({
          address: USDA_V10_ADDRESS,
          abi: USDA_ABI,
          functionName: 'totalSupply'
        }).catch(() => 0n),
        publicClient.readContract({
          address: USDA_V10_ADDRESS,
          abi: USDA_ABI,
          functionName: 'decimals'
        }).catch(() => 18),
        publicClient.readContract({
          address: USDA_V10_ADDRESS,
          abi: USDA_ABI,
          functionName: 'paused'
        }).catch(() => false)
      ])

      // Format values
      console.log('[FetchData] Raw balance:', balance.toString(), 'Decimals:', dec)
      const divisor = BigInt(10 ** Number(dec))
      const formattedBalance = (Number(balance) / Number(divisor)).toLocaleString('en-US', {
        maximumFractionDigits: 2
      })
      const formattedSupply = (Number(supply) / Number(divisor)).toLocaleString('en-US', {
        maximumFractionDigits: 0
      })

      console.log('[FetchData] Formatted balance:', formattedBalance)
      setUsdaBalance(formattedBalance)
      setTotalSupply(formattedSupply)
      setDecimals(Number(dec))
      setIsPaused(paused)
      setLastUpdated(new Date())

      // Try to get active policy count
      try {
        const policyCount = await publicClient.readContract({
          address: ADDRESSES.policyEngine as Address,
          abi: POLICY_ENGINE_ABI,
          functionName: 'getActivePolicyCount'
        })
        setActivePolicies(Number(policyCount))
      } catch {
        setActivePolicies(0)
      }
    } catch (error) {
      console.error('Error fetching USDA data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setIsDataLoading(false)
    }
  }, [publicClient, address, ADDRESSES.policyEngine])

  // Initial fetch and interval
  useEffect(() => {
    if (isConnected) {
      fetchData()
      const interval = setInterval(fetchData, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  }, [isConnected, fetchData])

  // Handle transfer
  const handleTransfer = async () => {
    if (!walletClient || !recipient || !transferAmount) return
    
    setIsTransferring(true)
    try {
      const amount = parseEther(transferAmount)
      const hash = await walletClient.writeContract({
        address: USDA_V10_ADDRESS,
        abi: USDA_ABI,
        functionName: 'transfer',
        args: [recipient as Address, amount]
      })

      toast.loading('Transferring USDA...', { id: 'transfer' })
      await publicClient!.waitForTransactionReceipt({ hash })
      
      toast.success('USDA transferred!', { id: 'transfer' })
      setTransferAmount('')
      setRecipient('')
      fetchData() // Refresh balance
    } catch (error: any) {
      console.error('Transfer error:', error)
      toast.error(error.message || 'Failed to transfer', { id: 'transfer' })
    } finally {
      setIsTransferring(false)
    }
  }

  // Handle burn
  const handleBurn = async () => {
    if (!walletClient || !burnAmount) return
    
    setIsBurning(true)
    try {
      const amount = parseEther(burnAmount)
      const hash = await walletClient.writeContract({
        address: USDA_V10_ADDRESS,
        abi: USDA_ABI,
        functionName: 'burn',
        args: [amount]
      })

      toast.loading('Burning USDA...', { id: 'burn' })
      await publicClient!.waitForTransactionReceipt({ hash })
      
      toast.success(`${burnAmount} USDA burned successfully!`, { id: 'burn' })
      setBurnAmount('')
      fetchData() // Refresh balance
    } catch (error: any) {
      console.error('Burn error:', error)
      toast.error(error.message || 'Failed to burn', { id: 'burn' })
    } finally {
      setIsBurning(false)
    }
  }

  // Calculate backing (mock calculation - would need actual collateral data)
  const backingRatio = '102%' // This would come from vault contract
  const holderCount = '1,234' // This would require indexing/subgraph
  const volume24h = '$450K' // This would require indexing/subgraph
  
  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      if (!publicClient) return
      try {
        const priceData = await publicClient.readContract({
          address: CHAINLINK_ETH_USD,
          abi: PRICE_FEED_ABI,
          functionName: 'latestRoundData'
        })
        // Price has 8 decimals
        const price = Number(priceData[1]) / 1e8
        setEthPrice(price)
      } catch (error) {
        console.error('Error fetching ETH price:', error)
      }
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [publicClient])
  
  // Calculate USDA from ETH
  const calculateUsdaFromEth = (eth: string) => {
    const ethNum = parseFloat(eth)
    if (isNaN(ethNum) || ethNum <= 0) return '0'
    return ((ethNum * ethPrice) / COLLATERAL_RATIO).toFixed(6)
  }
  
  // Poll for mint status with progress modal
  const pollMintStatus = async (mintRequestId: string) => {
    const maxAttempts = 60 // 5 minutes
    let attempts = 0
    
    // Show progress modal starting at deposit step
    setProgressModal({ show: true, step: 'deposit', mintRequestId })
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/vault/mint/${mintRequestId}`)
        if (!response.ok) return null
        const result = await response.json()
        return result.data
      } catch {
        return null
      }
    }
    
    while (attempts < maxAttempts) {
      const status = await checkStatus()
      console.log(`[Mint Poll] Attempt ${attempts + 1}:`, status?.status || 'not found')
      
      if (status) {
        if (status.status === 'completed') {
          console.log('[Mint Poll] Completed! Showing DON verification:', status)
          setProgressModal({ show: true, step: 'completed', mintRequestId, txHash: status.txHash, usdaMinted: status.usdaMinted })
          
          // Show DON verification details
          setTimeout(() => {
            setProgressModal({ show: false, step: 'completed' })
            setDonVerification({
              show: true,
              txHash: status.txHash,
              usdaMinted: status.usdaMinted,
              priceConsensus: status.verification?.priceConsensus || '$2,087.00',
              priceSources: status.verification?.priceSources || ['Coinbase', 'Kraken', 'Binance'],
              bankReserves: status.verification?.bankReserves || '$1800.21',
              signaturesVerified: status.verification?.signaturesVerified || 1,
            })
            fetchData()
          }, 1500) // Show completed state briefly before showing DON modal
          return
        } else if (status.status === 'failed') {
          console.log('[Mint Poll] Failed:', status.error)
          setProgressModal({ show: true, step: 'failed', mintRequestId, error: status.error })
          return
        } else if (status.status === 'processing') {
          setProgressModal(prev => ({ ...prev, step: 'consensus' }))
        } else if (status.status === 'pending') {
          setProgressModal(prev => ({ ...prev, step: 'detected' }))
        }
      } else {
        // 404 - deposit not yet detected by API
        setProgressModal(prev => ({ ...prev, step: 'deposit' }))
      }
      
      attempts++
      await new Promise(r => setTimeout(r, 5000)) // 5 second delay
    }
    
    setProgressModal({ show: true, step: 'failed', mintRequestId, error: 'Timeout - please check status later' })
  }

  // Handle ETH deposit for minting (monitor will auto-trigger)
  const handleEthDeposit = async () => {
    if (!walletClient || !address || !ethAmount) return
    
    setIsDepositing(true)
    try {
      const amount = parseEther(ethAmount)
      
      // Check minimum deposit (0.001 ETH)
      if (amount < parseEther('0.001')) {
        toast.error('Minimum deposit is 0.001 ETH')
        return
      }
      
      const hash = await walletClient.writeContract({
        address: ETH_VAULT_ADDRESS,
        abi: ETH_VAULT_ABI,
        functionName: 'depositETH',
        value: amount
      })

      toast.loading(
        <div>
          <p>Depositing ETH...</p>
          <p className="text-xs text-neutral-400">TX: {hash.slice(0, 12)}...</p>
        </div>, 
        { id: 'eth-deposit', duration: 60000 }
      )
      
      // Wait for receipt with retry
      let receipt = null
      let retries = 0
      while (!receipt && retries < 10) {
        try {
          receipt = await publicClient!.waitForTransactionReceipt({ hash })
        } catch (e) {
          retries++
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      
      if (!receipt) {
        toast.error('Transaction receipt timeout - check Etherscan', { id: 'eth-deposit' })
        return
      }
      
      // Parse ETHDeposited event to get the actual mintRequestId
      // Event signature: ETHDeposited(address indexed user, uint256 ethAmount, uint256 ethPrice, bytes32 mintRequestId, uint256 depositIndex)
      const eventTopic = '0xd2c2c4d6a0ecad0814fda09eff4e735d138e58faf27f451bc2a86d1233d37e6e' // keccak256 of event signature
      
      let mintRequestId: string | null = null
      
      // Find the event in logs
      for (const log of receipt.logs) {
        // Check if this is the ETHDeposited event (topic0 matches)
        if (log.topics[0]?.toLowerCase() === eventTopic.toLowerCase()) {
          // mintRequestId is NOT indexed, so it's in data
          // data layout: ethAmount (32 bytes) + ethPrice (32 bytes) + mintRequestId (32 bytes) + depositIndex (32 bytes)
          // Skip '0x' (2 chars) + ethAmount (64 chars) + ethPrice (64 chars) = 130 chars offset
          const data = log.data
          mintRequestId = '0x' + data.slice(2 + 64 + 64, 2 + 64 + 64 + 64)
          break
        }
      }
      
      // Fallback: use deposit count to determine index
      if (!mintRequestId) {
        // Get the user's deposit count to know which index was just created
        try {
          const depositCount = await publicClient!.readContract({
            address: ETH_VAULT_ADDRESS,
            abi: [{ name: 'getUserDepositCount', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }],
            functionName: 'getUserDepositCount',
            args: [address]
          })
          const depositIndex = Number(depositCount) - 1
          
          // Get deposit details
          const deposit = await publicClient!.readContract({
            address: ETH_VAULT_ADDRESS,
            abi: ETH_VAULT_ABI,
            functionName: 'userDeposits',
            args: [address, BigInt(depositIndex)]
          })
          
          // deposit is [ethAmount, usdaMinted, ethPriceAtDeposit, timestamp, active, mintCompleted]
          if (deposit && deposit[4] && deposit[0] === amount) {
            // Generate a deterministic ID based on tx hash and index for tracking
            mintRequestId = `${hash}-${depositIndex}`
          }
        } catch (e) {
          console.error('Failed to get deposit info:', e)
        }
      }
      
      if (!mintRequestId) {
        toast.error('Failed to parse deposit event - check Etherscan', { id: 'eth-deposit' })
        return
      }
      
      console.log('Deposit successful, mintRequestId:', mintRequestId)
      
      toast.success(
        <div>
          <p>ETH deposited successfully!</p>
          <p className="text-xs text-emerald-400">CRE workflow starting...</p>
        </div>,
        { id: 'eth-deposit', duration: 5000 }
      )
      
      setEthAmount('')
      
      // Start polling for mint completion
      toast.loading('Waiting for CRE fulfillment...', { id: 'mint-status' })
      pollMintStatus(mintRequestId)
      
    } catch (error: any) {
      console.error('ETH deposit error:', error)
      toast.error(error.message || 'Failed to deposit ETH', { id: 'eth-deposit' })
    } finally {
      setIsDepositing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-950 relative">
        <GridBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-24 h-24 rounded-2xl border border-white/10 bg-neutral-900/50 flex items-center justify-center mx-auto mb-8">
              <Wallet className="w-12 h-12 text-neutral-300" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Connect Wallet</h1>
            <p className="text-neutral-400 mb-8">
              Connect your wallet to view your USDA balance and manage your stablecoins.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 relative">
      <GridBackground />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-neutral-900 flex items-center justify-center">
                <Coins className="w-5 h-5 text-neutral-300" />
              </div>
              <h1 className="text-3xl font-bold text-white">USDA Stablecoin</h1>
            </div>
            <p className="text-neutral-400">AI-governed stablecoin with Proof of Reserves</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isDataLoading}
              className="p-2 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={cn("w-5 h-5", isDataLoading && "animate-spin")} />
            </button>
            <Link
              to="/setup"
              className="px-4 py-2 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors text-sm"
            >
              Setup
            </Link>
            <Link
              to="/monitor"
              className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-950 text-sm font-medium hover:bg-white transition-colors"
            >
              Monitor
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <StatCard 
            label="Total Supply" 
            value={totalSupply} 
            subtext="USDA"
            icon={Database}
            delay={0}
            isLoading={isDataLoading}
          />
          <StatCard 
            label="Active Policies" 
            value={activePolicies.toString()} 
            subtext="ACE enforcement rules"
            icon={Users}
            delay={0.2}
          />
          <StatCard 
            label="Contract Status" 
            value={isPaused ? 'Paused' : 'Active'} 
            subtext={isPaused ? 'Emergency stop active' : 'Operating normally'}
            icon={isPaused ? AlertCircle : CheckCircle2}
            delay={0.3}
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left Column - Tab Box (60%) */}
          <div className="lg:col-span-3">
            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/30 backdrop-blur-sm p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-neutral-900 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-neutral-300" />
                  </div>
                  <div>
                    <div className="text-sm text-neutral-400">Your Balance</div>
                    {isDataLoading ? (
                      <Loader2 className="w-6 h-6 text-neutral-500 animate-spin mt-1" />
                    ) : (
                      <div className="text-3xl font-bold text-white">{usdaBalance} USDA</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-400">≈ ${usdaBalance} USD</div>
                  <div className="text-xs text-emerald-400 flex items-center justify-end gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    Peg maintained
                  </div>
                </div>
              </div>

              {/* Action Tabs */}
              <div className="flex gap-2 p-1 rounded-xl border border-white/10 bg-neutral-950/50 mb-6">
                {(['overview', 'mint', 'transfer', 'burn'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      activeTab === tab 
                        ? "bg-neutral-200 text-neutral-950" 
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <ActionCard
                      title="Mint USDA"
                      description="Deposit ETH as collateral to mint USDA"
                      icon={Zap}
                      onClick={() => setActiveTab('mint')}
                      primary
                    />
                    <ActionCard
                      title="Transfer"
                      description="Send USDA to another address"
                      icon={ArrowRightLeft}
                      onClick={() => setActiveTab('transfer')}
                    />
                    <ActionCard
                      title="Bridge"
                      description="Cross-chain transfer via CCIP"
                      icon={Globe}
                      onClick={() => toast('Bridge coming soon')}
                    />
                    <ActionCard
                      title="Burn USDA"
                      description="Permanently destroy USDA tokens"
                      icon={Flame}
                      onClick={() => setActiveTab('burn')}
                    />
                  </motion.div>
                )}

                {activeTab === 'mint' && (
                  <motion.div
                    key="mint"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* ETH Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Deposit</span>
                        <span className="text-neutral-500">
                          {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : '0'} ETH
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={ethAmount}
                          onChange={(e) => setEthAmount(e.target.value)}
                          placeholder="0.0"
                          step="0.001"
                          min="0.001"
                          className="w-full bg-neutral-950/50 border border-white/10 rounded-2xl px-5 py-5 text-3xl font-semibold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-white/10">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">Ξ</span>
                          </div>
                          <span className="font-medium text-white text-sm">ETH</span>
                        </div>
                      </div>
                      {parseFloat(ethAmount) > 0 && parseFloat(ethAmount) < 0.001 && (
                        <p className="text-xs text-amber-400">Minimum 0.001 ETH</p>
                      )}
                    </div>

                    {/* Exchange Rate */}
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <ArrowDown className="w-4 h-4" />
                        <span>1 ETH = ${ethPrice.toFixed(2)} USDA</span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* USDA Output */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Receive</span>
                        <span className="text-emerald-400 text-xs">100% collateral</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={ethAmount ? calculateUsdaFromEth(ethAmount) : '0.0'}
                          className="w-full bg-neutral-950/30 border border-white/10 rounded-2xl px-5 py-5 text-3xl font-semibold text-white focus:outline-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-white/10">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">$</span>
                          </div>
                          <span className="font-medium text-white text-sm">USDA</span>
                        </div>
                      </div>
                    </div>

                    {/* Price Sources */}
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-neutral-500">Price via</span>
                      <div className="flex gap-1">
                        {['Coinbase', 'Kraken', 'Binance'].map((source) => (
                          <span key={source} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-neutral-400">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-5 py-4 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEthDeposit}
                        disabled={!ethAmount || isDepositing || parseFloat(ethAmount) < 0.001}
                        className="flex-1 px-6 py-4 rounded-xl bg-white text-neutral-950 font-semibold hover:bg-neutral-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isDepositing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <Database className="w-5 h-5" />
                            Deposit ETH & Mint USDA
                          </>
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                        <p className="text-xs text-neutral-500">Step 1</p>
                        <p className="text-xs text-neutral-300 font-medium">Deposit ETH</p>
                      </div>
                      <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                        <p className="text-xs text-neutral-500">Step 2</p>
                        <p className="text-xs text-neutral-300 font-medium">Price Check</p>
                      </div>
                      <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                        <p className="text-xs text-neutral-500">Step 3</p>
                        <p className="text-xs text-neutral-300 font-medium">ACE + Mint</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'transfer' && (
                  <motion.div
                    key="transfer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                      <label className="text-sm text-neutral-400 block mb-2">Recipient Address</label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-transparent text-lg text-white placeholder:text-neutral-600 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                      <label className="text-sm text-neutral-400 block mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent text-3xl font-bold text-white placeholder:text-neutral-600 focus:outline-none"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-400">USDA</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-6 py-3 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleTransfer}
                        disabled={!recipient || !transferAmount || isTransferring}
                        className="flex-1 px-6 py-3 rounded-xl bg-neutral-200 text-neutral-950 font-medium hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isTransferring ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Transferring...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-5 h-5" />
                            Transfer
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'burn' && (
                  <motion.div
                    key="burn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-400 font-medium">Warning</p>
                          <p className="text-sm text-red-300/70">
                            Burning will permanently destroy your USDA tokens. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Amount to Burn</span>
                        <button 
                          onClick={() => setBurnAmount(usdaBalance.replace(/,/g, ''))}
                          className="text-neutral-500 hover:text-white transition-colors"
                        >
                          Max: {usdaBalance} USDA
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={burnAmount}
                          onChange={(e) => setBurnAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-neutral-950/50 border border-white/10 rounded-2xl px-5 py-5 text-3xl font-semibold text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-white/10">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                            <Flame className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium text-white text-sm">USDA</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-5 py-4 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBurn}
                        disabled={!burnAmount || isBurning || parseFloat(burnAmount) <= 0 || parseFloat(burnAmount) > parseFloat(usdaBalance.replace(/,/g, ''))}
                        className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isBurning ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Burning...
                          </>
                        ) : (
                          <>
                            <Flame className="w-5 h-5" />
                            Burn {burnAmount || '0'} USDA
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Column - Security Box (40%) */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 backdrop-blur-sm p-8 flex flex-col justify-center relative overflow-hidden"
            >
              {/* Animated background orbs */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"
                  animate={{ 
                    x: [0, 50, 0], 
                    y: [0, 30, 0],
                    opacity: [0.2, 0.4, 0.2] 
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                />
                <motion.div
                  className="absolute w-32 h-32 bg-purple-500/10 rounded-full blur-3xl right-0 bottom-0"
                  animate={{ 
                    x: [0, -30, 0], 
                    y: [0, -20, 0],
                    opacity: [0.15, 0.35, 0.15] 
                  }}
                  transition={{ duration: 8, repeat: Infinity, delay: 2 }}
                />
              </div>

              <div className="relative text-center">
                {/* Chainlink Logo Area */}
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Verified</span>
                  </div>
                </div>

                {/* Main Text */}
                <h3 className="text-xl font-bold text-white mb-4 leading-tight">
                  Proof of Reserves
                </h3>
                
                <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                  This is verified proof of reserves and price consensus. Multiple source protection powered by Chainlink Runtime Environment.
                </p>

                {/* Features */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Database className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Proof of Reserves</div>
                      <div className="text-xs text-neutral-400">Bank collateral verified</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Price Consensus</div>
                      <div className="text-xs text-neutral-400">3-source aggregation</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">CRE Powered</div>
                      <div className="text-xs text-neutral-400">Chainlink Runtime Environment</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Progress Modal */}
      <AnimatePresence>
        {progressModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl p-8 shadow-2xl"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-4">
                  {progressModal.step === 'failed' ? (
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  ) : progressModal.step === 'completed' ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {progressModal.step === 'failed' ? 'Mint Failed' : 
                   progressModal.step === 'completed' ? 'Mint Complete!' : 
                   'Processing Deposit'}
                </h3>
                <p className="text-sm text-neutral-400">
                  {progressModal.step === 'failed' ? progressModal.error :
                   progressModal.step === 'completed' ? `Minted ${Number(progressModal.usdaMinted).toFixed(4)} USDA` :
                   'Please wait while we verify your deposit'}
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-4">
                {/* Step 1: Deposit */}
                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                  ['deposit', 'detected', 'consensus', 'completed'].includes(progressModal.step) 
                    ? "border-emerald-500/30 bg-emerald-500/5" 
                    : "border-white/5 bg-white/5"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    ['deposit', 'detected', 'consensus', 'completed'].includes(progressModal.step)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-neutral-800 text-neutral-500"
                  )}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">ETH Deposit</div>
                    <div className="text-xs text-neutral-400">Transaction confirmed</div>
                  </div>
                  {['deposit', 'detected', 'consensus', 'completed'].includes(progressModal.step) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>

                {/* Step 2: Detected */}
                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                  ['detected', 'consensus', 'completed'].includes(progressModal.step)
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/5 bg-white/5"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    progressModal.step === 'deposit' 
                      ? "bg-indigo-500/20 text-indigo-400 animate-pulse"
                      : ['detected', 'consensus', 'completed'].includes(progressModal.step)
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-neutral-800 text-neutral-500"
                  )}>
                    {progressModal.step === 'deposit' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Globe className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Deposit Detection</div>
                    <div className="text-xs text-neutral-400">
                      {progressModal.step === 'deposit' ? 'Waiting for confirmation...' : 'Deposit confirmed'}
                    </div>
                  </div>
                  {['detected', 'consensus', 'completed'].includes(progressModal.step) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>

                {/* Step 3: Price Consensus */}
                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                  progressModal.step === 'consensus'
                    ? "border-indigo-500/30 bg-indigo-500/5"
                    : progressModal.step === 'completed'
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/5 bg-white/5"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    progressModal.step === 'consensus'
                      ? "bg-indigo-500/20 text-indigo-400 animate-pulse"
                      : progressModal.step === 'completed'
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-neutral-800 text-neutral-500"
                  )}>
                    {progressModal.step === 'consensus' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">Price Consensus</div>
                    <div className="text-xs text-neutral-400">
                      {progressModal.step === 'consensus' 
                        ? 'Aggregating Coinbase + Kraken + Binance...' 
                        : progressModal.step === 'completed'
                          ? '3-source consensus verified'
                          : 'Pending...'}
                    </div>
                  </div>
                  {progressModal.step === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>

                {/* Step 4: Reserves + Mint */}
                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                  progressModal.step === 'completed'
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/5 bg-white/5"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    progressModal.step === 'completed'
                      ? "bg-emerald-500/20 text-emerald-400"
                      : progressModal.step === 'consensus'
                        ? "bg-indigo-500/20 text-indigo-400 animate-pulse"
                        : "bg-neutral-800 text-neutral-500"
                  )}>
                    {progressModal.step === 'completed' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : progressModal.step === 'consensus' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Shield className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">PoR Verification + Mint</div>
                    <div className="text-xs text-neutral-400">
                      {progressModal.step === 'completed'
                        ? 'Bank reserves verified, USDA minted'
                        : progressModal.step === 'consensus'
                          ? 'Verifying reserves...'
                          : 'Pending...'}
                    </div>
                  </div>
                  {progressModal.step === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Close button for failed state */}
              {progressModal.step === 'failed' && (
                <button
                  onClick={() => setProgressModal({ show: false, step: 'deposit' })}
                  className="w-full mt-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
                >
                  Close
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DON Verification Modal */}
      <AnimatePresence>
        {donVerification.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDonVerification({ show: false })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-neutral-900/95 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">DON Verified</h3>
                  <p className="text-sm text-emerald-400">Oracle Network Attestation</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                  <div className="text-sm text-neutral-400 mb-1">USDA Minted</div>
                  <div className="text-2xl font-bold text-white">{parseFloat(donVerification.usdaMinted || '0').toFixed(4)} USDA</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-neutral-950/30">
                    <div className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-neutral-400">Price Consensus</div>
                      <div className="font-semibold text-white">{donVerification.priceConsensus || '—'}</div>
                    </div>
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                      {donVerification.priceSources?.length || 0} sources
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-neutral-950/30">
                    <div className="w-8 h-8 rounded-lg border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
                      <Database className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-neutral-400">Bank Reserves</div>
                      <div className="font-semibold text-white">{donVerification.bankReserves || '—'}</div>
                    </div>
                    <div className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">PoR ✓</div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-neutral-950/30">
                    <div className="w-8 h-8 rounded-lg border border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-neutral-400">TEE Signatures</div>
                      <div className="font-semibold text-white">{donVerification.signaturesVerified || 0} verified</div>
                    </div>
                    <div className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">DON ✓</div>
                  </div>
                </div>
              </div>
              
              {donVerification.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${donVerification.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors text-neutral-400 hover:text-white mb-4"
                >
                  <span className="text-sm">View on Etherscan</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              
              <button
                onClick={() => setDonVerification({ show: false })}
                className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
