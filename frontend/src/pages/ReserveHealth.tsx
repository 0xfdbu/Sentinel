/**
 * Reserve Health Page - Real-time Reserve Monitoring
 * 
 * Risk & Compliance Dashboard:
 * - TVL tracking and alerts
 * - Collateral ratio monitoring
 * - Health score visualization
 * - Risk profile management
 * - Compliance controls (KYC/whitelist)
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Activity,
  DollarSign,
  Lock,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Filter,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import {
  useReserveHealth,
  useHealthPolling,
  useTVLHistory,
  HealthStatus,
  RiskLevel,
  getHealthStatusLabel,
  getHealthStatusColor,
  getHealthStatusBg,
  getRiskLevelLabel,
  type ContractHealthData,
} from '../hooks/useReserveHealth'

// Components
function HealthScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * ((size - 12) / 2)
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 12) / 2}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-neutral-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 12) / 2}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-50">{score}</span>
        <span className="text-xs text-neutral-500">/100</span>
      </div>
    </div>
  )
}

function TVLChart({ data }: { data: { timestamp: number; tvl: number }[] }) {
  if (data.length === 0) return null

  const maxTVL = Math.max(...data.map(d => d.tvl))
  const minTVL = Math.min(...data.map(d => d.tvl))
  const range = maxTVL - minTVL || 1

  return (
    <div className="h-32 flex items-end gap-1">
      {data.slice(-30).map((point, i) => {
        const height = ((point.tvl - minTVL) / range) * 100
        const isUp = i > 0 && point.tvl >= data[i - 1].tvl
        
        return (
          <motion.div
            key={i}
            className={cn(
              "flex-1 rounded-t-sm min-w-[4px] max-w-[12px]",
              isUp ? "bg-emerald-500/60" : "bg-red-500/60"
            )}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(height, 5)}%` }}
            transition={{ duration: 0.3, delay: i * 0.01 }}
            title={`${point.tvl.toFixed(2)} ETH`}
          />
        )
      })}
    </div>
  )
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const labels = ['Healthy', 'Warning', 'Critical', 'Paused']
  const colors = [
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'bg-red-500/10 text-red-400 border-red-500/30',
    'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
  ]
  const icons = [CheckCircle, AlertTriangle, XCircle, Lock]
  const Icon = icons[status]

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      colors[status]
    )}>
      <Icon className="h-3 w-3" />
      {labels[status]}
    </span>
  )
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = {
    [RiskLevel.CONSERVATIVE]: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    [RiskLevel.MODERATE]: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    [RiskLevel.AGGRESSIVE]: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    [RiskLevel.CUSTOM]: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border",
      colors[level]
    )}>
      {getRiskLevelLabel(level)}
    </span>
  )
}

function ContractCard({ 
  data, 
  isExpanded, 
  onToggle,
  onRefresh,
}: { 
  data: ContractHealthData
  isExpanded: boolean
  onToggle: () => void
  onRefresh: () => void
}) {
  const tvlEth = Number(formatEther(data.metrics.tvl))
  const tvlFormatted = tvlEth >= 1000 
    ? `${(tvlEth / 1000).toFixed(2)}K` 
    : tvlEth.toFixed(2)

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border transition-all overflow-hidden",
        isExpanded ? "border-amber-500/30 bg-neutral-900/80" : "border-white/10 bg-neutral-900/50 hover:border-amber-500/20"
      )}
    >
      {/* Header */}
      <div 
        className="p-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center border-2",
              getHealthStatusBg(data.status)
            )}>
              <Heart className={cn("w-6 h-6", getHealthStatusColor(data.status))} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-50">{data.name}</h3>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-sm text-neutral-500 font-mono mt-0.5">
                {data.address.slice(0, 8)}...{data.address.slice(-6)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-neutral-500">TVL</p>
              <p className="text-lg font-bold text-slate-50">{tvlFormatted} ETH</p>
            </div>
            <div className={cn(
              "flex items-center gap-1 text-sm",
              data.tvlChange24h >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {data.tvlChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(data.tvlChange24h).toFixed(2)}%
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh() }}
              className="p-2 text-neutral-400 hover:text-amber-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-neutral-500" /> : <ChevronDown className="w-5 h-5 text-neutral-500" />}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/5">
          <div>
            <p className="text-xs text-neutral-500">Health Score</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                data.metrics.healthScore >= 80 ? "bg-emerald-400" : 
                data.metrics.healthScore >= 50 ? "bg-amber-400" : "bg-red-400"
              )} />
              <span className={cn(
                "font-medium",
                data.metrics.healthScore >= 80 ? "text-emerald-400" : 
                data.metrics.healthScore >= 50 ? "text-amber-400" : "text-red-400"
              )}>
                {data.metrics.healthScore}/100
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Collateral Ratio</p>
            <p className="font-medium text-slate-50 mt-1">
              {(Number(data.metrics.collateralRatio) / 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Risk Profile</p>
            <div className="mt-1">
              {data.riskProfile ? (
                <RiskBadge level={data.riskProfile.level} />
              ) : (
                <span className="text-neutral-500 text-sm">Not set</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Last Update</p>
            <p className="font-medium text-slate-50 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              {new Date(Number(data.metrics.lastUpdateTime) * 1000).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-5 grid grid-cols-2 gap-6">
              {/* Left: TVL Chart */}
              <div>
                <h4 className="text-sm font-medium text-slate-50 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  TVL History (30 Days)
                </h4>
                <div className="bg-neutral-950/50 rounded-xl p-4 border border-white/5">
                  <TVLHistoryChart contractAddr={data.address} />
                </div>
              </div>

              {/* Right: Alerts & Thresholds */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-50 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Alerts & Thresholds
                </h4>

                {/* Active Alerts */}
                {data.alerts.length > 0 && (
                  <div className="space-y-2">
                    {data.alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-2 p-3 rounded-lg text-sm",
                          alert.severity === 'critical' ? "bg-red-500/10 border border-red-500/30" :
                          alert.severity === 'warning' ? "bg-amber-500/10 border border-amber-500/30" :
                          "bg-blue-500/10 border border-blue-500/30"
                        )}
                      >
                        <AlertCircle className={cn(
                          "w-4 h-4 flex-shrink-0 mt-0.5",
                          alert.severity === 'critical' ? "text-red-400" :
                          alert.severity === 'warning' ? "text-amber-400" :
                          "text-blue-400"
                        )} />
                        <div>
                          <p className={cn(
                            "font-medium",
                            alert.severity === 'critical' ? "text-red-400" :
                            alert.severity === 'warning' ? "text-amber-400" :
                            "text-blue-400"
                          )}>
                            {alert.message}
                          </p>
                          {alert.value && (
                            <p className="text-neutral-400 text-xs mt-0.5">{alert.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thresholds */}
                <div className="bg-neutral-950/50 rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Max TVL Drop</span>
                    <span className="text-slate-50">{(Number(data.config.thresholds.maxTVLDropPercent) / 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Min Health Score</span>
                    <span className="text-slate-50">{data.config.thresholds.minHealthScore.toString()}/100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Auto-Pause</span>
                    <span className={data.config.thresholds.autoPauseEnabled ? "text-emerald-400" : "text-neutral-500"}>
                      {data.config.thresholds.autoPauseEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Profile Details */}
            {data.riskProfile && (
              <div className="px-5 pb-5">
                <h4 className="text-sm font-medium text-slate-50 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Risk Profile: {getRiskLevelLabel(data.riskProfile.level)}
                </h4>
                <div className="grid grid-cols-4 gap-4 bg-neutral-950/50 rounded-xl p-4 border border-white/5">
                  <div>
                    <p className="text-xs text-neutral-500">Daily Volume Limit</p>
                    <p className="font-medium text-slate-50 mt-1">
                      {Number(formatEther(data.riskProfile.maxDailyVolume)).toFixed(0)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Max Tx Value</p>
                    <p className="font-medium text-slate-50 mt-1">
                      {Number(formatEther(data.riskProfile.maxSingleTxValue)).toFixed(0)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">KYC Required</p>
                    <p className={cn(
                      "font-medium mt-1",
                      data.riskProfile.requireKYC ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {data.riskProfile.requireKYC ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Whitelist Only</p>
                    <p className={cn(
                      "font-medium mt-1",
                      data.riskProfile.requireWhitelist ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {data.riskProfile.requireWhitelist ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => toast.success('Risk profile settings opened')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors border border-amber-500/30"
              >
                <Settings className="w-4 h-4" />
                Configure Risk Profile
              </button>
              <button
                onClick={() => toast.success('Monitoring settings opened')}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-slate-50 rounded-lg text-sm font-medium transition-colors"
              >
                <Activity className="w-4 h-4" />
                Adjust Thresholds
              </button>
              {data.status !== HealthStatus.PAUSED && (
                <button
                  onClick={() => toast.success('Emergency pause initiated')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/30 ml-auto"
                >
                  <Lock className="w-4 h-4" />
                  Emergency Pause
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// TVL History Chart Component
function TVLHistoryChart({ contractAddr }: { contractAddr: string }) {
  const history = useTVLHistory(contractAddr as `0x${string}`)
  
  return <TVLChart data={history} />
}

// Summary Stats Component
function SummaryStats({ healthData }: { healthData: ContractHealthData[] }) {
  const stats = useMemo(() => {
    const totalTVL = healthData.reduce((sum, d) => sum + Number(formatEther(d.metrics.tvl)), 0)
    const avgHealthScore = healthData.length > 0 
      ? Math.round(healthData.reduce((sum, d) => sum + d.metrics.healthScore, 0) / healthData.length)
      : 0
    const criticalCount = healthData.filter(d => d.status === HealthStatus.CRITICAL).length
    const warningCount = healthData.filter(d => d.status === HealthStatus.WARNING).length
    
    return { totalTVL, avgHealthScore, criticalCount, warningCount }
  }, [healthData])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Total TVL</p>
            <p className="text-2xl font-bold text-slate-50">{stats.totalTVL.toFixed(1)} ETH</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Avg Health Score</p>
            <p className={cn(
              "text-2xl font-bold",
              stats.avgHealthScore >= 80 ? "text-emerald-400" :
              stats.avgHealthScore >= 50 ? "text-amber-400" : "text-red-400"
            )}>
              {stats.avgHealthScore}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Critical Alerts</p>
            <p className={cn(
              "text-2xl font-bold",
              stats.criticalCount > 0 ? "text-red-400" : "text-slate-50"
            )}>
              {stats.criticalCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500 mb-1">Warnings</p>
            <p className={cn(
              "text-2xl font-bold",
              stats.warningCount > 0 ? "text-amber-400" : "text-slate-50"
            )}>
              {stats.warningCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Main Page Component
export default function ReserveHealth() {
  const { isConnected } = useAccount()
  const { healthData, isLoading, refetch } = useHealthPolling(30000)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all')

  const filteredData = useMemo(() => {
    if (filter === 'all') return healthData
    const statusMap: Record<string, HealthStatus> = {
      healthy: HealthStatus.HEALTHY,
      warning: HealthStatus.WARNING,
      critical: HealthStatus.CRITICAL,
    }
    return healthData.filter(d => d.status === statusMap[filter])
  }, [healthData, filter])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Heart className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Reserve Health</h1>
            <p className="text-sm text-neutral-400">Real-time reserve monitoring & compliance</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-900/50 rounded-xl p-1 border border-white/10">
            {(['all', 'healthy', 'warning', 'critical'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                  filter === f 
                    ? "bg-amber-500 text-neutral-950" 
                    : "text-neutral-400 hover:text-slate-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2.5 bg-neutral-900/50 hover:bg-neutral-800 border border-white/10 rounded-xl text-neutral-400 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => toast.success('Add monitoring flow opened')}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Monitoring
          </button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="mb-8">
        <SummaryStats healthData={healthData} />
      </div>

      {/* Info Banner */}
      <motion.div 
        className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-400">Risk & Compliance Track</h4>
            <p className="text-sm text-neutral-400 mt-1">
              Sentinel monitors reserve health using Chainlink Price Feeds for depeg detection, 
              TVL change alerts, and automated circuit breakers. Configure risk profiles to 
              match your compliance requirements.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Contracts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 border border-white/10 rounded-2xl bg-neutral-900/30">
            <Heart className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">
              {filter === 'all' 
                ? 'No contracts being monitored yet' 
                : `No contracts with ${filter} status`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => toast.success('Add monitoring flow opened')}
                className="mt-4 text-amber-400 hover:text-amber-300 text-sm"
              >
                Add your first contract →
              </button>
            )}
          </div>
        ) : (
          filteredData.map((contract, index) => (
            <motion.div
              key={contract.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ContractCard
                data={contract}
                isExpanded={expandedCard === contract.address}
                onToggle={() => setExpandedCard(
                  expandedCard === contract.address ? null : contract.address
                )}
                onRefresh={refetch}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
