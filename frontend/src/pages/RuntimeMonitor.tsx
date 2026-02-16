import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  AlertTriangle, 
  AlertOctagon,
  Play, 
  Pause,
  Clock,
  Zap,
  Shield,
  Radio,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useHeuristics, HeuristicThreat } from '../hooks/useHeuristics'

const threatColors: Record<string, { bg: string; text: string; icon: any }> = {
  FLASH_LOAN_DRAIN: { bg: 'bg-red-500/20', text: 'text-red-400', icon: Zap },
  PRICE_MANIPULATION: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
  REENTRANCY_DRAIN: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertOctagon },
  GAS_ANOMALY: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Activity },
  LARGE_TRANSFER: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: FileText },
}

const severityColors: Record<string, string> = {
  CRITICAL: 'text-red-500',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-blue-500'
}

export default function RuntimeMonitor() {
  const [activeTab, setActiveTab] = useState<'live' | 'threats' | 'demo'>('live')
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null)
  
  const {
    runHeuristicScan,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    threats,
    recentTxs,
    stats
  } = useHeuristics()

  // Start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring(30000) // Every 30 seconds
    return cleanup
  }, [startMonitoring])

  const handleManualScan = async () => {
    toast.promise(runHeuristicScan(), {
      loading: 'Running heuristic scan...',
      success: (criticalThreats) => {
        if (criticalThreats.length > 0) {
          return `Found ${criticalThreats.length} CRITICAL threats!`
        }
        return 'No critical threats detected'
      },
      error: 'Scan failed'
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Runtime Monitor</h1>
            <p className="mt-2 text-muted-foreground">
              Real-time transaction analysis using deterministic heuristics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              isMonitoring ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            )}>
              <Radio className={cn('h-4 w-4', isMonitoring && 'animate-pulse')} />
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </div>
            <button
              onClick={handleManualScan}
              disabled={isMonitoring}
              className="flex items-center gap-2 px-4 py-2 bg-sentinel-600 text-white rounded-lg hover:bg-sentinel-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isMonitoring && 'animate-spin')} />
              Scan Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { 
            label: 'Active Threats', 
            value: threats.length.toString(), 
            color: threats.length > 0 ? 'text-red-400' : 'text-green-400',
            icon: AlertOctagon 
          },
          { 
            label: 'Critical Alerts', 
            value: stats.criticalCount.toString(), 
            color: stats.criticalCount > 0 ? 'text-red-400' : 'text-muted-foreground',
            icon: AlertTriangle 
          },
          { 
            label: 'Last Scan', 
            value: stats.lastScan ? stats.lastScan.toLocaleTimeString() : 'Never', 
            color: 'text-sentinel-400',
            icon: Clock 
          },
          { 
            label: 'Avg Gas', 
            value: stats.avgGasUsed.toLocaleString(), 
            color: 'text-blue-400',
            icon: Activity 
          },
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

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {['live', 'threats', 'demo'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
              activeTab === tab 
                ? 'bg-sentinel-600 text-white' 
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'live' && (
          <>
            {/* Live Transaction Feed */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-sentinel-500" />
                  Live Transaction Feed
                </h3>
                <span className="text-xs text-muted-foreground">Last 10 blocks</span>
              </div>
              <div className="divide-y divide-border/30">
                {recentTxs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
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
                            tx.threats.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                          )} />
                          <div>
                            <p className="font-mono text-sm text-white">
                              {tx.hash.slice(0, 12)}...{tx.hash.slice(-8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.from.slice(0, 6)}... → {tx.to.slice(0, 6)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{formatValue(tx.value)}</p>
                          <p className="text-xs text-muted-foreground">{tx.gasUsed.toLocaleString()} gas</p>
                        </div>
                      </div>
                      
                      {/* Threat badges */}
                      {tx.threats.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {tx.threats.map((threat, idx) => {
                            const colors = threatColors[threat.pattern] || threatColors.GAS_ANOMALY
                            return (
                              <span
                                key={idx}
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                                  colors.bg,
                                  colors.text
                                )}
                              >
                                <colors.icon className="h-3 w-3" />
                                {threat.pattern}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'threats' && (
          <>
            {/* Threat Alerts */}
            <div className="space-y-4">
              {threats.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Active Threats</h3>
                  <p className="text-muted-foreground">
                    Sentinel is monitoring the network. Any detected threats will appear here.
                  </p>
                </div>
              ) : (
                threats.map((threat, i) => (
                  <motion.div
                    key={threat.txHash + i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'glass rounded-xl overflow-hidden',
                      threat.level === 'CRITICAL' && 'border border-red-500/30'
                    )}
                  >
                    <button
                      onClick={() => setExpandedThreat(expandedThreat === threat.txHash ? null : threat.txHash)}
                      className="w-full p-6 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'p-3 rounded-lg',
                            threatColors[threat.pattern]?.bg || 'bg-muted'
                          )}>
                            {(threatColors[threat.pattern]?.icon || AlertTriangle)({ className: 'h-6 w-6' })}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn('font-bold', severityColors[threat.level])}>
                                {threat.level}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-semibold text-white">{threat.pattern}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {threat.victim.slice(0, 8)}...{threat.victim.slice(-6)} • 
                              Confidence: {(threat.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {new Date(threat.timestamp).toLocaleTimeString()}
                          </span>
                          {expandedThreat === threat.txHash ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
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
                          <div className="px-6 pb-6 border-t border-border/50 pt-4">
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground mb-1">Attacker</p>
                                <p className="font-mono text-white">{threat.attacker}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Transaction</p>
                                <p className="font-mono text-white">{threat.txHash}</p>
                              </div>
                              {threat.estimatedLoss && (
                                <div>
                                  <p className="text-muted-foreground mb-1">Estimated Loss</p>
                                  <p className="text-red-400 font-semibold">{formatValue(threat.estimatedLoss)}</p>
                                </div>
                              )}
                            </div>
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                              <p className="text-muted-foreground text-sm mb-1">Details</p>
                              <p className="text-white">{threat.details}</p>
                            </div>
                            
                            {threat.level === 'CRITICAL' && (
                              <div className="mt-4 flex gap-3">
                                <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
                                  Trigger Emergency Pause
                                </button>
                                <button className="px-4 py-2 border border-border hover:bg-white/5 text-white rounded-lg font-medium transition-colors">
                                  View on Explorer
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'demo' && (
          <div className="glass rounded-xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">0-Day Exploit Demo</h3>
            <p className="text-muted-foreground mb-6">
              This demo shows how Sentinel detects a novel exploit that AI code analysis would miss.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">1</span>
                  Static Analysis (AI)
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Code appears safe:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• No standard reentrancy pattern</li>
                    <li>• No obvious overflow</li>
                    <li>• Access control present</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-500/10 rounded border border-green-500/20">
                    <p className="text-green-400 font-medium">AI Result: SAFE ✓</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/30 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm">2</span>
                  Runtime Analysis (Heuristics)
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Transaction detected:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Flash loan initiated</li>
                    <li>• Multiple swaps in sequence</li>
                    <li>• Large value transfer out</li>
                    <li>• Invariant violation pattern</li>
                  </ul>
                  <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20">
                    <p className="text-red-400 font-medium">Heuristic Result: CRITICAL ⚠</p>
                    <p className="text-red-400/80 text-xs mt-1">Pattern: INVARIANT_VIOLATION</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-sentinel-500/10 rounded-lg border border-sentinel-500/20">
              <p className="text-sentinel-400 font-medium">
                "Sentinel doesn't need to understand the bug. It recognizes the theft."
              </p>
            </div>
          </div>
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
