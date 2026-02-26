import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  ArrowLeft, 
  Lock, 
  Unlock,
  FileCode,
  Activity,
  History,
  BarChart3,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Pause,
  Play,
  Zap,
  Clock,
  Wallet,
  CheckCircle,
  Copy,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Terminal,
  Settings,
  Eye,
  X,
  Code,
  FunctionSquare,
  FileText,
  Loader2,
  Radar,
  Radio,
  Wifi,
  Server,
  Globe,
  ShieldAlert,
  Fingerprint,
  ScanLine,
  Layers,
  Cpu,
  Database,
  Bell,
  Flame,
  Bug,
  Skull,
  Siren,
  Target,
  Crosshair,
  LockKeyhole,
  Ban,
  Filter,
  Webhook,
  CircuitBoard,
  HardDrive,
  ActivitySquare,
  Timer,
  Sparkles,
} from 'lucide-react'
import { useAccount, useNetwork, useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi'
import { formatEther, getAddress } from 'viem'
import { toast } from 'react-hot-toast'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'
import { getAddresses } from '../utils/wagmi'
import { useSentinelMonitor, SentinelEvent } from '../hooks/useSentinelMonitor'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface LogEntry {
  id: string
  timestamp: number
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR'
  message: string
  txHash?: string
}

interface ContractFunction {
  name: string
  signature: string
  selector: string
  stateMutability: string
  inputs: Array<{name: string, type: string}>
  outputs: Array<{name: string, type: string}>
}

interface SourceFile {
  name: string
  path: string
  content: string
}

interface ContractDetails {
  address: string
  name: string
  isPaused: boolean
  compilerVersion: string
  optimizationUsed: boolean
  runs: number
  evmVersion: string
  license: string
  functions: ContractFunction[]
  abi: any[]
  fileCount: number
}

interface TokenBalance {
  symbol: string
  balance: string
  balanceRaw: string
}

interface OracleHealth {
  address: string
  name: string
  isHealthy: boolean
  lastChecked: number
  ethBalance: string
  tokens: TokenBalance[]
  warnings: string[]
  errors: string[]
  metadata?: {
    lastHeartbeat?: number
    dataFreshness?: number
    responseTimeMs?: number
    roundId?: string
    answer?: string
    answeredInRound?: string
  }
}

interface FirewallRule {
  id: string
  name: string
  type: 'block' | 'allow' | 'monitor'
  condition: string
  status: 'active' | 'inactive'
  hits: number
  lastTriggered?: number
}

// Animated pulse ring component
const PulseRing = ({ color = 'emerald', size = 120 }: { color?: string, size?: number }) => {
  const colorClasses: Record<string, string> = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    neutral: 'border-neutral-300/30 bg-neutral-300/5',
    red: 'border-red-500/30 bg-red-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  }
  
  return (
    <div className="relative flex items-center justify-center">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full border ${colorClasses[color]}`}
          style={{ width: size + i * 40, height: size + i * 40 }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// Security Score Ring
const SecurityScoreRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  
  return (
    <div className="relative w-32 h-32">
      <svg className="transform -rotate-90 w-32 h-32">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-neutral-800"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="45"
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-neutral-500">Score</span>
      </div>
    </div>
  )
}

// Status Badge Component
const StatusBadge = ({ isPaused }: { isPaused: boolean }) => (
  <motion.div 
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border ${
      isPaused 
        ? 'bg-red-500/10 text-red-400 border-red-500/30' 
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    }`}
  >
    <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
    {isPaused ? 'EMERGENCY STOP' : 'PROTECTED'}
  </motion.div>
)

// Metric Card with holographic effect
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'blue',
  onClick
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'neutral' | 'red' | 'emerald' | 'purple' | 'cyan'
  onClick?: () => void
}) => {
  const colors = {
    blue: 'from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 text-blue-400',
    neutral: 'from-neutral-300/20 via-neutral-300/10 to-transparent border-neutral-300/30 text-neutral-200',
    red: 'from-red-500/20 via-red-500/10 to-transparent border-red-500/30 text-red-400',
    emerald: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30 text-purple-400',
    cyan: 'from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/30 text-cyan-400',
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colors[color]} border p-4 cursor-pointer group ${onClick ? 'hover:shadow-lg hover:shadow-${color}-500/10' : ''}`}
    >
      {/* Holographic shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
          </div>
          {trend && (
            <div className={`text-xs ${
              trend === 'up' ? 'text-emerald-400' : 
              trend === 'down' ? 'text-red-400' : 'text-neutral-400'
            }`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '→'}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{title}</div>
        {subtitle && (
          <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>
        )}
      </div>
    </motion.div>
  )
}

// Threat Level Indicator
const ThreatLevelIndicator = ({ level }: { level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' }) => {
  const config = {
    CRITICAL: { color: 'red', icon: Skull, text: 'CRITICAL THREAT' },
    HIGH: { color: 'red', icon: Siren, text: 'HIGH THREAT' },
    MEDIUM: { color: 'neutral', icon: AlertTriangle, text: 'MEDIUM RISK' },
    LOW: { color: 'blue', icon: Shield, text: 'LOW RISK' },
    SAFE: { color: 'emerald', icon: ShieldCheck, text: 'SECURE' },
  }
  
  const { color, icon: Icon, text } = config[level]
  
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-${color}-500/10 border border-${color}-500/30`}>
      <Icon className={`w-6 h-6 text-${color}-400`} />
      <div>
        <div className={`text-sm font-bold text-${color}-400`}>{text}</div>
        <div className="text-xs text-neutral-500">Real-time monitoring active</div>
      </div>
    </div>
  )
}

// Firewall Rule Card (placeholder for future)
const FirewallRuleCard = ({ rule }: { rule: FirewallRule }) => {
  const typeColors = {
    block: 'text-red-400 bg-red-500/10 border-red-500/30',
    allow: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    monitor: 'text-neutral-200 bg-neutral-300/10 border-neutral-300/30',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
    >
      <div className={`p-2 rounded-lg ${typeColors[rule.type]}`}>
        {rule.type === 'block' && <Ban className="w-4 h-4" />}
        {rule.type === 'allow' && <CheckCircle className="w-4 h-4" />}
        {rule.type === 'monitor' && <Eye className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{rule.name}</div>
        <div className="text-xs text-neutral-500 truncate">{rule.condition}</div>
      </div>
      <div className="text-right">
        <div className={`text-xs font-medium ${rule.status === 'active' ? 'text-emerald-400' : 'text-neutral-500'}`}>
          {rule.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
        </div>
        <div className="text-xs text-neutral-600">{rule.hits} hits</div>
      </div>
    </motion.div>
  )
}

export default function ContractDetails() {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const { isConnected, address: walletAddress } = useAccount()
  const { chain } = useNetwork()
  const addresses = getAddresses(chain?.id)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'logs' | 'settings' | 'code' | 'functions'>('overview')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isCopied, setIsCopied] = useState(false)
  const [showConfirmDeregister, setShowConfirmDeregister] = useState(false)
  
  // Contract source data from API
  const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null)
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  
  // Oracle health data from API
  const [oracleHealth, setOracleHealth] = useState<OracleHealth[]>([])
  const [isLoadingOracles, setIsLoadingOracles] = useState(false)
  const [oracleError, setOracleError] = useState<string | null>(null)
  
  // Firewall rules (placeholder for future)
  const [firewallRules] = useState<FirewallRule[]>([
    { id: '1', name: 'Flash Loan Protection', type: 'block', condition: 'msg.sender == tx.origin', status: 'active', hits: 0 },
    { id: '2', name: 'Reentrancy Guard', type: 'block', condition: 'reentrancy.guard', status: 'active', hits: 0 },
    { id: '3', name: 'Large Transfer Monitor', type: 'monitor', condition: 'value > 100 ETH', status: 'active', hits: 2 },
  ])
  
  const { events, monitoredContracts } = useSentinelMonitor(addresses.registry, addresses.guardian)
  
  const validAddress = address && address.startsWith('0x') && address.length === 42
  const checksumAddress = validAddress ? getAddress(address) : null
  
  const contract = monitoredContracts.find(c => 
    c.address.toLowerCase() === address?.toLowerCase()
  )
  
  const contractEvents = events.filter(e => 
    e.contractAddress.toLowerCase() === address?.toLowerCase()
  )
  
  // Contract reads
  const { data: registration } = useContractRead({
    address: addresses.registry,
    abi: [
      {
        inputs: [{ name: 'contractAddr', type: 'address' }],
        name: 'getRegistration',
        outputs: [{ 
          name: '', 
          type: 'tuple',
          components: [
            { name: 'isActive', type: 'bool' },
            { name: 'stakedAmount', type: 'uint256' },
            { name: 'registeredAt', type: 'uint256' },
            { name: 'owner', type: 'address' },
            { name: 'metadata', type: 'string' }
          ]
        }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'getRegistration',
    args: checksumAddress ? [checksumAddress as `0x${string}`] : undefined,
    enabled: !!checksumAddress,
  }) as { data: { isActive: boolean; stakedAmount: bigint; registeredAt: bigint; owner: string; metadata: string } | undefined }

  const { data: isPaused } = useContractRead({
    address: (checksumAddress as `0x${string}`) || undefined,
    abi: [{ inputs: [], name: 'paused', outputs: [{ name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }],
    functionName: 'paused',
    enabled: !!checksumAddress,
  })

  const { config: pauseConfig } = usePrepareContractWrite({
    address: (checksumAddress as `0x${string}`) || undefined,
    abi: [{ inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' }],
    functionName: 'pause',
    enabled: !!checksumAddress && isConnected,
  })

  const { write: pause, data: pauseTx } = useContractWrite(pauseConfig)
  const { isLoading: isPausePending } = useWaitForTransaction({
    hash: pauseTx?.hash,
    onSuccess: () => toast.success('Contract paused'),
  })

  const { config: unpauseConfig } = usePrepareContractWrite({
    address: (checksumAddress as `0x${string}`) || undefined,
    abi: [{ inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' }],
    functionName: 'unpause',
    enabled: !!checksumAddress && isConnected,
  })

  const { write: unpause, data: unpauseTx } = useContractWrite(unpauseConfig)
  const { isLoading: isUnpausePending } = useWaitForTransaction({
    hash: unpauseTx?.hash,
    onSuccess: () => toast.success('Contract unpaused'),
  })

  const { config: deregisterConfig } = usePrepareContractWrite({
    address: addresses.registry,
    abi: [{ inputs: [{ name: 'contractAddr', type: 'address' }], name: 'deregister', outputs: [], stateMutability: 'nonpayable', type: 'function' }],
    functionName: 'deregister',
    args: checksumAddress ? [checksumAddress as `0x${string}`] : undefined,
    enabled: !!checksumAddress && isConnected,
  })

  const { write: deregister, data: deregisterTx } = useContractWrite(deregisterConfig)
  const { isLoading: isDeregisterPending } = useWaitForTransaction({
    hash: deregisterTx?.hash,
    onSuccess: () => {
      toast.success('Contract deregistered')
      navigate('/monitor')
    },
  })

  const addLog = useCallback((level: LogEntry['level'], message: string, txHash?: string) => {
    setLogs(prev => [{ id: `log-${Date.now()}`, timestamp: Date.now(), level, message, txHash }, ...prev].slice(0, 100))
  }, [])

  // Fetch contract source code from Sentinel Node API
  useEffect(() => {
    if (!address) return
    
    const fetchContractDetails = async () => {
      setIsLoadingCode(true)
      setCodeError(null)
      
      try {
        // Fetch contract details
        const detailsRes = await fetch(`http://localhost:9001/contracts/${address.toLowerCase()}`)
        if (!detailsRes.ok) {
          if (detailsRes.status === 404) {
            setCodeError('Contract not found in registry. Register it via the Sentinel Node first.')
            setIsLoadingCode(false)
            return
          }
          throw new Error('Failed to fetch contract details')
        }
        
        const detailsData = await detailsRes.json()
        if (detailsData.success) {
          setContractDetails(detailsData.data)
        }
        
        // Fetch source files
        const sourcesRes = await fetch(`http://localhost:9001/contracts/${address.toLowerCase()}/sources`)
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json()
          if (sourcesData.success && sourcesData.data.length > 0) {
            setSourceFiles(sourcesData.data)
            setSelectedFile(sourcesData.data[0].name)
          }
        }
      } catch (error) {
        console.error('Error fetching contract details:', error)
        setCodeError('Failed to load contract source code')
      } finally {
        setIsLoadingCode(false)
      }
    }
    
    fetchContractDetails()
  }, [address])

  useEffect(() => {
    const stored = localStorage.getItem(`sentinel_logs_${address?.toLowerCase()}`)
    if (stored) setLogs(JSON.parse(stored))
  }, [address])

  useEffect(() => {
    if (logs.length > 0 && address) {
      localStorage.setItem(`sentinel_logs_${address.toLowerCase()}`, JSON.stringify(logs))
    }
  }, [logs, address])

  // Fetch oracle health data periodically
  useEffect(() => {
    const fetchOracleHealth = async () => {
      setIsLoadingOracles(true)
      setOracleError(null)
      
      try {
        const res = await fetch('http://localhost:9001/oracles')
        if (!res.ok) throw new Error('Failed to fetch oracle health')
        
        const data = await res.json()
        if (data.success) {
          setOracleHealth(data.data)
        }
      } catch (error) {
        console.error('Error fetching oracle health:', error)
        setOracleError('Failed to load oracle health data')
      } finally {
        setIsLoadingOracles(false)
      }
    }
    
    // Fetch immediately
    fetchOracleHealth()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchOracleHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast.success('Copied to clipboard')
    }
  }

  const threatCount = contractEvents.filter(e => e.level === 'CRITICAL' || e.level === 'HIGH').length
  const pauseCount = contractEvents.filter(e => e.action === 'PAUSED').length
  const isOwner = registration?.owner?.toLowerCase() === walletAddress?.toLowerCase()
  const riskScore = contract?.riskScore || 0
  
  // Determine threat level
  const getThreatLevel = (): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE' => {
    if (threatCount > 5 || riskScore > 80) return 'CRITICAL'
    if (threatCount > 2 || riskScore > 60) return 'HIGH'
    if (threatCount > 0 || riskScore > 40) return 'MEDIUM'
    if (riskScore > 20) return 'LOW'
    return 'SAFE'
  }
  
  const threatLevel = getThreatLevel()
  const securityScore = Math.max(0, 100 - riskScore - threatCount * 10)

  const eventsByDay = contractEvents.reduce((acc, event) => {
    const day = new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const lineChartData = {
    labels: Object.keys(eventsByDay).slice(-7),
    datasets: [{
      label: 'Security Events',
      data: Object.values(eventsByDay).slice(-7),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  }

  const threatDistribution = {
    labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
    datasets: [{
      data: [
        contractEvents.filter(e => e.level === 'CRITICAL').length,
        contractEvents.filter(e => e.level === 'HIGH').length,
        contractEvents.filter(e => e.level === 'MEDIUM').length,
        contractEvents.filter(e => e.level === 'LOW').length,
        contractEvents.filter(e => e.level === 'INFO').length,
      ],
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'],
      borderWidth: 0,
    }],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { 
          color: '#94a3b8', 
          font: { size: 12 },
          padding: 20,
          usePointStyle: true,
        },
      },
    },
  }

  if (!validAddress) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Address</h1>
          <p className="text-neutral-400 mb-6">The contract address provided is not valid.</p>
          <Link to="/monitor" className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-300/20 text-neutral-200 rounded-xl border border-neutral-300/30 hover:bg-neutral-300/30 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back to Monitor
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/monitor" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-neutral-400" />
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-gradient-to-br from-neutral-300/20 to-neutral-500/20 rounded-xl flex items-center justify-center border border-neutral-300/30">
                  <FileCode className="w-5 h-5 text-neutral-200" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-white truncate">
                    {contract?.name || 'Contract Details'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-neutral-400 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</code>
                    <button onClick={copyAddress} className="p-1 hover:bg-white/10 rounded transition-colors">
                      {isCopied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                    </button>
                    <a 
                      href={`https://${chain?.id === 11155111 ? 'sepolia.' : ''}etherscan.io/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <StatusBadge isPaused={!!isPaused} />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex overflow-x-auto">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Shield} label="Overview" />
              <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={BarChart3} label="Analytics" />
              <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')} icon={Code} label="Source" />
              <TabButton active={activeTab === 'functions'} onClick={() => setActiveTab('functions')} icon={FunctionSquare} label="Functions" />
              <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={Terminal} label="Logs" />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Overview Tab - New Security Dashboard Design */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Hero Security Status Section */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-white/10 p-8">
                {/* Background effects */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-300/10 via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col lg:flex-row items-center gap-8">
                  {/* Shield Visualization */}
                  <div className="relative">
                    <PulseRing color={securityScore >= 80 ? 'emerald' : securityScore >= 50 ? 'neutral' : 'red'} size={140} />
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <SecurityScoreRing score={securityScore} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {securityScore >= 80 ? (
                          <ShieldCheck className="w-12 h-12 text-emerald-400" />
                        ) : securityScore >= 50 ? (
                          <ShieldAlert className="w-12 h-12 text-neutral-200" />
                        ) : (
                          <ShieldAlert className="w-12 h-12 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Info */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                        Guardian Active
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        Live Monitoring
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {securityScore >= 80 ? 'Contract Secure' : securityScore >= 50 ? 'Contract Protected' : 'High Risk Detected'}
                    </h2>
                    <p className="text-neutral-400 mb-4">
                      Sentinel Guardian is actively monitoring this contract 24/7. 
                      {threatCount > 0 ? ` ${threatCount} threats detected and neutralized.` : ' No threats detected.'}
                    </p>
                    
                    {/* Quick Stats Row */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400">Protected for {Math.floor((Date.now() - (registration?.registeredAt ? Number(registration.registeredAt) * 1000 : Date.now())) / (1000 * 60 * 60 * 24))} days</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Fingerprint className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400">{contractEvents.length} transactions scanned</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Ban className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400">{pauseCount} attacks blocked</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Emergency Actions */}
                  <div className="flex flex-col gap-3">
                    {isPaused ? (
                      <button
                        onClick={() => unpause?.()}
                        disabled={!isConnected || isUnpausePending || !isOwner}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                      >
                        <Play className="w-5 h-5" />
                        {isUnpausePending ? 'Resuming...' : 'Resume Contract'}
                      </button>
                    ) : (
                      <button
                        onClick={() => pause?.()}
                        disabled={!isConnected || isPausePending || !isOwner}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                      >
                        <Siren className="w-5 h-5" />
                        {isPausePending ? 'Stopping...' : 'Emergency Stop'}
                      </button>
                    )}
                    
                    <Link
                      to={`/visualizer?contract=${address}`}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl font-medium transition-all border border-white/10"
                    >
                      <ScanLine className="w-5 h-5" />
                      Threat Visualizer
                    </Link>
                  </div>
                </div>
              </div>

              {/* Threat Level Indicator */}
              <ThreatLevelIndicator level={threatLevel} />

              {/* Security Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                  title="Threats Blocked" 
                  value={pauseCount} 
                  subtitle="This month"
                  icon={Bug}
                  color="red"
                />
                <MetricCard 
                  title="Security Score" 
                  value={`${securityScore}/100`} 
                  subtitle={securityScore >= 80 ? 'Excellent' : securityScore >= 50 ? 'Good' : 'Needs Attention'}
                  icon={Target}
                  color={securityScore >= 80 ? 'emerald' : securityScore >= 50 ? 'neutral' : 'red'}
                />
                <MetricCard 
                  title="Events Scanned" 
                  value={contractEvents.length} 
                  subtitle="Total transactions"
                  icon={ScanLine}
                  color="blue"
                />
                <MetricCard 
                  title="Response Time" 
                  value="<2s" 
                  subtitle="Average"
                  icon={Timer}
                  color="cyan"
                />
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Oracle Health & Infrastructure */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Oracle Health Section */}
                  <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                          <Database className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Oracle Infrastructure</h3>
                          <p className="text-sm text-neutral-500">Chainlink price feed health monitoring</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLoadingOracles && <Loader2 className="w-4 h-4 text-neutral-200 animate-spin" />}
                        <span className="text-xs text-neutral-500 px-2 py-1 rounded-full bg-white/5">
                          {oracleHealth.filter(o => o.isHealthy).length}/{oracleHealth.length} Healthy
                        </span>
                      </div>
                    </div>
                    
                    {oracleError ? (
                      <div className="text-sm text-red-400">{oracleError}</div>
                    ) : oracleHealth.length === 0 ? (
                      <div className="text-sm text-neutral-500">No oracle health data available</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {oracleHealth.map((oracle) => {
                          const linkToken = oracle.tokens.find(t => t.symbol === 'LINK')
                          const hasWarnings = oracle.warnings.length > 0
                          const hasErrors = oracle.errors.length > 0
                          
                          return (
                            <motion.div
                              key={oracle.address}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-xl border ${
                                hasErrors 
                                  ? 'bg-red-500/5 border-red-500/20' 
                                  : hasWarnings 
                                    ? 'bg-neutral-300/5 border-neutral-300/20' 
                                    : 'bg-emerald-500/5 border-emerald-500/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-sm text-white">{oracle.name}</span>
                                <div className={`w-2 h-2 rounded-full ${
                                  hasErrors ? 'bg-red-400' : hasWarnings ? 'bg-neutral-200' : 'bg-emerald-400'
                                }`} />
                              </div>
                              
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500 flex items-center gap-1">
                                    <Wallet className="w-3 h-3" /> ETH
                                  </span>
                                  <span className={parseFloat(oracle.ethBalance) < 0.01 ? 'text-neutral-200 font-medium' : 'text-neutral-300'}>
                                    {parseFloat(oracle.ethBalance).toFixed(4)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-neutral-500 flex items-center gap-1">
                                    <Database className="w-3 h-3" /> LINK
                                  </span>
                                  <span className={!linkToken || parseFloat(linkToken.balance) < 1 ? 'text-neutral-200 font-medium' : 'text-neutral-300'}>
                                    {linkToken ? parseFloat(linkToken.balance).toFixed(2) : '0'}
                                  </span>
                                </div>
                                {oracle.metadata?.dataFreshness !== undefined && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Age
                                    </span>
                                    <span className={oracle.metadata.dataFreshness > 3600 ? 'text-neutral-200 font-medium' : 'text-neutral-300'}>
                                      {Math.floor(oracle.metadata.dataFreshness / 60)}m
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {oracle.warnings.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-white/5">
                                  <p className="text-xs text-neutral-200 truncate" title={oracle.warnings[0]}>
                                    ⚠️ {oracle.warnings[0]}
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
                          <ActivitySquare className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                          <p className="text-sm text-neutral-500">Latest security events</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('logs')}
                        className="text-xs text-neutral-200 hover:text-neutral-300 transition-colors"
                      >
                        View All →
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {contractEvents.slice(0, 5).map((event, idx) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            event.level === 'CRITICAL' ? 'bg-red-500/20' :
                            event.level === 'HIGH' ? 'bg-neutral-500/20' :
                            event.level === 'MEDIUM' ? 'bg-neutral-300/20' :
                            'bg-emerald-500/20'
                          }`}>
                            {event.level === 'CRITICAL' ? <Skull className="w-4 h-4 text-red-400" /> :
                             event.level === 'HIGH' ? <Siren className="w-4 h-4 text-neutral-400" /> :
                             event.level === 'MEDIUM' ? <AlertTriangle className="w-4 h-4 text-neutral-200" /> :
                             <CheckCircle className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                event.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                event.level === 'HIGH' ? 'bg-neutral-500/20 text-neutral-400' :
                                event.level === 'MEDIUM' ? 'bg-neutral-300/20 text-neutral-200' :
                                'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {event.level}
                              </span>
                              <span className="text-xs text-neutral-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-300 truncate">{event.details}</p>
                          </div>
                        </motion.div>
                      ))}
                      
                      {contractEvents.length === 0 && (
                        <div className="text-center py-8 text-neutral-500">
                          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No security events yet</p>
                          <p className="text-xs mt-1">Your contract is safe and secure</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Firewall & Protection */}
                <div className="space-y-6">
                  {/* Firewall Rules */}
                  <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-neutral-300/10 border border-neutral-300/30">
                        <Filter className="w-5 h-5 text-neutral-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Firewall Rules</h3>
                        <p className="text-sm text-neutral-500">Active protection rules</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {firewallRules.map((rule) => (
                        <FirewallRuleCard key={rule.id} rule={rule} />
                      ))}
                    </div>
                    
                    <button className="w-full mt-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-sm font-medium transition-colors border border-white/10 border-dashed">
                      + Add Custom Rule
                    </button>
                  </div>

                  {/* Guardian Info */}
                  <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Guardian Status</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Status</span>
                        <span className="text-emerald-400 font-medium">Active</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Node ID</span>
                        <code className="text-neutral-300 font-mono text-xs">sentinel-01</code>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Auto-Pause</span>
                        <span className="text-emerald-400 font-medium">Enabled</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Monitoring</span>
                        <span className="text-emerald-400 font-medium">24/7</span>
                      </div>
                    </div>
                  </div>

                  {/* Registration Info */}
                  {registration && (
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                          <LockKeyhole className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Registration</h3>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Owner</span>
                          <code className="text-neutral-300 font-mono text-xs">
                            {registration.owner?.slice(0, 6)}...{registration.owner?.slice(-4)}
                          </code>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Stake</span>
                          <span className="text-neutral-200 font-medium">
                            {formatEther(registration.stakedAmount || 0n)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Registered</span>
                          <span className="text-neutral-300">
                            {new Date(Number(registration.registeredAt) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Other tabs remain the same... */}
          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6">Events Over Time</h3>
                <div className="h-80">
                  <Line data={lineChartData} options={chartOptions} />
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6">Threat Distribution</h3>
                <div className="h-80 flex items-center justify-center">
                  <Doughnut data={threatDistribution} options={doughnutOptions} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Source Code Tab */}
          {activeTab === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-[calc(100vh-220px)]"
            >
              {isLoadingCode ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-neutral-200 animate-spin" />
                  <span className="ml-3 text-neutral-400">Loading source code...</span>
                </div>
              ) : codeError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Source Code Unavailable</h3>
                  <p className="text-neutral-400">{codeError}</p>
                </div>
              ) : sourceFiles.length > 0 ? (
                <div className="flex h-full gap-4">
                  {/* File Tree */}
                  <div className="w-64 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/10">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        Files ({sourceFiles.length})
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {sourceFiles.map((file) => (
                        <button
                          key={file.name}
                          onClick={() => setSelectedFile(file.name)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedFile === file.name
                              ? 'bg-neutral-300/20 text-neutral-200'
                              : 'text-neutral-400 hover:bg-white/5'
                          }`}
                        >
                          <div className="truncate">{file.name}</div>
                        </button>
                      ))}
                    </div>
                    {contractDetails && (
                      <div className="p-4 border-t border-white/10 text-xs text-neutral-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Solidity</span>
                          <span>{contractDetails.compilerVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Optimized</span>
                          <span>{contractDetails.optimizationUsed ? `Yes (${contractDetails.runs} runs)` : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>EVM</span>
                          <span>{contractDetails.evmVersion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Code Viewer */}
                  <div className="flex-1 bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                      <code className="text-sm text-neutral-200 font-mono">{selectedFile}</code>
                      <button
                        onClick={() => {
                          const file = sourceFiles.find(f => f.name === selectedFile)
                          if (file) {
                            navigator.clipboard.writeText(file.content)
                            toast.success('Code copied to clipboard')
                          }
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <pre className="text-sm font-mono text-neutral-300 whitespace-pre">
                        {sourceFiles.find(f => f.name === selectedFile)?.content}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                  <FileCode className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-400 mb-2">No Source Code Available</h3>
                  <p className="text-neutral-500">This contract doesn&apos;t have verified source code in the registry.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Functions Tab */}
          {activeTab === 'functions' && (
            <motion.div
              key="functions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {isLoadingCode ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-neutral-200 animate-spin" />
                  <span className="ml-3 text-neutral-400">Loading functions...</span>
                </div>
              ) : contractDetails?.functions && contractDetails.functions.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <h3 className="text-lg font-semibold mb-2">Contract Functions</h3>
                    <p className="text-sm text-neutral-400">
                      {contractDetails.functions.length} functions extracted from ABI
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {contractDetails.functions.map((func, idx) => (
                      <motion.div
                        key={`${func.name}-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                func.stateMutability === 'view' || func.stateMutability === 'pure'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : func.stateMutability === 'payable'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-neutral-300/20 text-neutral-200'
                              }`}>
                                {func.stateMutability}
                              </span>
                              <code className="text-neutral-200 font-mono font-medium">{func.name}</code>
                            </div>
                            <code className="text-sm text-neutral-400 font-mono block mb-2">
                              {func.signature}
                            </code>
                            {func.inputs.length > 0 && (
                              <div className="text-xs text-neutral-500 mt-2">
                                Inputs: {func.inputs.map(i => `${i.type} ${i.name}`).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <code className="text-xs text-neutral-500 font-mono bg-neutral-800 px-2 py-1 rounded">
                              {func.selector}
                            </code>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                  <FunctionSquare className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-400 mb-2">No Functions Available</h3>
                  <p className="text-neutral-500">ABI functions not loaded. Register the contract in Sentinel Node to view functions.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  Activity Logs
                </h3>
                {logs.length > 0 && (
                  <button
                    onClick={() => {
                      setLogs([])
                      localStorage.removeItem(`sentinel_logs_${address?.toLowerCase()}`)
                      toast.success('Logs cleared')
                    }}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-2 h-2 rounded-full ${
                        log.level === 'CRITICAL' ? 'bg-red-400' :
                        log.level === 'WARNING' ? 'bg-yellow-400' :
                        log.level === 'ERROR' ? 'bg-red-400' :
                        'bg-emerald-400'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            log.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            log.level === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                            log.level === 'ERROR' ? 'bg-red-400/20 text-red-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {log.level}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-200">{log.message}</p>
                        {log.txHash && (
                          <a
                            href={`https://${chain?.id === 11155111 ? 'sepolia.' : ''}etherscan.io/tx/${log.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-neutral-200 hover:text-neutral-300 mt-2"
                          >
                            View Transaction <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="p-12 text-center text-neutral-500">
                    <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No logs recorded</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl"
            >
              <div className="space-y-6">
                {/* Deregister */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-400 mb-1">Deregister Contract</h3>
                      <p className="text-sm text-neutral-400 mb-4">
                        Remove this contract from Sentinel protection. Your staked ETH will be returned to your wallet.
                      </p>
                      
                      {!showConfirmDeregister ? (
                        <button
                          onClick={() => setShowConfirmDeregister(true)}
                          disabled={!isConnected || !isOwner}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-all disabled:opacity-50 text-sm font-medium"
                        >
                          Initiate Deregistration
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl">
                          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-red-400 mb-2">Are you sure? This action cannot be undone.</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => deregister?.()}
                                disabled={isDeregisterPending}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {isDeregisterPending ? 'Processing...' : 'Yes, Deregister'}
                              </button>
                              <button
                                onClick={() => setShowConfirmDeregister(false)}
                                className="px-4 py-2 bg-white/10 text-neutral-300 rounded-lg text-sm hover:bg-white/20 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-neutral-400 mb-4">Contract Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-neutral-500">Address</span>
                      <code className="text-sm font-mono text-neutral-300">{address}</code>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-neutral-500">Network</span>
                      <span className="text-sm text-neutral-300">{chain?.name || 'Sepolia Testnet'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-neutral-500">Chain ID</span>
                      <span className="text-sm text-neutral-300">{chain?.id || 11155111}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-neutral-500">Protection Status</span>
                      <span className="text-sm text-emerald-400">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

// Tab Button Component
const TabButton = ({ active, onClick, icon: Icon, label }: { 
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 ${
      active 
        ? 'border-neutral-200 text-neutral-200 bg-neutral-300/5' 
        : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
)
