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
  FileCode,
  Lock,
  RefreshCw,
  Server,
  Radio,
  BarChart3,
  History,
  Database,
  Settings
} from 'lucide-react'
import { useAccount, useNetwork } from 'wagmi'
import { Link } from 'react-router-dom'
import { 
  useSentinelMonitor, 
  ThreatLevel,
  SentinelEvent
} from '../hooks/useSentinelMonitor'
import { useContracts } from '../hooks/useContracts'
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

// Sentinel Node WebSocket hook
interface ServerEvent {
  type: 'INIT' | 'THREAT_DETECTED' | 'REGISTRATION' | 'PAUSE_TRIGGERED' | 'PAUSE_LIFTED'
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

// Event Log Storage - using localStorage for persistence
const EVENT_LOGS_KEY = 'sentinel_event_logs'
const MAX_STORED_EVENTS = 500

function useEventLogStorage() {
  const [storedEvents, setStoredEvents] = useState<SentinelEvent[]>([])
  
  // Load events from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EVENT_LOGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setStoredEvents(parsed)
      }
    } catch (error) {
      console.error('Failed to load event logs:', error)
    }
  }, [])
  
  // Save events to localStorage
  const saveEvents = useCallback((events: SentinelEvent[]) => {
    try {
      const trimmed = events.slice(0, MAX_STORED_EVENTS)
      localStorage.setItem(EVENT_LOGS_KEY, JSON.stringify(trimmed))
      setStoredEvents(trimmed)
    } catch (error) {
      console.error('Failed to save event logs:', error)
    }
  }, [])
  
  const addEvent = useCallback((event: SentinelEvent) => {
    setStoredEvents(prev => {
      const updated = [event, ...prev].slice(0, MAX_STORED_EVENTS)
      localStorage.setItem(EVENT_LOGS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])
  
  const clearEvents = useCallback(() => {
    localStorage.removeItem(EVENT_LOGS_KEY)
    setStoredEvents([])
  }, [])
  
  return { storedEvents, saveEvents, addEvent, clearEvents }
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

function useSentinelNode() {
  const [state, setState] = useState<SentinelNodeState & { connectionStatus: ConnectionStatus; reconnectAttempts: number }>({
    isConnected: false,
    serverEvents: [],
    nodeStatus: null,
    connectionStatus: 'idle',
    reconnectAttempts: 0
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastReconnectRef = useRef<number>(0)
  const messageTimestampsRef = useRef<number[]>([])
  const hasShownErrorRef = useRef(false)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    const now = Date.now()
    if (now - lastReconnectRef.current < 3000) {
      console.log('⏳ Reconnect rate limited, waiting...')
      reconnectTimeoutRef.current = setTimeout(() => connect(), 3000)
      return
    }
    lastReconnectRef.current = now

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }))

    try {
      const ws = new WebSocket(SENTINEL_WS_URL)
      wsRef.current = ws

      // Connection timeout - if not connected within 3 seconds, consider it failed
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close()
        }
      }, 3000)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log('✅ Connected to Sentinel Node')
        hasShownErrorRef.current = false
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          connectionStatus: 'connected',
          reconnectAttempts: 0 
        }))
        // Only show success toast on first connect or after error
        if (state.reconnectAttempts > 0) {
          toast.success('Reconnected to Sentinel Node')
        }
      }

      ws.onmessage = (event) => {
        try {
          const now = Date.now()
          messageTimestampsRef.current = messageTimestampsRef.current.filter(ts => now - ts < 1000)
          if (messageTimestampsRef.current.length >= 10) {
            console.log('⏳ Message rate limited')
            return
          }
          messageTimestampsRef.current.push(now)
          
          const data: ServerEvent = JSON.parse(event.data)
          
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
          
          if (data.type === 'THREAT_DETECTED' && data.threat) {
            toast.error(
              `🚨 ${data.threat.level} Threat Detected: ${data.threat.details.slice(0, 50)}...`,
              { duration: 5000 }
            )
          }
          
          if (data.type === 'PAUSE_TRIGGERED') {
            toast.success(`🔒 Contract Paused: ${data.contractAddress?.slice(0, 10)}...`)
          }
          
          setState(prev => ({
            ...prev,
            serverEvents: [data, ...prev.serverEvents].slice(0, 50)
          }))
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        clearTimeout(connectionTimeout)
        console.log('🔌 Disconnected from Sentinel Node')
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          connectionStatus: prev.connectionStatus === 'connecting' ? 'error' : 'idle'
        }))
        wsRef.current = null
        
        // Only show error toast once, then silently reconnect
        if (!hasShownErrorRef.current && state.reconnectAttempts === 0) {
          toast.error('Sentinel Node disconnected. Retrying...', { duration: 3000 })
          hasShownErrorRef.current = true
        }
        
        // Exponential backoff for reconnect
        const backoffDelay = Math.min(3000 * Math.pow(1.5, state.reconnectAttempts), 30000)
        setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }))
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect... (attempt ${state.reconnectAttempts + 1})`)
          connect()
        }, backoffDelay)
      }

      ws.onerror = (error) => {
        // Don't show toast on error - let onclose handle reconnection
        console.error('WebSocket error:', error)
        setState(prev => ({ ...prev, connectionStatus: 'error' }))
      }
    } catch (error) {
      console.error('Failed to connect to Sentinel Node:', error)
      setState(prev => ({ ...prev, connectionStatus: 'error' }))
    }
  }, [state.reconnectAttempts])

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
    connectionStatus: nodeConnectionStatus,
    serverEvents, 
    nodeStatus,
    triggerNodePause 
  } = useSentinelNode()
  
  // Event log storage
  const { storedEvents, addEvent, clearEvents } = useEventLogStorage()
  
  const { getContractMetadata } = useContracts()
  
  // UI state
  const [filter, setFilter] = useState<ThreatLevel | 'ALL'>('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedContract, setSelectedContract] = useState<string | null>(null)
  const [contractMetadata, setContractMetadata] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<'all' | 'node' | 'onchain' | 'history'>('all')

  // Handle manual pause via Sentinel Node
  const handleNodePause = async (contractAddress: string) => {
    if (!isConnected) {
      toast.error('Connect wallet first')
      return
    }
    
    const contract = monitoredContracts.find(c => 
      c.address.toLowerCase() === contractAddress.toLowerCase()
    )
    if (contract?.isPaused) {
      toast('Contract is already paused', { icon: '🔒' })
      return
    }
    
    try {
      toast.loading('Triggering emergency pause...')
      const vulnHash = `0x${'9'.repeat(64)}` as `0x${string}`
      
      const result = await triggerNodePause(contractAddress, vulnHash)
      
      toast.dismiss()
      if (result.success) {
        toast.success(`✅ Pause executed! TX: ${result.txHash?.slice(0, 20)}...`)
        await loadMonitoredContracts()
      } else if (result.alreadyPaused) {
        toast('Contract is already paused', { icon: '🔒' })
      }
    } catch (error: any) {
      toast.dismiss()
      if (error.message?.includes('AlreadyPaused') || error.message?.includes('paused')) {
        toast('Contract is already paused', { icon: '🔒' })
      } else if (error.message?.includes('NotAuthorized')) {
        toast.error('Not authorized to pause this contract')
      } else {
        toast.error(error.message || 'Failed to trigger pause')
      }
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

  // Save new events to storage
  useEffect(() => {
    events.forEach(event => {
      const isStored = storedEvents.some(e => e.id === event.id)
      if (!isStored) {
        addEvent(event)
      }
    })
  }, [events, storedEvents, addEvent])

  // Convert server events to SentinelEvent format
  const serverSentinelEvents: SentinelEvent[] = serverEvents
    .filter(e => e.type === 'THREAT_DETECTED' && e.threat)
    .map(e => e.threat!)

  // Combine all events (real-time + stored history)
  const allEvents = [...events, ...serverSentinelEvents, ...storedEvents]
    .filter((e, i, arr) => arr.findIndex(t => t.id === e.id) === i) // Remove duplicates
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100)

  // Filter events
  const filteredEvents = allEvents.filter(e => {
    const matchesFilter = filter === 'ALL' ? true : e.level === filter
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'node' ? serverSentinelEvents.some(se => se.id === e.id) :
      activeTab === 'onchain' ? events.some(oe => oe.id === e.id) :
      activeTab === 'history' ? storedEvents.some(he => he.id === e.id) :
      true
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
              Sentinel Command
            </h1>
            <p className="text-neutral-400">
              Monitor threats and execute emergency pauses
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isConnected ? (
              <div className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
                Connect wallet
              </div>
            ) : (
              <>
                {isMonitoring ? (
                  <button
                    onClick={stopMonitoring}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all"
                  >
                    <Square className="w-4 h-4" />
                    Stop Monitoring
                  </button>
                ) : (
                  <button
                    onClick={startMonitoring}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Start Monitoring
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div className={`text-lg font-semibold ${
              nodeConnectionStatus === 'connected' ? 'text-emerald-400' :
              nodeConnectionStatus === 'connecting' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {nodeConnectionStatus === 'connected' ? 'Online' :
               nodeConnectionStatus === 'connecting' ? 'Connecting...' :
               'Offline'}
            </div>
            {nodeStatus && nodeConnectionStatus === 'connected' && (
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
                <Link to="/protect" className="text-amber-400 hover:text-amber-300 text-sm mt-1 inline-block">
                  Go to Protect page to add protection →
                </Link>
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
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/contract/${contract.address}`}
                        className="flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">
                            {contractMetadata[contract.address]?.name || formatAddress(contract.address)}
                          </div>
                          <ExternalLink className="w-3 h-3 text-neutral-500" />
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
                          <span className="text-neutral-600">•</span>
                          <span className={contract.isPaused ? 'text-red-400' : 'text-emerald-400'}>
                            {contract.isPaused ? 'Paused' : 'Active'}
                          </span>
                        </div>
                      </Link>
                    </div>
                    
                    {/* Action Icons */}
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Link
                        to={`/contract/${contract.address}`}
                        className="p-2 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 rounded-lg transition-all"
                        title="Manage Contract"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                      
                      {!contract.isPaused && isNodeConnected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNodePause(contract.address)
                          }}
                          className="p-2 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-all"
                          title="Emergency Pause"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      
                      {contract.isPaused && (
                        <div className="p-2 text-red-400 bg-red-500/10 rounded-lg" title="Contract Paused">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Feed */}
        <div className="lg:col-span-2 bg-neutral-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Security Event Feed
              </h2>
              <div className="flex items-center gap-1 mt-2">
                {(['all', 'node', 'onchain', 'history'] as const).map((tab) => (
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
                    {tab === 'node' && `Node (${serverSentinelEvents.length})`}
                    {tab === 'onchain' && `On-Chain (${events.length})`}
                    {tab === 'history' && `History (${storedEvents.length})`}
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
                title="Auto-scroll"
              >
                <RefreshCw className={`w-4 h-4 ${autoScroll ? 'animate-spin' : ''}`} />
              </button>
              
              {storedEvents.length > 0 && (
                <button
                  onClick={clearEvents}
                  className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Clear history"
                >
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">No security events yet</p>
                <p className="text-sm">
                  {activeTab === 'node' && nodeConnectionStatus !== 'connected'
                    ? nodeConnectionStatus === 'connecting' 
                      ? 'Connecting to Sentinel Node...'
                      : 'Sentinel Node is offline. Start the node to see events.'
                    : activeTab === 'history'
                    ? 'No stored events. Events will be saved here automatically.'
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
                            {storedEvents.some(e => e.id === event.id) && (
                              <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                                stored
                              </span>
                            )}
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

      {/* Server Events */}
      {isNodeConnected && serverEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mt-6 bg-neutral-900/50 border border-slate-800 rounded-xl p-6"
        >
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
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

      {/* Architecture Info */}
      <div className="max-w-7xl mx-auto mt-8 p-6 bg-gradient-to-r from-slate-900 to-neutral-900 border border-slate-800 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <Database className="w-6 h-6 text-amber-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-slate-200 mb-1">
              Sentinel Pause-Only Protection
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              Non-custodial security monitoring. Sentinel can only trigger <code>pause()</code> on your contracts. 
              You maintain full ownership and control. Events are stored locally in your browser.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Sentinel Node Status */}
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-300">Sentinel Node</span>
                  {nodeConnectionStatus === 'connected' ? (
                    <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      Connected
                    </span>
                  ) : nodeConnectionStatus === 'connecting' ? (
                    <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse">
                      Connecting
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
                {nodeConnectionStatus === 'connected' && (
                  <div className="text-xs text-neutral-500 mt-1">
                    Response time: &lt;500ms
                  </div>
                )}
              </div>
              
              {/* On-Chain Monitor */}
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-300">On-Chain Monitor</span>
                  <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
                    isMonitoring ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-700 text-neutral-400'
                  }`}>
                    {isMonitoring ? 'Active' : 'Idle'}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  Watching registry events via RPC
                </div>
              </div>
              
              {/* Event Storage */}
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Event Storage</span>
                  <span className="ml-auto px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    Local
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {storedEvents.length} events stored (max {MAX_STORED_EVENTS})
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Node Response</div>
                <div className="text-lg font-semibold text-emerald-400">&lt;500ms</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Protected</div>
                <div className="text-lg font-semibold text-amber-400">
                  {monitoredContracts.length}
                </div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Response Type</div>
                <div className="text-lg font-semibold text-purple-400">Pause Only</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Custody</div>
                <div className="text-lg font-semibold text-cyan-400">Non-Custodial</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
