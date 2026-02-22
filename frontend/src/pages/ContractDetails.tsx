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
  X
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

const StatusBadge = ({ isPaused }: { isPaused: boolean }) => (
  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
    isPaused 
      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  }`}>
    <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
    {isPaused ? 'Paused' : 'Active'}
  </div>
)

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'blue'
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'amber' | 'red' | 'emerald' | 'purple'
}) => {
  const colors = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    red: 'from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400',
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors[color]} border p-6`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Icon className="w-16 h-16" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        {subtitle && (
          <div className="flex items-center gap-2 text-sm">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
            {trend === 'neutral' && <Minus className="w-4 h-4 text-neutral-400" />}
            <span className="text-neutral-400">{subtitle}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

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
        ? 'border-amber-400 text-amber-400 bg-amber-500/5' 
        : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
)

export default function ContractDetails() {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const { isConnected, address: walletAddress } = useAccount()
  const { chain } = useNetwork()
  const addresses = getAddresses(chain?.id)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'logs' | 'settings'>('overview')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isCopied, setIsCopied] = useState(false)
  const [showConfirmDeregister, setShowConfirmDeregister] = useState(false)
  
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

  useEffect(() => {
    const stored = localStorage.getItem(`sentinel_logs_${address?.toLowerCase()}`)
    if (stored) setLogs(JSON.parse(stored))
  }, [address])

  useEffect(() => {
    if (logs.length > 0 && address) {
      localStorage.setItem(`sentinel_logs_${address.toLowerCase()}`, JSON.stringify(logs))
    }
  }, [logs, address])

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
          <Link to="/monitor" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 hover:bg-amber-500/30 transition-all">
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
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                  <FileCode className="w-5 h-5 text-amber-400" />
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
            <div className="flex">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Eye} label="Overview" />
              <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={BarChart3} label="Analytics" />
              <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={Terminal} label="Logs" />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Events" 
                  value={contractEvents.length} 
                  subtitle="All time activity"
                  icon={Activity}
                  color="blue"
                />
                <StatCard 
                  title="Threats Detected" 
                  value={threatCount} 
                  subtitle={threatCount > 0 ? 'Action required' : 'No threats'}
                  icon={AlertTriangle}
                  trend={threatCount > 0 ? 'up' : 'neutral'}
                  color={threatCount > 0 ? 'red' : 'emerald'}
                />
                <StatCard 
                  title="Times Paused" 
                  value={pauseCount} 
                  subtitle="Emergency interventions"
                  icon={Pause}
                  color="amber"
                />
                <StatCard 
                  title="Risk Score" 
                  value={`${riskScore}/100`} 
                  subtitle={riskScore > 50 ? 'High risk' : riskScore > 25 ? 'Medium risk' : 'Low risk'}
                  icon={ShieldCheck}
                  color={riskScore > 50 ? 'red' : riskScore > 25 ? 'amber' : 'emerald'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      Quick Actions
                    </h3>
                    
                    <div className="space-y-3">
                      {isPaused ? (
                        <button
                          onClick={() => unpause?.()}
                          disabled={!isConnected || isUnpausePending || !isOwner}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl border border-emerald-500/30 transition-all disabled:opacity-50 font-medium"
                        >
                          <Play className="w-4 h-4" />
                          {isUnpausePending ? 'Unpausing...' : 'Unpause Contract'}
                        </button>
                      ) : (
                        <button
                          onClick={() => pause?.()}
                          disabled={!isConnected || isPausePending || !isOwner}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-all disabled:opacity-50 font-medium"
                        >
                          <Pause className="w-4 h-4" />
                          {isPausePending ? 'Pausing...' : 'Emergency Pause'}
                        </button>
                      )}

                      <Link
                        to={`/visualizer?contract=${address}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl border border-white/10 transition-all"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View in Visualizer
                      </Link>
                    </div>

                    {!isOwner && (
                      <p className="mt-4 text-xs text-neutral-500 text-center">
                        Only the contract owner can perform these actions
                      </p>
                    )}
                  </div>

                  {/* Registration Info */}
                  {registration && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-sm font-medium text-neutral-400 mb-4">Registration Details</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Owner</span>
                          <code className="text-sm font-mono text-neutral-300">
                            {registration.owner?.slice(0, 6)}...{registration.owner?.slice(-4)}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Stake</span>
                          <span className="text-sm font-medium text-amber-400">
                            {formatEther(registration.stakedAmount || 0n)} ETH
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Registered</span>
                          <span className="text-sm text-neutral-300">
                            {new Date(Number(registration.registeredAt) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Status</span>
                          <span className={`text-sm font-medium ${registration.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {registration.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Events */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    Recent Activity
                  </h3>
                  
                  <div className="space-y-3">
                    {contractEvents.slice(0, 5).map((event, idx) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-start gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          event.level === 'CRITICAL' ? 'bg-red-400' :
                          event.level === 'HIGH' ? 'bg-orange-400' :
                          event.level === 'MEDIUM' ? 'bg-yellow-400' :
                          'bg-emerald-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                              event.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                              event.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-slate-700 text-neutral-400'
                            }`}>
                              {event.level}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-200">{event.details}</p>
                        </div>
                      </motion.div>
                    ))}
                    
                    {contractEvents.length === 0 && (
                      <div className="text-center py-12 text-neutral-500">
                        <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No events yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2"
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
