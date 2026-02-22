import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  RefreshCw,
  Zap,
  Clock,
  Wallet,
  ShieldCheck,
  Copy,
  CheckCircle
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
} from 'chart.js'
import { getAddresses, REGISTRY_ABI, GUARDIAN_ABI } from '../utils/wagmi'
import { useSentinelMonitor, SentinelEvent } from '../hooks/useSentinelMonitor'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface ContractStats {
  totalEvents: number
  threatsDetected: number
  pausesTriggered: number
  lastActivity: number
  riskScore: number
}

interface LogEntry {
  id: string
  timestamp: number
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR'
  message: string
  txHash?: string
}

export default function ContractDetails() {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const { isConnected, address: walletAddress } = useAccount()
  const { chain } = useNetwork()
  const addresses = getAddresses(chain?.id)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'logs' | 'settings'>('overview')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isCopied, setIsCopied] = useState(false)
  
  const { events, monitoredContracts, stats } = useSentinelMonitor(addresses.registry, addresses.guardian)
  
  // Validate address
  const validAddress = address && address.startsWith('0x') && address.length === 42
  const checksumAddress = validAddress ? getAddress(address) : null
  
  // Get contract data
  const contract = monitoredContracts.find(c => 
    c.address.toLowerCase() === address?.toLowerCase()
  )
  
  const contractEvents = events.filter(e => 
    e.contractAddress.toLowerCase() === address?.toLowerCase()
  )
  
  // Contract reads - use any for flexible typing since ABI doesn't have full type info
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
  
  // Contract writes
  const { config: pauseConfig } = usePrepareContractWrite({
    address: (checksumAddress as `0x${string}`) || undefined,
    abi: [{ inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' }],
    functionName: 'pause',
    enabled: !!checksumAddress && isConnected,
  })
  
  const { write: pause, data: pauseTx } = useContractWrite(pauseConfig)
  
  const { isLoading: isPausePending } = useWaitForTransaction({
    hash: pauseTx?.hash,
    onSuccess: () => {
      toast.success('Contract paused successfully')
      addLog('INFO', 'Contract paused by owner')
    },
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
    onSuccess: () => {
      toast.success('Contract unpaused successfully')
      addLog('INFO', 'Contract unpaused by owner')
    },
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
      toast.success('Contract deregistered successfully')
      navigate('/monitor')
    },
  })
  
  // Add log entry
  const addLog = useCallback((level: LogEntry['level'], message: string, txHash?: string) => {
    setLogs(prev => [{
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      level,
      message,
      txHash,
    }, ...prev].slice(0, 100))
  }, [])
  
  // Load stored logs
  useEffect(() => {
    const stored = localStorage.getItem(`sentinel_logs_${address?.toLowerCase()}`)
    if (stored) {
      setLogs(JSON.parse(stored))
    }
  }, [address])
  
  // Save logs
  useEffect(() => {
    if (logs.length > 0 && address) {
      localStorage.setItem(`sentinel_logs_${address.toLowerCase()}`, JSON.stringify(logs))
    }
  }, [logs, address])
  
  // Convert events to logs
  useEffect(() => {
    contractEvents.forEach(event => {
      addLog(
        event.level === 'CRITICAL' ? 'CRITICAL' : 
        event.level === 'HIGH' ? 'WARNING' : 'INFO',
        event.details,
        event.txHash
      )
    })
  }, [contractEvents])
  
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast.success('Address copied to clipboard')
    }
  }
  
  const handleDeregister = () => {
    if (!confirm('Are you sure you want to deregister this contract? Your stake will be returned.')) {
      return
    }
    deregister?.()
  }
  
  if (!validAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Contract Address</h1>
          <p className="text-neutral-400 mb-6">The address provided is not valid.</p>
          <Link to="/monitor" className="text-amber-400 hover:text-amber-300">
            ← Back to Monitor
          </Link>
        </div>
      </div>
    )
  }
  
  // Calculate stats
  const threatCount = contractEvents.filter(e => e.level === 'CRITICAL' || e.level === 'HIGH').length
  const pauseCount = contractEvents.filter(e => e.action === 'PAUSED').length
  
  // Chart data
  const eventsByDay = contractEvents.reduce((acc, event) => {
    const day = new Date(event.timestamp).toLocaleDateString()
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const lineChartData = {
    labels: Object.keys(eventsByDay).slice(-7),
    datasets: [{
      label: 'Events',
      data: Object.values(eventsByDay).slice(-7),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      tension: 0.4,
    }],
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
    }],
  }
  
  // Get risk score from contract or default to 0
  const riskScore = contract?.riskScore || 0
  
  const isOwner = registration?.owner?.toLowerCase() === walletAddress?.toLowerCase()
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/monitor" 
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-400" />
            </Link>
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <FileCode className="w-6 h-6 text-amber-400" />
                <h1 className="text-xl font-bold">Contract Details</h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-neutral-400 font-mono">{address}</code>
                <button 
                  onClick={copyAddress}
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                  {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-500" />}
                </button>
                <a 
                  href={`https://${chain?.id === 11155111 ? 'sepolia.' : ''}etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                </a>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isPaused ? (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
                  <Lock className="w-4 h-4" /> Paused
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium flex items-center gap-1">
                  <Unlock className="w-4 h-4" /> Active
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {(['overview', 'analytics', 'logs', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                  <Activity className="w-4 h-4" />
                  Total Events
                </div>
                <div className="text-2xl font-bold text-white">{contractEvents.length}</div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Threats
                </div>
                <div className={`text-2xl font-bold ${threatCount > 0 ? 'text-red-400' : 'text-white'}`}>
                  {threatCount}
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                  <Pause className="w-4 h-4" />
                  Pauses
                </div>
                <div className="text-2xl font-bold text-white">{pauseCount}</div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  Risk Score
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {riskScore}/100
                </div>
              </motion.div>
            </div>
            
            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Quick Actions
              </h3>
              
              <div className="space-y-2">
                {isPaused ? (
                  <button
                    onClick={() => unpause?.()}
                    disabled={!isConnected || isUnpausePending || !isOwner}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    {isUnpausePending ? 'Unpausing...' : 'Unpause Contract'}
                  </button>
                ) : (
                  <button
                    onClick={() => pause?.()}
                    disabled={!isConnected || isPausePending || !isOwner}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pause className="w-4 h-4" />
                    {isPausePending ? 'Pausing...' : 'Emergency Pause'}
                  </button>
                )}
                
                <Link
                  to={`/visualizer?contract=${address}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-neutral-300 rounded-lg transition-all"
                >
                  <BarChart3 className="w-4 h-4" />
                  View in Visualizer
                </Link>
              </div>
              
              {!isOwner && (
                <p className="mt-3 text-xs text-neutral-500 text-center">
                  Only the contract owner can perform these actions
                </p>
              )}
            </motion.div>
            
            {/* Registration Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Registration Details
              </h3>
              
              {registration ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Owner</div>
                    <code className="text-sm font-mono text-slate-300">
                      {registration.owner?.slice(0, 6)}...{registration.owner?.slice(-4)}
                    </code>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Stake</div>
                    <div className="text-sm text-amber-400 font-medium">
                      {formatEther(registration.stakedAmount || 0n)} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Registered</div>
                    <div className="text-sm text-slate-300">
                      {new Date(Number(registration.registeredAt) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Status</div>
                    <span className={`text-sm font-medium ${registration.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {registration.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-500">Loading registration details...</p>
              )}
            </motion.div>
            
            {/* Recent Events */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Recent Events
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contractEvents.slice(0, 5).map((event, idx) => (
                  <div key={event.id} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        event.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        event.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-700 text-neutral-400'
                      }`}>
                        {event.level}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{event.details}</p>
                  </div>
                ))}
                
                {contractEvents.length === 0 && (
                  <p className="text-neutral-500 text-center py-4">No events yet</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4">Events Over Time</h3>
              <Line 
                data={lineChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(255,255,255,0.1)' },
                      ticks: { color: '#9ca3af' },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: '#9ca3af' },
                    },
                  },
                }}
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4">Threat Distribution</h3>
              <Doughnut 
                data={threatDistribution}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#9ca3af' },
                    },
                  },
                }}
              />
            </motion.div>
          </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/50 border border-slate-800 rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Activity Logs
              </h3>
              <button
                onClick={() => {
                  setLogs([])
                  localStorage.removeItem(`sentinel_logs_${address?.toLowerCase()}`)
                  toast.success('Logs cleared')
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear Logs
              </button>
            </div>
            
            <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full ${
                      log.level === 'CRITICAL' ? 'bg-red-500' :
                      log.level === 'WARNING' ? 'bg-yellow-500' :
                      log.level === 'ERROR' ? 'bg-red-400' :
                      'bg-emerald-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
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
                      <p className="text-sm text-slate-300">{log.message}</p>
                      {log.txHash && (
                        <a
                          href={`https://${chain?.id === 11155111 ? 'sepolia.' : ''}etherscan.io/tx/${log.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-1"
                        >
                          View TX <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="p-12 text-center text-neutral-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No logs yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Contract Settings
              </h3>
              
              <div className="space-y-6">
                {/* Deregister */}
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Deregister Contract
                  </h4>
                  <p className="text-sm text-neutral-400 mb-4">
                    Remove this contract from Sentinel protection. Your stake will be returned to your wallet.
                  </p>
                  <button
                    onClick={handleDeregister}
                    disabled={!isConnected || isDeregisterPending || !isOwner}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all disabled:opacity-50"
                  >
                    {isDeregisterPending ? 'Deregistering...' : 'Deregister'}
                  </button>
                </div>
                
                {/* Info */}
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-medium text-slate-300 mb-2">Contract Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Address</span>
                      <code className="text-slate-300 font-mono">{address}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Network</span>
                      <span className="text-slate-300">{chain?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Chain ID</span>
                      <span className="text-slate-300">{chain?.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}
