/**
 * Fraud Score Panel Component
 * 
 * Real-time fraud score visualization with threat indicators
 * Shows transaction analysis and auto-pause status
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  AlertTriangle, 
  Activity,
  Zap,
  Lock,
  Unlock,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  FileSearch,
  BarChart3
} from 'lucide-react'
import type { FraudAnalysis, ThreatEvent, ThreatLevel } from '../hooks/useFraudMonitor'

interface FraudScorePanelProps {
  analysis: FraudAnalysis | null
  threats: ThreatEvent[]
  isMonitoring: boolean
  stats: {
    totalScans: number
    threatsDetected: number
    autoPauses: number
    lastBlock: number
  }
  thresholds: {
    AUTO_PAUSE: number
    CRITICAL: number
    HIGH: number
    MEDIUM: number
    LOW: number
  }
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-red-500'
  if (score >= 75) return 'text-neutral-500'
  if (score >= 50) return 'text-yellow-500'
  if (score >= 30) return 'text-blue-400'
  return 'text-emerald-400'
}

const getScoreBg = (score: number) => {
  if (score >= 90) return 'bg-red-500'
  if (score >= 75) return 'bg-neutral-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 30) return 'bg-blue-500'
  return 'bg-emerald-500'
}

const getThreatIcon = (level: ThreatLevel) => {
  switch (level) {
    case 'CRITICAL':
      return <AlertOctagon className="w-6 h-6 text-red-500" />
    case 'HIGH':
      return <AlertTriangle className="w-6 h-6 text-neutral-500" />
    case 'MEDIUM':
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />
    case 'LOW':
      return <FileSearch className="w-6 h-6 text-blue-400" />
    default:
      return <Shield className="w-6 h-6 text-emerald-400" />
  }
}

const FraudGauge = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  return (
    <div className="relative w-32 h-32">
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-slate-800"
        />
        {/* Progress circle */}
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${getScoreColor(score)} transition-all duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-neutral-500">/100</span>
      </div>
    </div>
  )
}

const ThreatBadge = ({ level }: { level: ThreatLevel }) => {
  const colors = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    INFO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    NONE: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${colors[level]}`}>
      {level}
    </span>
  )
}

const FactorItem = ({ factor }: { factor: FraudAnalysis['factors'][0] }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-800/30 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${getScoreBg(factor.weight)}`} />
          <span className="text-sm text-slate-200">{factor.type}</span>
          <span className="text-xs text-neutral-500">+{factor.weight}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 text-sm text-neutral-400">
              <p className="mb-2">{factor.description}</p>
              {factor.evidence && (
                <pre className="text-xs bg-slate-900/50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(factor.evidence, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const ThreatRow = ({ threat }: { threat: ThreatEvent }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`border-l-2 ${
        threat.level === 'CRITICAL' ? 'border-red-500' :
        threat.level === 'HIGH' ? 'border-neutral-500' :
        threat.level === 'MEDIUM' ? 'border-yellow-500' :
        'border-blue-500'
      } bg-slate-800/20`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors"
      >
        {getThreatIcon(threat.level)}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">{threat.level}</span>
            <span className="text-xs text-neutral-500">
              {new Date(threat.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            {threat.txHash.slice(0, 20)}...
          </div>
        </div>
        <div className="flex items-center gap-2">
          {threat.actionTaken === 'PAUSE_TRIGGERED' && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
              PAUSED
            </span>
          )}
          <span className={`font-bold ${getScoreColor(threat.fraudAnalysis.score)}`}>
            {threat.fraudAnalysis.score}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <div className="text-xs text-neutral-500">
                <span className="text-neutral-400">Contract:</span> {threat.contractAddress}
              </div>
              <div className="text-xs text-neutral-500">
                <span className="text-neutral-400">From:</span> {threat.from}
              </div>
              <div className="text-xs text-neutral-500">
                <span className="text-neutral-400">Confidence:</span> {(threat.confidence * 100).toFixed(0)}%
              </div>
              <div className="space-y-1">
                {threat.fraudAnalysis.factors.map((factor, idx) => (
                  <div key={idx} className="text-xs text-neutral-400 flex items-center gap-2">
                    <span className="text-neutral-200">+{factor.weight}</span>
                    {factor.type}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FraudScorePanel({ 
  analysis, 
  threats, 
  isMonitoring, 
  stats,
  thresholds 
}: FraudScorePanelProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'stats'>('current')

  const threatSummary = {
    critical: threats.filter(t => t.level === 'CRITICAL').length,
    high: threats.filter(t => t.level === 'HIGH').length,
    medium: threats.filter(t => t.level === 'MEDIUM').length,
    paused: threats.filter(t => t.actionTaken === 'PAUSE_TRIGGERED').length,
  }

  return (
    <div className="bg-neutral-900/50 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-300/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-neutral-200" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">Fraud Detection</h3>
              <p className="text-xs text-neutral-500">
                {isMonitoring ? (
                  <span className="text-emerald-400">● Active</span>
                ) : (
                  <span className="text-neutral-500">● Standby</span>
                )}
                {' '}• {stats.totalScans.toLocaleString()} scans
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {threatSummary.critical > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">
                {threatSummary.critical} CRITICAL
              </span>
            )}
            {threatSummary.paused > 0 && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                <Lock className="w-3 h-3 inline mr-1" />
                {threatSummary.paused} Paused
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {(['current', 'history', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-neutral-300/20 text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'history' && threats.length > 0 && (
                <span className="ml-1 text-xs">({threats.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'current' && (
          <div className="space-y-4">
            {analysis ? (
              <>
                {/* Score Gauge */}
                <div className="flex items-center justify-center py-4">
                  <FraudGauge score={analysis.score} />
                </div>

                {/* Threat Level */}
                <div className="flex items-center justify-center gap-3">
                  <ThreatBadge level={analysis.level} />
                  {analysis.recommendedAction === 'PAUSE' && (
                    <span className="flex items-center gap-1 text-red-400 text-sm">
                      <Zap className="w-4 h-4" />
                      AUTO-PAUSE ENABLED
                    </span>
                  )}
                </div>

                {/* Confidence */}
                <div className="text-center text-sm text-neutral-400">
                  Confidence: <span className="text-slate-200">{(analysis.confidence * 100).toFixed(0)}%</span>
                </div>

                {/* Factors */}
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">
                    Risk Factors ({analysis.factors.length})
                  </h4>
                  {analysis.factors.length > 0 ? (
                    analysis.factors.map((factor, idx) => (
                      <FactorItem key={idx} factor={factor} />
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No risk factors detected
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No transaction being analyzed</p>
                <p className="text-sm mt-1">
                  {isMonitoring 
                    ? 'Waiting for transactions...' 
                    : 'Start monitoring to analyze transactions'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {threats.length > 0 ? (
              threats.map((threat) => (
                <ThreatRow key={threat.id} threat={threat} />
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No threats detected</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Total Scans</div>
                <div className="text-xl font-bold text-slate-200">{stats.totalScans}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Threats</div>
                <div className="text-xl font-bold text-neutral-400">{stats.threatsDetected}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Auto-Pauses</div>
                <div className="text-xl font-bold text-red-400">{stats.autoPauses}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Last Block</div>
                <div className="text-xl font-bold text-slate-200">{stats.lastBlock}</div>
              </div>
            </div>

            {/* Threat Distribution */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-200 mb-3">Threat Distribution</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400 w-16">CRITICAL</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all"
                      style={{ 
                        width: `${threats.length ? (threatSummary.critical / threats.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-neutral-400 w-6">{threatSummary.critical}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 w-16">HIGH</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neutral-500 transition-all"
                      style={{ 
                        width: `${threats.length ? (threatSummary.high / threats.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-neutral-400 w-6">{threatSummary.high}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-400 w-16">MEDIUM</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 transition-all"
                      style={{ 
                        width: `${threats.length ? (threatSummary.medium / threats.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-neutral-400 w-6">{threatSummary.medium}</span>
                </div>
              </div>
            </div>

            {/* Thresholds */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-200 mb-3">Alert Thresholds</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-red-400">Auto-Pause</span>
                  <span className="text-neutral-400">≥{thresholds.AUTO_PAUSE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Critical</span>
                  <span className="text-neutral-400">≥{thresholds.CRITICAL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">High</span>
                  <span className="text-neutral-400">≥{thresholds.HIGH}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Medium</span>
                  <span className="text-neutral-400">≥{thresholds.MEDIUM}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FraudScorePanel
