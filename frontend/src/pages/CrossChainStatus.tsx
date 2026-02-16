import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Globe, 
  Shield, 
  Link2, 
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Server,
  Activity,
  Zap
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

// Stat card
function StatCard({ label, value, icon: Icon, color }: { 
  label: string; 
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <motion.div 
      className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-5"
      whileHover={{ y: -2, borderColor: 'rgba(251,191,36,0.3)' }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{label}</p>
          <p className={cn("text-2xl font-bold", color)}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
      </div>
    </motion.div>
  )
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Cross-Chain Status</h1>
            <p className="text-neutral-400 text-sm">Monitor CCIP message delivery and synchronized pauses</p>
          </div>
        </div>
      </motion.div>

      {/* Chain Selector */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {CHAINS.map(chain => (
          <button
            key={chain.id}
            onClick={() => setActiveChain(chain)}
            className={cn(
              'rounded-2xl p-5 text-left transition-all border-2',
              activeChain.id === chain.id 
                ? 'border-amber-500 bg-amber-500/10' 
                : 'border-white/10 bg-neutral-900/50 hover:border-white/20'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chain.color }}
                />
                <span className="font-semibold text-slate-50">{chain.name}</span>
              </div>
              <div className={cn(
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                chain.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                chain.status === 'syncing' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              )}>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  chain.status === 'active' && 'bg-emerald-400',
                  chain.status === 'syncing' && 'bg-amber-400 animate-pulse',
                  chain.status === 'error' && 'bg-red-400'
                )} />
                {chain.status}
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-mono">
              Selector: {chain.selector}
            </p>
          </button>
        ))}
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StatCard label="Total Messages" value={stats.totalMessages} icon={Server} color="text-amber-400" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle} color="text-emerald-400" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="text-yellow-400" />
        <StatCard label="Avg Delivery" value={stats.avgDeliveryTime} icon={Activity} color="text-blue-400" />
      </motion.div>

      {/* CCIP Message Flow Visualization */}
      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-50 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-amber-400" />
            Message Flow
          </h3>
          <button
            onClick={fetchMessages}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-slate-50 transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Chain Flow */}
        <div className="flex items-center justify-between relative py-8 px-4">
          {CHAINS.map((chain, i) => (
            <div key={chain.id} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center border-2',
                  activeChain.id === chain.id 
                    ? 'border-amber-500 bg-amber-500/20' 
                    : 'border-white/10 bg-neutral-800'
                )}
              >
                <Globe className="h-6 w-6 text-slate-50" />
              </motion.div>
              
              {i < CHAINS.length - 1 && (
                <div className="w-24 md:w-32 h-0.5 bg-neutral-800 relative mx-2">
                  {messages.some(m => 
                    (m.sourceChain === chain.name && m.destChain === CHAINS[i + 1].name) ||
                    (m.sourceChain === CHAINS[i + 1].name && m.destChain === chain.name)
                  ) && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50"
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
              <p className="text-xs text-neutral-400">{chain.name.split(' ')[0]}</p>
              <p className="text-xs font-mono text-amber-400">{chain.selector.slice(0, 6)}...</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent CCIP Messages */}
      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-slate-50 flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            Recent CCIP Messages
          </h3>
          <a 
            href="https://ccip.chain.link/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            CCIP Explorer
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="divide-y divide-white/5">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
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
                      'px-2 py-1 rounded-lg text-xs font-medium',
                      msg.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                      msg.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    )}>
                      {msg.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-neutral-400">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">
                    {msg.id.slice(0, 20)}...
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5">
                    <p className="text-neutral-500 text-xs mb-1">Source → Destination</p>
                    <p className="text-slate-50">{msg.sourceChain}</p>
                    <p className="text-neutral-500">↓</p>
                    <p className="text-slate-50">{msg.destChain}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5">
                    <p className="text-neutral-500 text-xs mb-1">Victim Contract</p>
                    <p className="font-mono text-slate-50">{msg.victim.slice(0, 16)}...</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/5">
                    <p className="text-neutral-500 text-xs mb-1">Threat Hash</p>
                    <p className="font-mono text-slate-50">{msg.threatHash.slice(0, 20)}...</p>
                  </div>
                </div>

                {msg.status === 'delivered' && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Pause synchronized successfully</span>
                  </div>
                )}

                {msg.status === 'pending' && (
                  <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span>Awaiting delivery confirmation...</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div 
        className="mt-8 rounded-2xl border border-white/10 bg-neutral-900/50 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="font-semibold text-slate-50 mb-6">How Cross-Chain Pause Works</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'Threat Detected', desc: 'Sentinel detects CRITICAL threat on source chain', icon: Zap },
            { step: 2, title: 'Local Pause', desc: 'Emergency pause executed on source chain', icon: Shield },
            { step: 3, title: 'CCIP Message', desc: 'Message sent to all linked chains via CCIP', icon: Globe },
            { step: 4, title: 'Sync Pause', desc: 'Target chains receive and execute pause', icon: CheckCircle },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                {step < 4 && <div className="w-px h-full bg-white/10 my-2" />}
              </div>
              <div className="pb-8">
                <div className="text-amber-500 text-xs font-bold mb-1">Step {step}</div>
                <p className="font-medium text-slate-50 text-sm">{title}</p>
                <p className="text-xs text-neutral-400 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
