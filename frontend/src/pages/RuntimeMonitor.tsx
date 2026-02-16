import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  AlertTriangle, 
  AlertOctagon,
  Clock,
  Zap,
  Shield,
  Radio,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Scan,
  Target,
  Cpu,
  Flame
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useHeuristics } from '../hooks/useHeuristics'

const threatColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  FLASH_LOAN_DRAIN: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-400', 
    border: 'border-red-500/30',
    icon: Zap 
  },
  PRICE_MANIPULATION: { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-400', 
    border: 'border-orange-500/30',
    icon: AlertTriangle 
  },
  REENTRANCY_DRAIN: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-400', 
    border: 'border-red-500/30',
    icon: AlertOctagon 
  },
  GAS_ANOMALY: { 
    bg: 'bg-yellow-500/10', 
    text: 'text-yellow-400', 
    border: 'border-yellow-500/30',
    icon: Activity 
  },
  LARGE_TRANSFER: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-400', 
    border: 'border-blue-500/30',
    icon: FileText 
  },
  INVARIANT_VIOLATION: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: Target
  }
}

const severityColors: Record<string, { text: string; bg: string; dot: string }> = {
  CRITICAL: { text: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  HIGH: { text: 'text-orange-400', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  MEDIUM: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-500' },
  LOW: { text: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-500' }
}

// Stat card
function StatCard({ label, value, subtext, icon: Icon, color }: { 
  label: string; 
  value: string | number; 
  subtext?: string;
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
          {subtext && (
            <p className="text-xs text-neutral-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
      </div>
    </motion.div>
  )
}

export default function RuntimeMonitor() {
  const [activeTab, setActiveTab] = useState<'live' | 'threats' | 'demo'>('live')
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null)
  
  const {
    runHeuristicScan,
    startMonitoring,
    isMonitoring,
    threats,
    recentTxs,
    stats
  } = useHeuristics()

  // Start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring(30000)
    return cleanup
  }, [startMonitoring])

  const handleManualScan = async () => {
    toast.promise(runHeuristicScan(), {
      loading: 'Running heuristic scan...',
      success: (criticalThreats: any[]) => {
        if (criticalThreats.length > 0) {
          return `Found ${criticalThreats.length} CRITICAL threats!`
        }
        return 'No critical threats detected'
      },
      error: 'Scan failed'
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Runtime Monitor</h1>
              <p className="text-neutral-400 text-sm">Real-time transaction analysis using deterministic heuristics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border',
              isMonitoring 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}>
              <Radio className={cn('h-4 w-4', isMonitoring && 'animate-pulse')} />
              <span className="text-sm font-medium">{isMonitoring ? 'Monitoring' : 'Stopped'}</span>
            </div>
            <button
              onClick={handleManualScan}
              disabled={isMonitoring}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-neutral-950 rounded-xl font-medium hover:bg-white transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/10"
            >
              <RefreshCw className={cn('h-4 w-4', isMonitoring && 'animate-spin')} />
              Scan Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard
          label="Active Threats"
          value={threats.length}
          subtext={threats.length > 0 ? 'Action required' : 'All clear'}
          icon={AlertOctagon}
          color={threats.length > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <StatCard
          label="Critical Alerts"
          value={stats.criticalCount}
          icon={Flame}
          color={stats.criticalCount > 0 ? 'text-red-400' : 'text-neutral-400'}
        />
        <StatCard
          label="Last Scan"
          value={stats.lastScan ? stats.lastScan.toLocaleTimeString() : 'Never'}
          icon={Clock}
          color="text-amber-400"
        />
        <StatCard
          label="Avg Gas"
          value={stats.avgGasUsed.toLocaleString()}
          icon={Cpu}
          color="text-blue-400"
        />
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 rounded-xl bg-neutral-900/50 border border-white/10 w-fit">
        {[
          { id: 'live', label: 'Live Feed', icon: Activity },
          { id: 'threats', label: 'Threats', icon: Shield },
          { id: 'demo', label: 'Demo', icon: Scan },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
              activeTab === tab.id 
                ? 'bg-amber-500 text-neutral-950' 
                : 'text-neutral-400 hover:text-slate-50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'live' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-slate-50 flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-400" />
                Live Transaction Feed
              </h3>
              <span className="text-xs text-neutral-500">Last 10 blocks</span>
            </div>
            <div className="divide-y divide-white/5">
              {recentTxs.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Waiting for transactions...</p>
                </div>
              ) : (
                recentTxs.map((tx, i) => (
                  <motion.div
                    key={tx.hash}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          tx.threats.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                        )} />
                        <div>
                          <p className="font-mono text-sm text-slate-50">
                            {tx.hash.slice(0, 12)}...{tx.hash.slice(-8)}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {tx.from.slice(0, 6)}... → {tx.to.slice(0, 6)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-50">{formatValue(tx.value)}</p>
                        <p className="text-xs text-neutral-500">{tx.gasUsed.toLocaleString()} gas</p>
                      </div>
                    </div>
                    
                    {tx.threats.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {tx.threats.map((threat: { pattern: string | number }, idx: number) => {
                          const colors = threatColors[threat.pattern] || threatColors.GAS_ANOMALY
                          return (
                            <span
                              key={idx}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border',
                                colors.bg,
                                colors.text,
                                colors.border
                              )}
                            >
                              <colors.icon className="h-3 w-3" />
                              {String(threat.pattern).replace(/_/g, ' ')}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'threats' && (
          <div className="space-y-4">
            {threats.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-neutral-900/50 p-12 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-50 mb-2">No Active Threats</h3>
                <p className="text-neutral-400">
                  Sentinel is monitoring the network. Any detected threats will appear here.
                </p>
              </motion.div>
            ) : (
              threats.map((threat, i) => {
                const severity = severityColors[threat.level] || severityColors.LOW
                const threatType = threatColors[threat.pattern] || threatColors.GAS_ANOMALY
                
                return (
                  <motion.div
                    key={threat.txHash + i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'rounded-2xl border overflow-hidden',
                      threat.level === 'CRITICAL' 
                        ? 'border-red-500/30 bg-red-500/5' 
                        : 'border-white/10 bg-neutral-900/50'
                    )}
                  >
                    <button
                      onClick={() => setExpandedThreat(expandedThreat === threat.txHash ? null : threat.txHash)}
                      className="w-full p-6 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center border',
                            threatType.bg,
                            threatType.border
                          )}>
                            <threatType.icon className={cn("h-6 w-6", threatType.text)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('px-2 py-0.5 rounded text-xs font-bold', severity.bg, severity.text)}>
                                {threat.level}
                              </span>
                              <span className="font-semibold text-slate-50">{threat.pattern.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-sm text-neutral-400">
                              {threat.victim.slice(0, 8)}...{threat.victim.slice(-6)} • 
                              Confidence: <span className="text-slate-50">{(threat.confidence * 100).toFixed(1)}%</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-neutral-500">
                            {new Date(threat.timestamp).toLocaleTimeString()}
                          </span>
                          {expandedThreat === threat.txHash ? (
                            <ChevronUp className="h-5 w-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedThreat === threat.txHash && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 border-t border-white/10 pt-4">
                            <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                              <div className="p-3 rounded-xl bg-neutral-950 border border-white/5">
                                <p className="text-neutral-500 text-xs mb-1">Attacker</p>
                                <p className="font-mono text-slate-50">{threat.attacker}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-neutral-950 border border-white/5">
                                <p className="text-neutral-500 text-xs mb-1">Transaction</p>
                                <p className="font-mono text-slate-50">{threat.txHash}</p>
                              </div>
                              {threat.estimatedLoss && (
                                <div className="p-3 rounded-xl bg-neutral-950 border border-white/5">
                                  <p className="text-neutral-500 text-xs mb-1">Estimated Loss</p>
                                  <p className="text-red-400 font-semibold">{formatValue(threat.estimatedLoss)}</p>
                                </div>
                              )}
                            </div>
                            <div className="p-4 rounded-xl bg-neutral-950 border border-white/5">
                              <p className="text-neutral-500 text-sm mb-1">Details</p>
                              <p className="text-slate-50">{threat.details}</p>
                            </div>
                            
                            {threat.level === 'CRITICAL' && (
                              <div className="mt-4 flex gap-3">
                                <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">
                                  Trigger Emergency Pause
                                </button>
                                <button className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-50 rounded-xl font-medium transition-colors">
                                  View on Explorer
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'demo' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-neutral-900/50 p-8"
          >
            <h3 className="text-xl font-semibold text-slate-50 mb-4">0-Day Exploit Demo</h3>
            <p className="text-neutral-400 mb-6">
              This demo shows how Sentinel detects a novel exploit that AI code analysis would miss.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h4 className="font-semibold text-slate-50 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-sm">1</span>
                  Static Analysis (AI)
                </h4>
                <div className="space-y-2 text-sm text-neutral-400">
                  <p>Code appears safe:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• No standard reentrancy pattern</li>
                    <li>• No obvious overflow</li>
                    <li>• Access control present</li>
                  </ul>
                  <div className="mt-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-emerald-400 font-medium">AI Result: SAFE ✓</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h4 className="font-semibold text-slate-50 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center text-sm">2</span>
                  Runtime Analysis (Heuristics)
                </h4>
                <div className="space-y-2 text-sm text-neutral-400">
                  <p>Transaction detected:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Flash loan initiated</li>
                    <li>• Multiple swaps in sequence</li>
                    <li>• Large value transfer out</li>
                    <li>• Invariant violation pattern</li>
                  </ul>
                  <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="text-red-400 font-medium">Heuristic Result: CRITICAL ⚠</p>
                    <p className="text-red-400/80 text-xs mt-1">Pattern: INVARIANT_VIOLATION</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <p className="text-amber-400 font-medium text-center">
                &quot;Sentinel doesn&apos;t need to understand the bug. It recognizes the theft.&quot;
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function formatValue(value: string): string {
  const val = BigInt(value || '0')
  const eth = Number(val) / 1e18
  if (eth > 1e6) return `${(eth / 1e6).toFixed(2)}M ETH`
  if (eth > 1e3) return `${(eth / 1e3).toFixed(2)}K ETH`
  if (eth < 0.001) return `${val.toString()} wei`
  return `${eth.toFixed(4)} ETH`
}
