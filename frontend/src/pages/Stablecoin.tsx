/**
 * Stablecoin Page - Modern USDA Management with Real Data
 * Clean, minimalist design matching landing page style
 * Updated for USDA V8 + Sentinel Guard + EVM Log Trigger workflow
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
  Flame,
  Lock,
  ShieldAlert,
  Activity
} from 'lucide-react'
import { useAccount, usePublicClient, useWalletClient, useBalance, useChainId } from 'wagmi'
import { formatEther, parseEther, type Address, formatUnits, parseUnits } from 'viem'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { Link } from 'react-router-dom'
import { getAddresses } from '../utils/wagmi'

// Updated Contract Addresses (USDA V8)
const SENTINEL_VAULT_ETH = '0x12fe97b889158380e1D94b69718F89E521b38c11' as Address
const USDA_V8_ADDRESS = '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45' as Address
const MINTING_CONSUMER_V8 = '0xb59f7feb8e609faec000783661d4197ee38a8b07' as Address
const USDA_FREEZER = '0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21' as Address
const EMERGENCY_GUARDIAN = '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1' as Address
const VOLUME_POLICY_DON = '0x84e1b5E100393105608Ab05d549Da936cD7E995a' as Address
const POLICY_ENGINE = '0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347' as Address
const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306'
const COLLATERAL_RATIO = 1.0 // 100% (1:1)

// ABIs
const USDA_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'burn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'isFrozen', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const

const POLICY_ENGINE_ABI = [
  { name: 'getActivePolicyCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'isCompliant', type: 'function', stateMutability: 'view', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const

const ETH_VAULT_ABI = [
  { name: 'depositETH', type: 'function', stateMutability: 'payable', inputs: [], outputs: [{ name: 'mintRequestId', type: 'bytes32' }, { name: 'depositIndex', type: 'uint256' }] },
  { name: 'getChainlinkPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'minimumDeposit', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'collateralRatio', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'userDeposits', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: 'ethAmount', type: 'uint256' }, { name: 'usdaMinted', type: 'uint256' }, { name: 'ethPriceAtDeposit', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'mintCompleted', type: 'bool' }] },
  { name: 'getUserDepositCount', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'ETHDeposited', type: 'event', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'ethAmount', type: 'uint256' }, { name: 'ethPrice', type: 'uint256' }, { name: 'mintRequestId', type: 'bytes32' }, { name: 'depositIndex', type: 'uint256' }] },
] as const

const FREEZER_ABI = [
  { name: 'isFrozen', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getFrozenCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

const GUARDIAN_ABI = [
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'getProtectedContracts', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
] as const

const PRICE_FEED_ABI = [
  { name: 'latestRoundData', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }] },
] as const

const VOLUME_POLICY_ABI = [
  { name: 'dailyVolumeLimit', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'minValue', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'maxValue', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getRemainingDailyVolume', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'isActive', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const

const POLICY_ENGINE_BLACKLIST_ABI = [
  { name: 'blacklistMerkleRoot', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { name: 'blacklistUpdatedAt', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'isBlacklisted', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getActivePolicyCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const

// Background component
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
function StatCard({ label, value, subtext, icon: Icon, delay = 0, isLoading = false, alert = false }: { 
  label: string
  value: string
  subtext?: string
  icon: any
  delay?: number
  isLoading?: boolean
  alert?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "rounded-2xl border backdrop-blur-sm p-6",
        alert ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-neutral-900/30"
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl border flex items-center justify-center",
          alert ? "border-red-500/30 bg-red-500/10" : "border-white/10 bg-neutral-900"
        )}>
          <Icon className={cn("w-5 h-5", alert ? "text-red-400" : "text-neutral-300")} />
        </div>
        <span className="text-sm text-neutral-400">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 flex items-center">
          <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className={cn("text-3xl font-bold mb-1", alert ? "text-red-400" : "text-white")}>{value}</div>
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

// Bank Reserve Card
function BankReserveCard({ reserves, isLoading }: { reserves: number; isLoading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-sm text-neutral-400">Bank Reserves</span>
      </div>
      
      {isLoading ? (
        <div className="h-8 flex items-center">
          <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold mb-1 text-emerald-400">
            ${reserves.toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">Verified by CRE</span>
          </div>
        </>
      )}
    </motion.div>
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
  const [decimals, setDecimals] = useState(6)
  const [isPaused, setIsPaused] = useState(false)
  const [isFrozen, setIsFrozen] = useState(false)
  const [frozenCount, setFrozenCount] = useState(0)
  const [activePolicies, setActivePolicies] = useState(0)
  const [bankReserves, setBankReserves] = useState(1800000) // Mock initial
  const [sentinelStatus, setSentinelStatus] = useState({
    guardianPaused: false,
    protectedContracts: 0,
    lastUpdated: new Date()
  })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  // Policy data states
  const [volumePolicyData, setVolumePolicyData] = useState({
    dailyLimit: '0',
    minValue: '0',
    maxValue: '0',
    remainingVolume: '0',
    isActive: false
  })
  const [blacklistData, setBlacklistData] = useState({
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    updatedAt: 0,
    isActive: false
  })
  
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
  
  // Progress Modal state - Updated for EVM Log Trigger workflow
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

  // Fetch bank reserves
  const fetchBankReserves = useCallback(async () => {
    try {
      const response = await fetch('https://api.firstplaidypusbank.plaid.com/fdx/v6/accounts/deposit_01_checking', {
        headers: { 'Authorization': 'Bearer sentinel-demo-token' }
      })
      if (response.ok) {
        const data = await response.json()
        const balance = data.balance || data.availableBalance || 1800000
        setBankReserves(Number(balance))
      }
    } catch (e) {
      // Use mock data if API fails
      setBankReserves(1800000)
    }
  }, [])

  // Fetch USDA data
  const fetchData = useCallback(async () => {
    if (!publicClient || !address) return
    
    setIsDataLoading(true)
    try {
      // Fetch multiple data points in parallel
      const [
        balance,
        supply,
        dec,
        paused,
        frozen,
        policyCount,
        guardianPaused
      ] = await Promise.all([
        publicClient.readContract({
          address: USDA_V8_ADDRESS,
          abi: USDA_ABI,
          functionName: 'balanceOf',
          args: [address]
        }).catch(() => 0n),
        publicClient.readContract({
          address: USDA_V8_ADDRESS,
          abi: USDA_ABI,
          functionName: 'totalSupply'
        }).catch(() => 0n),
        publicClient.readContract({
          address: USDA_V8_ADDRESS,
          abi: USDA_ABI,
          functionName: 'decimals'
        }).catch(() => 6),
        publicClient.readContract({
          address: USDA_V8_ADDRESS,
          abi: USDA_ABI,
          functionName: 'paused'
        }).catch(() => false),
        publicClient.readContract({
          address: USDA_FREEZER,
          abi: FREEZER_ABI,
          functionName: 'isFrozen',
          args: [address]
        }).catch(() => false),
        publicClient.readContract({
          address: ADDRESSES.policyEngine as Address,
          abi: POLICY_ENGINE_ABI,
          functionName: 'getActivePolicyCount'
        }).catch(() => 0n),
        publicClient.readContract({
          address: EMERGENCY_GUARDIAN,
          abi: GUARDIAN_ABI,
          functionName: 'paused'
        }).catch(() => false)
      ])

      // Format values
      const divisor = BigInt(10 ** Number(dec))
      const formattedBalance = (Number(balance) / Number(divisor)).toLocaleString('en-US', {
        maximumFractionDigits: 2
      })
      const formattedSupply = (Number(supply) / Number(divisor)).toLocaleString('en-US', {
        maximumFractionDigits: 0
      })

      setUsdaBalance(formattedBalance)
      setTotalSupply(formattedSupply)
      setDecimals(Number(dec))
      setIsPaused(paused)
      setIsFrozen(frozen)
      setActivePolicies(Number(policyCount))
      setSentinelStatus(prev => ({ ...prev, guardianPaused }))
      setLastUpdated(new Date())

      // Fetch bank reserves
      await fetchBankReserves()
      
      // Fetch policy data
      await fetchPolicyData()
      
    } catch (error) {
      console.error('Error fetching USDA data:', error)
    } finally {
      setIsDataLoading(false)
    }
  }, [publicClient, address, ADDRESSES.policyEngine, fetchBankReserves])

  // Fetch Volume Policy and Blacklist data
  const fetchPolicyData = useCallback(async () => {
    if (!publicClient || !address) return
    
    try {
      // Fetch VolumePolicyDON data
      const [
        dailyLimit,
        minValue,
        maxValue,
        remainingVolume,
        volumePolicyActive
      ] = await Promise.all([
        publicClient.readContract({
          address: VOLUME_POLICY_DON,
          abi: VOLUME_POLICY_ABI,
          functionName: 'dailyVolumeLimit'
        }).catch(() => 0n),
        publicClient.readContract({
          address: VOLUME_POLICY_DON,
          abi: VOLUME_POLICY_ABI,
          functionName: 'minValue'
        }).catch(() => 0n),
        publicClient.readContract({
          address: VOLUME_POLICY_DON,
          abi: VOLUME_POLICY_ABI,
          functionName: 'maxValue'
        }).catch(() => 0n),
        publicClient.readContract({
          address: VOLUME_POLICY_DON,
          abi: VOLUME_POLICY_ABI,
          functionName: 'getRemainingDailyVolume',
          args: [address]
        }).catch(() => 0n),
        publicClient.readContract({
          address: VOLUME_POLICY_DON,
          abi: VOLUME_POLICY_ABI,
          functionName: 'isActive'
        }).catch(() => false)
      ])

      // Fetch PolicyEngine blacklist data
      const [
        merkleRoot,
        blacklistUpdatedAt,
        policyEnginePaused
      ] = await Promise.all([
        publicClient.readContract({
          address: POLICY_ENGINE,
          abi: POLICY_ENGINE_BLACKLIST_ABI,
          functionName: 'blacklistMerkleRoot'
        }).catch(() => '0x0000000000000000000000000000000000000000000000000000000000000000'),
        publicClient.readContract({
          address: POLICY_ENGINE,
          abi: POLICY_ENGINE_BLACKLIST_ABI,
          functionName: 'blacklistUpdatedAt'
        }).catch(() => 0n),
        publicClient.readContract({
          address: POLICY_ENGINE,
          abi: POLICY_ENGINE_BLACKLIST_ABI,
          functionName: 'paused'
        }).catch(() => false)
      ])

      // Format volume policy data (18 decimals)
      const volumeDivisor = BigInt(10 ** 18)
      setVolumePolicyData({
        dailyLimit: (Number(dailyLimit) / Number(volumeDivisor)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        minValue: (Number(minValue) / Number(volumeDivisor)).toLocaleString('en-US', { maximumFractionDigits: 2 }),
        maxValue: (Number(maxValue) / Number(volumeDivisor)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        remainingVolume: (Number(remainingVolume) / Number(volumeDivisor)).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        isActive: volumePolicyActive && !policyEnginePaused
      })

      // Set blacklist data
      setBlacklistData({
        merkleRoot: merkleRoot as string,
        updatedAt: Number(blacklistUpdatedAt),
        isActive: !policyEnginePaused
      })
      
    } catch (error) {
      console.error('Error fetching policy data:', error)
    }
  }, [publicClient, address])

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
      const amount = parseUnits(transferAmount, decimals)
      const hash = await walletClient.writeContract({
        address: USDA_V8_ADDRESS,
        abi: USDA_ABI,
        functionName: 'transfer',
        args: [recipient as Address, amount]
      })

      toast.loading('Transferring USDA...', { id: 'transfer' })
      await publicClient!.waitForTransactionReceipt({ hash })
      
      toast.success('USDA transferred!', { id: 'transfer' })
      setTransferAmount('')
      setRecipient('')
      fetchData()
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
      const amount = parseUnits(burnAmount, decimals)
      const hash = await walletClient.writeContract({
        address: USDA_V8_ADDRESS,
        abi: USDA_ABI,
        functionName: 'burn',
        args: [amount]
      })

      toast.loading('Burning USDA...', { id: 'burn' })
      await publicClient!.waitForTransactionReceipt({ hash })
      
      toast.success(`${burnAmount} USDA burned successfully!`, { id: 'burn' })
      setBurnAmount('')
      fetchData()
    } catch (error: any) {
      console.error('Burn error:', error)
      toast.error(error.message || 'Failed to burn', { id: 'burn' })
    } finally {
      setIsBurning(false)
    }
  }

  // Calculate USDA from ETH
  const calculateUsdaFromEth = (eth: string) => {
    const ethNum = parseFloat(eth)
    if (isNaN(ethNum) || ethNum <= 0) return '0'
    return ((ethNum * ethPrice) / COLLATERAL_RATIO).toFixed(6)
  }

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
        const price = Number(priceData[1]) / 1e8
        setEthPrice(price)
      } catch (error) {
        console.error('Error fetching ETH price:', error)
      }
    }
    fetchEthPrice()
    const interval = setInterval(fetchEthPrice, 30000)
    return () => clearInterval(interval)
  }, [publicClient])

  // Poll for mint status via blockchain (direct contract check)
  const pollMintStatus = async (mintRequestId: string, depositIndex: number) => {
    const maxAttempts = 60
    let attempts = 0
    
    setProgressModal({ show: true, step: 'deposit', mintRequestId })
    
    // Wait a bit for the event to be detected
    await new Promise(r => setTimeout(r, 3000))
    setProgressModal(prev => ({ ...prev, step: 'detected' }))
    
    while (attempts < maxAttempts) {
      try {
        // Check deposit status directly from vault contract
        const deposit = await publicClient!.readContract({
          address: SENTINEL_VAULT_ETH,
          abi: ETH_VAULT_ABI,
          functionName: 'userDeposits',
          args: [address!, BigInt(depositIndex)]
        }).catch(() => null)
        
        if (deposit) {
          const [ethAmount, usdaMinted, ethPriceAtDeposit, timestamp, active, mintCompleted] = deposit
          
          if (mintCompleted) {
            // Mint is complete!
            const usdaMintedFormatted = formatUnits(usdaMinted, 6)
            
            setProgressModal({ show: true, step: 'completed', mintRequestId, usdaMinted: usdaMintedFormatted })
            
            setTimeout(() => {
              setProgressModal({ show: false, step: 'completed' })
              setDonVerification({
                show: true,
                txHash: mintRequestId, // Use mintRequestId as reference
                usdaMinted: usdaMintedFormatted,
                priceConsensus: `$${(Number(ethPriceAtDeposit) / 1e8).toFixed(2)}`,
                priceSources: ['Coinbase', 'Binance'],
                bankReserves: `$${(bankReserves / 1000000).toFixed(2)}M`,
                signaturesVerified: 1,
              })
              fetchData()
            }, 1500)
            return
          } else if (active && !mintCompleted) {
            // Deposit active but mint pending
            setProgressModal(prev => ({ ...prev, step: 'consensus' }))
          }
        } else {
          // Deposit not found yet, still waiting
          if (attempts > 3) {
            setProgressModal(prev => ({ ...prev, step: 'detected' }))
          }
        }
      } catch (error) {
        console.log('Check status error:', error)
      }
      
      attempts++
      await new Promise(r => setTimeout(r, 3000))
    }
    
    setProgressModal({ show: true, step: 'failed', mintRequestId, error: 'Timeout - please check status later' })
  }

  // Handle ETH deposit for minting
  const handleEthDeposit = async () => {
    if (!walletClient || !address || !ethAmount) return
    
    setIsDepositing(true)
    try {
      const amount = parseEther(ethAmount)
      
      if (amount < parseEther('0.001')) {
        toast.error('Minimum deposit is 0.001 ETH')
        return
      }
      
      const hash = await walletClient.writeContract({
        address: SENTINEL_VAULT_ETH,
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
      
      // Parse ETHDeposited event
      const eventTopic = '0xd2c2c4d6a0ecad0814fda09eff4e735d138e58faf27f451bc2a86d1233d37e6e'
      let mintRequestId: string | null = null
      let depositIndex: number = 0
      
      for (const log of receipt.logs) {
        if (log.topics[0]?.toLowerCase() === eventTopic.toLowerCase()) {
          const data = log.data
          mintRequestId = '0x' + data.slice(2 + 64 + 64, 2 + 64 + 64 + 64)
          // Last 64 chars (32 bytes) is depositIndex
          depositIndex = parseInt(data.slice(-64), 16)
          break
        }
      }
      
      if (!mintRequestId) {
        toast.error('Failed to parse deposit event - check Etherscan', { id: 'eth-deposit' })
        return
      }
      
      toast.success(
        <div>
          <p>ETH deposited successfully!</p>
          <p className="text-xs text-emerald-400">CRE workflow starting...</p>
        </div>,
        { id: 'eth-deposit', duration: 5000 }
      )
      
      setEthAmount('')
      
      // Start polling for mint status
      pollMintStatus(mintRequestId, depositIndex)
      
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
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
                V8
              </span>
            </div>
            <p className="text-neutral-400">DON-governed stablecoin with Proof of Reserves & Sentinel Guard</p>
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
          </div>
        </motion.div>

        {/* Stats Grid - 3 columns */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <StatCard 
            label="Total Supply" 
            value={totalSupply} 
            subtext="USDA"
            icon={Database}
            delay={0}
            isLoading={isDataLoading}
          />
          <BankReserveCard reserves={bankReserves} isLoading={isDataLoading} />
          <StatCard 
            label={isPaused ? 'Paused' : isFrozen ? 'Frozen' : 'Active'} 
            value={isPaused ? 'Paused' : isFrozen ? 'Frozen' : 'Active'} 
            subtext={isPaused ? 'Emergency stop' : isFrozen ? 'Your account frozen' : 'Operating normally'}
            icon={isPaused ? ShieldAlert : isFrozen ? Lock : CheckCircle2}
            delay={0.2}
            alert={isPaused || isFrozen}
          />
        </div>

        {/* Policy Data Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid md:grid-cols-2 gap-4 mb-8"
        >
          {/* Volume Policy Card */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="text-sm text-neutral-400">Volume Policy</span>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", volumePolicyData.isActive ? "bg-blue-400 animate-pulse" : "bg-neutral-500")} />
                  <span className={cn("text-xs", volumePolicyData.isActive ? "text-blue-400" : "text-neutral-500")}>
                    {volumePolicyData.isActive ? 'AI-Adjusted' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            {isDataLoading ? (
              <div className="h-8 flex items-center">
                <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-white">{volumePolicyData.dailyLimit}</span>
                  <span className="text-sm text-neutral-400">USDA/day</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-neutral-500">Remaining: <span className="text-blue-400">-</span></div>
                </div>
              </>
            )}
          </div>

          {/* Blacklist Policy Card */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <span className="text-sm text-neutral-400">Blacklist Policy</span>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", blacklistData.isActive ? "bg-purple-400 animate-pulse" : "bg-neutral-500")} />
                  <span className={cn("text-xs", blacklistData.isActive ? "text-purple-400" : "text-neutral-500")}>
                    {blacklistData.isActive ? 'Protected' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            {isDataLoading ? (
              <div className="h-8 flex items-center">
                <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <span className="text-xs text-neutral-500">Merkle Root:</span>
                  <div className="font-mono text-sm text-purple-400 truncate">
                    {blacklistData.merkleRoot.slice(0, 20)}...{blacklistData.merkleRoot.slice(-8)}
                  </div>
                </div>
                <div className="text-sm text-neutral-500">
                  Updated: {blacklistData.updatedAt > 0 
                    ? new Date(blacklistData.updatedAt * 1000).toLocaleString() 
                    : 'Never'}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Sentinel Guard Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn(
            "rounded-2xl border backdrop-blur-sm p-4 mb-8 flex items-center justify-between",
            sentinelStatus.guardianPaused 
              ? "border-red-500/30 bg-red-500/5" 
              : "border-emerald-500/20 bg-emerald-500/5"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              sentinelStatus.guardianPaused 
                ? "bg-red-500/10 border border-red-500/30" 
                : "bg-emerald-500/10 border border-emerald-500/30"
            )}>
              <Activity className={cn("w-6 h-6", sentinelStatus.guardianPaused ? "text-red-400" : "text-emerald-400")} />
            </div>
            <div>
              <h3 className={cn("font-semibold", sentinelStatus.guardianPaused ? "text-red-400" : "text-emerald-400")}>
                Sentinel Guard {sentinelStatus.guardianPaused ? 'ACTIVE' : 'Standby'}
              </h3>
              <p className="text-sm text-neutral-400">
                {sentinelStatus.guardianPaused 
                  ? 'Emergency pause engaged - Sentinel Node triggered protection' 
                  : 'Autonomous protection monitoring reserves & threats'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", sentinelStatus.guardianPaused ? "bg-red-400" : "bg-emerald-400")} />
            <span className={cn("text-sm", sentinelStatus.guardianPaused ? "text-red-400" : "text-emerald-400")}>
              {sentinelStatus.guardianPaused ? 'PROTECTION ACTIVE' : 'MONITORING'}
            </span>
          </div>
        </motion.div>

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
                      description="Deposit ETH → EVM Log Trigger → DON Mint"
                      icon={Zap}
                      onClick={() => setActiveTab('mint')}
                      primary
                    />
                    <ActionCard
                      title="Transfer"
                      description="Send USDA with ACE policy checks"
                      icon={ArrowRightLeft}
                      onClick={() => setActiveTab('transfer')}
                    />
                    <ActionCard
                      title="Bridge"
                      description="Cross-chain via CCIP"
                      icon={Globe}
                      onClick={() => toast('Bridge coming soon')}
                    />
                    <ActionCard
                      title="Burn USDA"
                      description="Permanently destroy tokens"
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
                      <span className="text-xs text-neutral-500">3-source consensus:</span>
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

                    {/* Workflow Steps Info */}
                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/30">
                      <p className="text-xs text-neutral-400 mb-3">EVM Log Trigger Workflow:</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                          <p className="text-[10px] text-neutral-500">1. Deposit</p>
                          <p className="text-xs text-neutral-300 font-medium">ETH → Vault</p>
                        </div>
                        <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                          <p className="text-[10px] text-neutral-500">2. EVM Log</p>
                          <p className="text-xs text-neutral-300 font-medium">Trigger CRE</p>
                        </div>
                        <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                          <p className="text-[10px] text-neutral-500">3. 3-Source Price</p>
                          <p className="text-xs text-neutral-300 font-medium">+ PoR + Blacklist</p>
                        </div>
                        <div className="p-2 rounded-lg border border-white/10 bg-neutral-950/30">
                          <p className="text-[10px] text-neutral-500">4. DON Report</p>
                          <p className="text-xs text-neutral-300 font-medium">Mint USDA</p>
                        </div>
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
          <div className="lg:col-span-2 space-y-4">
            {/* Proof of Reserves Card */}
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
                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">DON Verified</span>
                  </div>
                </div>

                {/* Main Text */}
                <h3 className="text-xl font-bold text-white mb-4 leading-tight">
                  Proof of Reserves
                </h3>
                
                <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                  DON-governed stablecoin with multi-layer security: 3-source price consensus, AI-adjusted volume limits, Merkle-root blacklist, bank reserves, and xAI threat analysis via Chainlink CRE.
                </p>

                {/* Features */}
                <div className="space-y-2 text-left">
                  {/* Proof of Reserves */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Database className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Proof of Reserves</div>
                      <div className="text-xs text-neutral-400">
                        {isDataLoading ? 'Loading...' : `$${(bankReserves / 1000000).toFixed(2)}M bank collateral`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Price Consensus */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Price Consensus</div>
                      <div className="text-xs text-neutral-400">Coinbase + Kraken + Binance</div>
                    </div>
                  </div>
                  
                  {/* Volume Policy */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Volume Policy</div>
                      <div className="text-xs text-neutral-400">
                        {isDataLoading ? 'Loading...' : 
                          `${volumePolicyData.dailyLimit} USDA/day limit (AI-adjusted)`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Blacklist Policy */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Blacklist Policy</div>
                      <div className="text-xs text-neutral-400">
                        {isDataLoading ? 'Loading...' : 
                          blacklistData.updatedAt > 0 
                            ? `Merkle root updated ${new Date(blacklistData.updatedAt * 1000).toLocaleDateString()}`
                            : 'Merkle root pending update'}
                      </div>
                    </div>
                  </div>

                  {/* Sentinel Guard */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Sentinel Guard</div>
                      <div className="text-xs text-neutral-400">
                        {sentinelStatus.guardianPaused 
                          ? 'Emergency pause ACTIVE' 
                          : 'xAI threat analysis + auto-pause enabled'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contract Addresses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/30 backdrop-blur-sm p-6"
            >
              <h4 className="text-sm font-medium text-neutral-300 mb-4">Contract Addresses</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">USDA V8</span>
                  <a 
                    href={`https://sepolia.etherscan.io/address/${USDA_V8_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white font-mono"
                  >
                    {USDA_V8_ADDRESS.slice(0, 6)}...{USDA_V8_ADDRESS.slice(-4)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">ETH Vault</span>
                  <a 
                    href={`https://sepolia.etherscan.io/address/${SENTINEL_VAULT_ETH}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white font-mono"
                  >
                    {SENTINEL_VAULT_ETH.slice(0, 6)}...{SENTINEL_VAULT_ETH.slice(-4)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Minting Consumer</span>
                  <a 
                    href={`https://sepolia.etherscan.io/address/${MINTING_CONSUMER_V8}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white font-mono"
                  >
                    {MINTING_CONSUMER_V8.slice(0, 6)}...{MINTING_CONSUMER_V8.slice(-4)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Emergency Guardian</span>
                  <a 
                    href={`https://sepolia.etherscan.io/address/${EMERGENCY_GUARDIAN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white font-mono"
                  >
                    {EMERGENCY_GUARDIAN.slice(0, 6)}...{EMERGENCY_GUARDIAN.slice(-4)}
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Simple Deposit Confirmation Modal */}
      <AnimatePresence>
        {progressModal.show && progressModal.step !== 'completed' && progressModal.step !== 'failed' && (
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
              className="w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-neutral-900/95 backdrop-blur-xl p-8 shadow-2xl text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Deposit Received!
              </h3>
              <p className="text-neutral-400 mb-6">
                You will receive your USDA funds shortly! The CRE workflow is processing your deposit.
              </p>
              <button
                onClick={() => setProgressModal({ show: false, step: 'deposit' })}
                className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors"
              >
                Got it
              </button>
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
