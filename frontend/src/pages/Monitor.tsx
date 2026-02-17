import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Play, 
  Square, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  ExternalLink,
  Zap,
  FileCode,
  Lock,
  Unlock,
  RefreshCw,
  Server,
  Radio,
  BarChart3
} from 'lucide-react'
import { useAccount, useNetwork } from 'wagmi'
import { Link } from 'react-router-dom'
import { 
  useSentinelMonitor, 
  ThreatLevel,
  SentinelEvent
} from '../hooks/useSentinelMonitor'
import { useContracts } from '../hooks/useContracts'
import { useCRE } from '../hooks/useCRE'
import { getAddresses } from '../utils/wagmi'
import { toast } from 'react-hot-toast'


const ThreatIcon = ({ level }: { level: ThreatLevel }) => {
  switch (level) {
    case 'CRITICAL':
      return <AlertTriangle className="w-5 h-5 text-red-500" />
    case 'HIGH':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />
    case 'MEDIUM':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    case 'LOW':
      return <Search className="w-5 h-5 text-blue-400" />
    default:
      return <CheckCircle className="w-5 h-5 text-emerald-400" />
  }
}

const ThreatBadge = ({ level }: { level: ThreatLevel }) => {
  const colors = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    INFO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[level]}`}>
      {level}
    </span>
  )
}

const ActionBadge = ({ action }: { action?: string }) => {
  if (!action) return null
  
  const colors = {
    PAUSED: 'bg-red-500/30 text-red-300',
    ALERTED: 'bg-orange-500/30 text-orange-300',
    LOGGED: 'bg-slate-500/30 text-slate-300',
  }
  
  return (
    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${colors[action as keyof typeof colors] || colors.LOGGED}`}>
      {action}
    </span>
  )
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatAddress = (addr: string) => {
  if (!addr) return '-'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Sentinel Node WebSocket hook with full integration
interface ServerEvent {
  type: 'INIT' | 'THREAT_DETECTED' | 'REGISTRATION' | 'PAUSE_TRIGGERED' | 'PAUSE_LIFTED' | 'CRE_PAUSE_EXECUTED'
  contractAddress?: string
  threat?: SentinelEvent
  contracts?: any[]
  lastBlock?: number
  sentinel?: string
  vulnHash?: string
  txHash?: string
  blockNumber?: number
}

interface SentinelNodeState {
  isConnected: boolean
  serverEvents: ServerEvent[]
  nodeStatus: {
    contractsCount: number
    lastBlock: number
    isRunning: boolean
  } | null
}

function useSentinelNode() {
  const [state, setState] = useState<SentinelNodeState>({
    isConnected: false,
    serverEvents: [],
    nodeStatus: null
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(SENTINEL_WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Connected to Sentinel Node')
        setState(prev => ({ ...prev, isConnected: true }))
        toast.success('Connected to Sentinel Node')
      }

      ws.onmessage = (event) => {
        try {
          const data: ServerEvent = JSON.parse(event.data)
          
          // Handle INIT message with node status
          if (data.type === 'INIT') {
            setState(prev => ({
              ...prev,
              nodeStatus: {
                contractsCount: data.contracts?.length || 0,
                lastBlock: data.lastBlock || 0,
                isRunning: true
              }
            }))
          }
          
          // Handle threat detection
          if (data.type === 'THREAT_DETECTED' && data.threat) {
            toast.error(
              `🚨 ${data.threat.level} Threat Detected: ${data.threat.details.slice(0, 50)}...`,
              { duration: 5000 }
            )
          }
          
          // Handle pause events
          if (data.type === 'PAUSE_TRIGGERED') {
            toast.success(`🔒 Contract Paused: ${data.contractAddress?.slice(0, 10)}...`)
          }
          
          setState(prev => ({
            ...prev,
            serverEvents: [data, ...prev.serverEvents].slice(0, 100)
          }))
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('🔌 Disconnected from Sentinel Node')
        setState(prev => ({ ...prev, isConnected: false }))
        wsRef.current = null
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        toast.error('Sentinel Node connection error')
      }
    } catch (error) {
      console.error('Failed to connect to Sentinel Node:', error)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  // Trigger manual pause via Sentinel Node API
  const triggerNodePause = useCallback(async (contractAddress: string, vulnHash: string) => {
    try {
      const response = await fetch(`${SENTINEL_API_URL}/emergency-pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': (import.meta as any).env?.VITE_SENTINEL_API_KEY || 'dev-key'
        },
        body: JSON.stringify({
          target: contractAddress,
          vulnHash,
          source: 'frontend'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Pause request failed')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Failed to trigger node pause:', error)
      throw error
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    triggerNodePause
  }
}

// Environment Configuration
const CRE_CONSUMER_ADDRESS = (import.meta as any).env?.VITE_CRE_CONSUMER_ADDRESS as `0x${string}`
const SENTINEL_WS_URL = (import.meta as any).env?.VITE_SENTINEL_WS_URL || 'ws://localhost:9000'
const SENTINEL_API_URL = (import.meta as any).env?.VITE_SENTINEL_API_URL || 'http://localhost:9001'



export default function Monitor() {
  const { isConnected } = useAccount()
  const { chain } = useNetwork()
  const addresses = getAddresses(chain?.id)
  
  // Core monitoring hooks
  const {
    isMonitoring,
    events,
    monitoredContracts,
    stats,
    startMonitoring,
    stopMonitoring,
    loadMonitoredContracts,
  } = useSentinelMonitor(addresses.registry, addresses.guardian)
  
  // Sentinel Node integration
  const { 
    isConnected: isNodeConnected, 
    serverEvents, 
    nodeStatus,
    triggerNodePause 
  } = useSentinelNode()
  
  // CRE integration
  const cre = useCRE(CRE_CONSUMER_ADDRESS)
  const { getContractMetadata } = useContracts()
  
  // UI state
  const [filter, setFilter] = useState<ThreatLevel | 'ALL'>('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedContract, setSelectedContract] = useState<string | null>(null)
  const [contractMetadata, setContractMetadata] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<'all' | 'node' | 'onchain'>('all')
  
  // Handle manual pause via Sentinel Node (fastest)
  const handleNodePause = async (contractAddress: string) => {
    if (!isConnected) {
      toast.error('Connect wallet first')
      return
    }
    
    try {
      toast.loading('Triggering emergency pause via Sentinel Node...')
      const vulnHash = `0x${'9'.repeat(64)}` as `0x${string}`
      
      const result = await triggerNodePause(contractAddress, vulnHash)
      
      toast.dismiss()
      if (result.success) {
        toast.success(`✅ Pause executed! TX: ${result.txHash?.slice(0, 20)}...`)
      } else if (result.alreadyPaused) {
        toast('Contract is already paused', { icon: '🔒' })
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || 'Failed to trigger pause')
    }
  }

  // Handle manual CRE pause trigger (confidential, via Chainlink)
  const handleManualPause = async (contractAddress: string) => {
    if (!isConnected) {
      toast.error('Connect wallet first')
      return
    }
    
    try {
      toast.loading('Requesting confidential pause via CRE...')
      const vulnHash = `0x${'9'.repeat(64)}` as `0x${string}`
      
      const requestId = await cre.requestConfidentialPause(
        contractAddress as `0x${string}`,
        vulnHash
      )
      
      toast.dismiss()
      toast.success(`CRE Request sent! ID: ${requestId.slice(0, 10)}...`)
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || 'Failed to trigger pause')
    }
  }

  // Load metadata for contracts
  useEffect(() => {
    monitoredContracts.forEach(async (contract) => {
      try {
        const metadata = await getContractMetadata(contract.address)
        setContractMetadata(prev => ({
          ...prev,
          [contract.address]: metadata
        }))
      } catch (error) {
        console.error('Failed to load metadata:', error)
      }
    })
  }, [monitoredContracts, getContractMetadata])

  // Convert server events to SentinelEvent format for unified display
  const serverSentinelEvents: SentinelEvent[] = serverEvents
    .filter(e => e.type === 'THREAT_DETECTED' && e.threat)
    .map(e => e.threat!)

  // Combine on-chain and Sentinel Node events
  const allEvents = [...events, ...serverSentinelEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100)

  // Filter events based on tab and level
  const filteredEvents = allEvents.filter(e => {
    const matchesFilter = filter === 'ALL' ? true : e.level === filter
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'node' ? serverSentinelEvents.some(se => se.id === e.id) :
      !serverSentinelEvents.some(se => se.id === e.id)
    return matchesFilter && matchesTab
  })

  const contractEvents = selectedContract
    ? allEvents.filter(e => e.contractAddress === selectedContract)
    : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
              <Shield className="w-8 h-8 text-amber-400" />
              Sentinel Monitor
            </h1>
            <p className="text-neutral-400">
              Real-time threat detection for protected smart contracts
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isConnected ? (
              <div className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
                Connect wallet to monitor
              </div>
            ) : (
              <>
                {isMonitoring ? (
                  <button
                    onClick={stopMonitoring}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all"
                  >
                    <Square className="w-4 h-4" />
                    Stop Monitor
                  </button>
                ) : (
                  <button
                    onClick={startMonitoring}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Start Monitor
                  </button>
                )}
                
                <button
                  onClick={loadMonitoredContracts}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>

                <Link
                  to="/visualizer"
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg border border-amber-500/30 transition-all"
                >
                  <BarChart3 className="w-4 h-4" />
                  Threat Visualizer
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Activity className="w-4 h-4" />
              Monitor
            </div>
            <div className={`text-lg font-semibold ${isMonitoring ? 'text-emerald-400' : 'text-neutral-500'}`}>
              {isMonitoring ? 'Active' : 'Standby'}
            </div>
          </div>
          
          <div className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Server className="w-4 h-4" />
              Sentinel Node
            </div>
            <div className={`text-lg font-semibold ${isNodeConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isNodeConnected ? 'Online' : 'Offline'}
            </div>
            {nodeStatus && (
              <div className="text-xs text-neutral-500 mt-1">
                {nodeStatus.contractsCount} contracts
              </div>
            )}
          </div>
          
          <div className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Radio className="w-4 h-4" />
              Block
            </div>
            <div className="text-lg font-semibold text-slate-200">
              {nodeStatus?.lastBlock?.toLocaleString() || stats.lastBlock.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Search className="w-4 h-4" />
              Total Scans
            </div>
            <div className="text-lg font-semibold text-slate-200">
              {stats.totalScans.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Threats
            </div>
            <div className={`text-lg font-semibold ${(stats.threatsDetected + serverSentinelEvents.length) > 0 ? 'text-orange-400' : 'text-slate-200'}`}>
              {stats.threatsDetected + serverSentinelEvents.length}
            </div>
          </div>
          
          <div className="bg-neutral-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
              <Lock className="w-4 h-4" />
              Paused
            </div>
            <div className={`text-lg font-semibold ${stats.contractsPaused > 0 ? 'text-red-400' : 'text-slate-200'}`}>
              {stats.contractsPaused}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitored Contracts */}
        <div className="bg-neutral-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-semibold flex items-center gap-2">
              <FileCode className="w-5 h-5 text-amber-400" />
              Monitored Contracts
              <span className="ml-auto text-sm text-neutral-500">
                {monitoredContracts.length}
              </span>
            </h2>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {monitoredContracts.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No contracts registered yet</p>
                <p className="text-sm mt-1">Go to Contracts page to add protection</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {monitoredContracts.map((contract) => (
                  <motion.div
                    key={contract.address}
                    whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.3)' }}
                    className={`p-4 transition-colors ${
                      selectedContract === contract.address ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <button
                      onClick={() => setSelectedContract(
                        selectedContract === contract.address ? null : contract.address
                      )}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          {contractMetadata[contract.address]?.name || formatAddress(contract.address)}
                        </div>
                        {contract.isPaused ? (
                          <Lock className="w-4 h-4 text-red-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      
                      <div className="text-xs text-neutral-500 font-mono">
                        {formatAddress(contract.address)}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-neutral-400">
                          {contract.totalEvents} events
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-neutral-400">
                          {formatTime(contract.lastActivity)}
                        </span>
                      </div>
                    </button>
                    
                    {/* Pause Buttons */}
                    {!contract.isPaused && (
                      <div className="mt-3 space-y-2">
                        {/* Fast Node Pause */}
                        {isNodeConnected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNodePause(contract.address)
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 transition-all text-xs font-medium"
                          >
                            <Radio className="w-3 h-3" />
                            Quick Pause (Node)
                          </button>
                        )}
                        
                        {/* Confidential CRE Pause */}
                        {CRE_CONSUMER_ADDRESS && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleManualPause(contract.address)
                            }}
                            disabled={cre.isLoading}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all text-xs font-medium disabled:opacity-50"
                          >
                            <Zap className="w-3 h-3" />
                            {cre.isLoading ? 'Processing...' : 'Confidential Pause (CRE)'}
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Feed */}
        <div className="lg:col-span-2 bg-neutral-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Security Event Feed
              </h2>
              {/* Event Source Tabs */}
              <div className="flex items-center gap-1 mt-2">
                {(['all', 'node', 'onchain'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      activeTab === tab
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {tab === 'all' && 'All Events'}
                    {tab === 'node' && `Sentinel Node (${serverSentinelEvents.length})`}
                    {tab === 'onchain' && `On-Chain (${events.length})`}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ThreatLevel | 'ALL')}
                className="bg-slate-800 text-sm rounded-lg px-3 py-1.5 border border-slate-700 focus:border-amber-500 outline-none"
              >
                <option value="ALL">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Info</option>
              </select>
              
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-2 rounded-lg transition-colors ${
                  autoScroll ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">No security events yet</p>
                <p className="text-sm">
                  {activeTab === 'node' && !isNodeConnected 
                    ? 'Sentinel Node is offline. Start the node to see events.'
                    : activeTab === 'node' 
                    ? 'Sentinel Node connected. Waiting for threats...'
                    : isMonitoring 
                    ? 'Monitoring active. Waiting for transactions...' 
                    : 'Start monitoring to detect threats'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                <AnimatePresence>
                  {filteredEvents.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <ThreatIcon level={event.level} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <ThreatBadge level={event.level} />
                            <ActionBadge action={event.action} />
                            <span className="text-xs text-neutral-500">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-200 mb-1">
                            {event.details}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-neutral-500">
                            <span className="font-mono">
                              {formatAddress(event.contractAddress)}
                            </span>
                            {event.value && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400">{event.value}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{(event.confidence * 100).toFixed(0)}% confidence</span>
                          </div>
                          
                          {event.txHash && event.txHash !== '0x' && (
                            <a
                              href={`https://${chain?.id === 11155111 ? 'sepolia.' : ''}etherscan.io/tx/${event.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2"
                            >
                              View Transaction
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Contract Details */}
      {selectedContract && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mt-6 bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Contract Events: {formatAddress(selectedContract)}
            </h3>
            <button
              onClick={() => setSelectedContract(null)}
              className="text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>
          
          {contractEvents.length === 0 ? (
            <p className="text-neutral-500">No events for this contract yet</p>
          ) : (
            <div className="space-y-2">
              {contractEvents.slice(0, 10).map(event => (
                <div key={event.id} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg">
                  <ThreatBadge level={event.level} />
                  <span className="text-sm text-slate-300">{event.details}</span>
                  <span className="ml-auto text-xs text-neutral-500">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Server Events (if connected to Sentinel Node) */}
      {isNodeConnected && serverEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mt-6 bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
        >
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Sentinel Node Events
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {serverEvents.slice(0, 10).map((evt, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-slate-800/30 rounded">
                <span className="text-xs text-neutral-500">{formatTime(Date.now())}</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                  {evt.type}
                </span>
                <span className="text-slate-300">
                  {evt.contractAddress ? formatAddress(evt.contractAddress) : 'System'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Integration Status */}
      <div className="max-w-7xl mx-auto mt-8 p-6 bg-gradient-to-r from-slate-900 to-neutral-900 border border-slate-800 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-slate-200 mb-1">
              Sentinel Security System
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              Two-layer protection: Sentinel Node for real-time heuristics (sub-second response) + 
              Chainlink CRE for confidential on-chain execution.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Sentinel Node Status */}
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-300">Sentinel Node</span>
                  {isNodeConnected ? (
                    <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      Connected
                    </span>
                  ) : (
                    <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                      Offline
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-400 break-all">
                  WS: {SENTINEL_WS_URL}
                </div>
                <div className="font-mono text-xs text-slate-400 break-all">
                  API: {SENTINEL_API_URL}
                </div>
              </div>
              
              {/* CRE Configuration */}
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Chainlink CRE</span>
                  {CRE_CONSUMER_ADDRESS ? (
                    <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                      Not Configured
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-400 break-all">
                  {CRE_CONSUMER_ADDRESS || 'No consumer address set'}
                </div>
                {cre.lastRequestId && (
                  <div className="mt-1 text-xs text-amber-400">
                    Last: {cre.lastRequestId.slice(0, 25)}...
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Node Response</div>
                <div className="text-lg font-semibold text-emerald-400">&lt;500ms</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">CRE Response</div>
                <div className="text-lg font-semibold text-blue-400">~2-5s</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Protected</div>
                <div className="text-lg font-semibold text-amber-400">
                  {monitoredContracts.length}
                </div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Subscription</div>
                <div className="text-lg font-semibold text-purple-400">
                  #{((import.meta as any).env?.VITE_CHAINLINK_SUBSCRIPTION_ID) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
