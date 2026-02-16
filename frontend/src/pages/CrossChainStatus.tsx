import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Globe, 
  Shield, 
  Link2, 
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Server
} from 'lucide-react'
import { cn } from '../utils/cn'

// Chain configurations
const CHAINS = [
  {
    id: 11155111,
    name: 'Ethereum Sepolia',
    selector: '16015286601757825753',
    status: 'active',
    guardianAddress: '0x...',
    color: '#627EEA'
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    selector: '3478487238524512106',
    status: 'active',
    guardianAddress: '0x...',
    color: '#28A0F0'
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    selector: '10344971235874465080',
    status: 'syncing',
    guardianAddress: '0x...',
    color: '#0052FF'
  }
]

interface CCIPMessage {
  id: string
  sourceChain: string
  destChain: string
  status: 'pending' | 'delivered' | 'failed'
  timestamp: Date
  victim: string
  threatHash: string
}

export default function CrossChainStatus() {
  const [activeChain, setActiveChain] = useState(CHAINS[0])
  const [messages, setMessages] = useState<CCIPMessage[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalMessages: 0,
    delivered: 0,
    pending: 0,
    avgDeliveryTime: '12s'
  })

  // Simulate fetching CCIP messages
  const fetchMessages = async () => {
    setIsRefreshing(true)
    // In real implementation, this would call CCIP API
    await new Promise(r => setTimeout(r, 1000))
    
    const mockMessages: CCIPMessage[] = [
      {
        id: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        sourceChain: 'Ethereum Sepolia',
        destChain: 'Arbitrum Sepolia',
        status: 'delivered',
        timestamp: new Date(Date.now() - 300000),
        victim: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        threatHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      },
      {
        id: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        sourceChain: 'Ethereum Sepolia',
        destChain: 'Base Sepolia',
        status: 'pending',
        timestamp: new Date(Date.now() - 60000),
        victim: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        threatHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      }
    ]
    
    setMessages(mockMessages)
    setStats({
      totalMessages: mockMessages.length,
      delivered: mockMessages.filter(m => m.status === 'delivered').length,
      pending: mockMessages.filter(m => m.status === 'pending').length,
      avgDeliveryTime: '12s'
    })
    setIsRefreshing(false)
  }

  useEffect(() => {
    fetchMessages()
  }, [activeChain])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Cross-Chain Status</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor CCIP message delivery and synchronized pauses across chains
        </p>
      </div>

      {/* Chain Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {CHAINS.map(chain => (
          <button
            key={chain.id}
            onClick={() => setActiveChain(chain)}
            className={cn(
              'glass rounded-xl p-4 text-left transition-all border-2',
              activeChain.id === chain.id 
                ? 'border-sentinel-500 bg-sentinel-500/10' 
                : 'border-transparent hover:border-white/10'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chain.color }}
                />
                <span className="font-semibold text-white">{chain.name}</span>
              </div>
              <div className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                chain.status === 'active' ? 'bg-green-500/20 text-green-400' :
                chain.status === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              )}>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  chain.status === 'active' && 'bg-green-400',
                  chain.status === 'syncing' && 'bg-yellow-400 animate-pulse',
                  chain.status === 'error' && 'bg-red-400'
                )} />
                {chain.status}
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Selector: {chain.selector}
            </p>
          </button>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Messages', value: stats.totalMessages, color: 'text-sentinel-400', icon: Server },
          { label: 'Delivered', value: stats.delivered, color: 'text-green-400', icon: CheckCircle },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-400', icon: Clock },
          { label: 'Avg Delivery', value: stats.avgDeliveryTime, color: 'text-blue-400', icon: Activity },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-sm">{stat.label}</span>
            </div>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* CCIP Message Flow Visualization */}
      <div className="glass rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Link2 className="h-5 w-5 text-sentinel-500" />
            Message Flow
          </h3>
          <button
            onClick={fetchMessages}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Chain Flow */}
        <div className="flex items-center justify-between relative py-8">
          {CHAINS.map((chain, i) => (
            <div key={chain.id} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center border-2',
                  activeChain.id === chain.id 
                    ? 'border-sentinel-500 bg-sentinel-500/20' 
                    : 'border-muted bg-muted/20'
                )}
              >
                <Globe className="h-6 w-6 text-white" />
              </motion.div>
              
              {i < CHAINS.length - 1 && (
                <div className="w-24 h-0.5 bg-border relative mx-2">
                  {/* Animated message dots */}
                  {messages.some(m => 
                    (m.sourceChain === chain.name && m.destChain === CHAINS[i + 1].name) ||
                    (m.sourceChain === CHAINS[i + 1].name && m.destChain === chain.name)
                  ) && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-sentinel-500 rounded-full"
                      animate={{ left: ['0%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chain Labels */}
        <div className="flex justify-between px-2">
          {CHAINS.map(chain => (
            <div key={chain.id} className="text-center w-16">
              <p className="text-xs text-muted-foreground">{chain.name.split(' ')[0]}</p>
              <p className="text-xs font-mono text-sentinel-400">{chain.selector.slice(0, 6)}...</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent CCIP Messages */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-sentinel-500" />
            Recent CCIP Messages
          </h3>
          <a 
            href="https://ccip.chain.link/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sentinel-400 hover:text-sentinel-300 flex items-center gap-1"
          >
            View on CCIP Explorer
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="divide-y divide-border/30">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No cross-chain messages yet</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      msg.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {msg.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {msg.id.slice(0, 20)}...
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Source → Destination</p>
                    <p className="text-white">{msg.sourceChain}</p>
                    <p className="text-muted-foreground">↓</p>
                    <p className="text-white">{msg.destChain}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Victim Contract</p>
                    <p className="font-mono text-white">{msg.victim.slice(0, 16)}...</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Threat Hash</p>
                    <p className="font-mono text-white">{msg.threatHash.slice(0, 20)}...</p>
                  </div>
                </div>

                {msg.status === 'delivered' && (
                  <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Pause synchronized successfully</span>
                  </div>
                )}

                {msg.status === 'pending' && (
                  <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span>Awaiting delivery confirmation...</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">How Cross-Chain Pause Works</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'Threat Detected', desc: 'Sentinel detects CRITICAL threat on source chain' },
            { step: 2, title: 'Local Pause', desc: 'Emergency pause executed on source chain' },
            { step: 3, title: 'CCIP Message', desc: 'Message sent to all linked chains via CCIP' },
            { step: 4, title: 'Sync Pause', desc: 'Target chains receive and execute pause' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-sentinel-500/20 text-sentinel-400 flex items-center justify-center font-semibold">
                {step}
              </span>
              <div>
                <p className="font-medium text-white text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
