import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  AlertOctagon,
  FileCode,
  Zap,
  Loader2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  History,
  Globe,
  Cpu,
  Scan,

  Sparkles,
  Terminal,
  Bug,

  Timer
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useScannerCRE, Severity, CRELogEntry } from '../hooks/useScannerCRE'
import { useGuardian } from '../hooks/useContracts'

const severityConfig: Record<Severity, { 
  color: string; 
  bg: string; 
  border: string;
  icon: any;
  label: string;
  gradient: string;
}> = {
  CRITICAL: { 
    color: 'text-red-400', 
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: AlertOctagon,
    label: 'Critical Risk',
    gradient: 'from-red-500 to-rose-600'
  },
  HIGH: { 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
    label: 'High Risk',
    gradient: 'from-orange-500 to-amber-500'
  },
  MEDIUM: { 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: AlertCircle,
    label: 'Medium Risk',
    gradient: 'from-yellow-400 to-yellow-500'
  },
  LOW: { 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: ShieldCheck,
    label: 'Low Risk',
    gradient: 'from-blue-400 to-blue-500'
  },
  SAFE: { 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle,
    label: 'Safe',
    gradient: 'from-emerald-400 to-emerald-500'
  },
}

// Animated scanning rings
function ScanningAnimation() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-amber-500/20"
          initial={{ width: 100, height: 100, opacity: 0 }}
          animate={{ 
            width: [100, 400, 600], 
            height: [100, 400, 600], 
            opacity: [0.5, 0.3, 0] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: i * 0.6,
            ease: "easeOut"
          }}
        />
      ))}
      <motion.div
        className="absolute w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )
}

// Stat card
function StatCard({ label, value, subtext, icon: Icon, trend }: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <motion.div 
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-5"
      whileHover={{ y: -2, borderColor: 'rgba(251,191,36,0.3)' }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-50">{value}</p>
          {subtext && (
            <p className={cn(
              "text-xs mt-1",
              trend === 'up' ? "text-emerald-400" : trend === 'down' ? "text-red-400" : "text-neutral-500"
            )}>
              {subtext}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
      </div>
    </motion.div>
  )
}

// Scan step indicator
function ScanProgress({ status, progress }: { status: string; progress: number }) {
  const steps = [
    { id: 'fetching', label: 'Fetch', icon: FileCode },
    { id: 'analyzing', label: 'Analyze', icon: Cpu },
    { id: 'complete', label: 'Complete', icon: ShieldCheck },
  ]
  
  const currentStep = steps.findIndex(s => status.toLowerCase().includes(s.id))
  const currentProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="h-1 bg-neutral-800 rounded-full overflow-hidden mb-4">
        <motion.div 
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${currentProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Steps */}
      <div className="flex justify-between">
        {steps.map((step, i) => {
          const isActive = i <= currentStep && currentStep >= 0
          const isCurrent = i === currentStep
          
          return (
            <div key={step.id} className="flex items-center gap-2">
              <motion.div 
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  isActive ? "bg-amber-500 text-neutral-950" : "bg-neutral-800 text-neutral-500"
                )}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0 }}
              >
                {isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </motion.div>
              <span className={cn(
                "text-sm font-medium hidden sm:block",
                isActive ? "text-amber-400" : "text-neutral-500"
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Console Log Component
function ConsoleLog({ logs, isScanning }: { logs: CRELogEntry[]; isScanning: boolean }) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warn': return '⚠️ '
      case 'info': return 'ℹ️ '
      case 'simulation': return '⚙️ '
      case 'result': return '📊'
      default: return '  '
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-emerald-400'
      case 'error': return 'text-red-400'
      case 'warn': return 'text-amber-400'
      case 'info': return 'text-blue-400'
      case 'simulation': return 'text-purple-400'
      case 'result': return 'text-cyan-400'
      default: return 'text-neutral-400'
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-medium text-neutral-400">CRE Workflow Console</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isScanning && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-400">Running...</span>
            </>
          )}
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.length === 0 ? (
          <div className="text-neutral-600 italic">Waiting for scan to start...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-neutral-600 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </span>
              <span className="shrink-0">{getLevelIcon(log.level)}</span>
              <span className={cn("break-all", getLevelColor(log.level))}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isConnected } = useAccount()
  const [contractAddress, setContractAddress] = useState('')
  const [chainId, setChainId] = useState(11155111)
  const [recentScans, setRecentScans] = useState<Array<{
    address: string;
    severity: Severity;
    timestamp: Date;
    category: string;
  }>>([])
  
  const { scanContract, isScanning, status, result, creLogs, progress } = useScannerCRE()
  const { emergencyPause } = useGuardian()

  const handleScan = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    const scanResult = await scanContract(contractAddress, chainId)
    
    if (scanResult) {
      setRecentScans(prev => [{
        address: contractAddress,
        severity: scanResult.severity || 'SAFE',
        timestamp: new Date(),
        category: scanResult.category || 'None',
      }, ...prev].slice(0, 5))
    }
  }

  const handleEmergencyPause = async () => {
    if (!isConnected || !result) return
    
    try {
      const vulnHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      
      await emergencyPause(contractAddress, vulnHash)
      toast.success('Emergency pause executed!')
    } catch (error) {
      toast.error('Failed to execute pause')
    }
  }

  // Quick scan presets (Sepolia testnet)
  const quickScans = [
    { label: 'Pausable Vulnerable Vault', address: '0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C' },
    { label: 'Reentrancy Vault', address: '0x1234567890123456789012345678901234567890' },
    { label: 'Flash Loan Pool', address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Scan className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Security Scanner</h1>
            <p className="text-neutral-400 text-sm">AI-powered vulnerability detection</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard 
          label="Total Scans" 
          value="1,247" 
          subtext="+23 this week"
          icon={History}
          trend="up"
        />
        <StatCard 
          label="Active Alerts" 
          value="3" 
          subtext="1 Critical"
          icon={AlertTriangle}
          trend="up"
        />
        <StatCard 
          label="Protected Value" 
          value="$47.2M" 
          subtext="+12% this month"
          icon={Shield}
          trend="up"
        />
        <StatCard 
          label="Avg Response" 
          value="< 3s" 
          icon={Timer}
        />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Scanner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input Card */}
          <motion.div 
            className="relative rounded-3xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isScanning && <ScanningAnimation />}
            
            <div className="relative p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Sparkles className="w-6 h-6 text-neutral-950" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50">AI Contract Scanner</h3>
                    <p className="text-sm text-neutral-500">Powered by xAI Grok + Runtime Heuristics</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">System Online</span>
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <FileCode className="w-5 h-5 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="Enter contract address (0x...)"
                    className="w-full pl-12 pr-4 py-4 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors font-mono text-sm"
                    disabled={isScanning}
                  />
                </div>

                <div className="flex gap-3">
                  <select
                    value={chainId}
                    onChange={(e) => setChainId(Number(e.target.value))}
                    className="px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 focus:outline-none focus:border-amber-500/50 text-sm"
                    disabled={isScanning}
                  >
                    <option value={31337}>Hardhat Local</option>
                    <option value={11155111}>Sepolia Testnet</option>
                    <option value={1}>Ethereum Mainnet</option>
                  </select>
                  
                  <button
                    onClick={handleScan}
                    disabled={isScanning || !contractAddress || !isConnected}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                      isScanning || !contractAddress || !isConnected
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-slate-50 text-neutral-950 hover:bg-white hover:scale-[1.02] shadow-lg shadow-amber-500/10"
                    )}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Start Scan
                      </>
                    )}
                  </button>
                </div>

                {/* Scan Progress */}
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t border-white/10"
                  >
                    <ScanProgress status={status.step} progress={progress} />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Console Log Panel */}
          {(isScanning || creLogs.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Workflow Logs
                </h3>
                <ConsoleLog logs={creLogs} isScanning={isScanning} />
              </div>
            </motion.div>
          )}

          {/* Results Panel */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "rounded-3xl border overflow-hidden",
                  severityConfig[result.severity].border,
                  severityConfig[result.severity].bg.replace('/10', '/5')
                )}
              >
                {/* Result Header */}
                <div className={cn("p-6 border-b", severityConfig[result.severity].border)}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                        severityConfig[result.severity].gradient
                      )}>
                        {(() => {
                          const Icon = severityConfig[result.severity].icon
                          return <Icon className="w-8 h-8 text-neutral-950" />
                        })()}
                      </div>
                      <div>
                        <div className={cn("text-2xl font-bold", severityConfig[result.severity].color)}>
                          {severityConfig[result.severity].label}
                        </div>
                        <div className="text-sm text-neutral-400">
                          Score: <span className="text-slate-50">{result.overallScore || 0}/100</span>
                        </div>
                      </div>
                    </div>
                    
                    {result.severity === 'CRITICAL' && (
                      <motion.button
                        onClick={handleEmergencyPause}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25"
                      >
                        <Zap className="w-5 h-5" />
                        Emergency Pause
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Result Details */}
                <div className="p-6 space-y-6">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-white/10">
                    <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Summary</h4>
                    <p className="text-slate-50 leading-relaxed">{result.summary}</p>
                  </div>

                  {result.vulnerabilities && result.vulnerabilities.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                        Vulnerabilities Found ({result.vulnerabilities.length})
                      </h4>
                      <div className="space-y-3">
                        {result.vulnerabilities.map((vuln, i) => (
                          <div key={i} className="p-4 rounded-xl bg-neutral-950 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Bug className="w-4 h-4 text-amber-400" />
                                <span className="text-slate-50 font-medium">{vuln.type}</span>
                              </div>
                              <span className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                severityConfig[vuln.severity]?.bg || 'bg-neutral-800',
                                severityConfig[vuln.severity]?.color || 'text-neutral-400'
                              )}>
                                {vuln.severity}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-400 mb-2">{vuln.description}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-neutral-500">
                                Confidence: <span className="text-slate-50">{(vuln.confidence * 100).toFixed(0)}%</span>
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <span className="text-xs text-emerald-400">💡 {vuln.recommendation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>TEE Verified</span>
                    <span className="mx-2">•</span>
                    <span>{result.contractName}</span>
                    <span className="mx-2">•</span>
                    <span>{result.compilerVersion}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div 
            className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Quick Scan
            </h3>
            <div className="space-y-2">
              {quickScans.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setContractAddress(item.address)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-white/5 hover:border-amber-500/30 text-left text-sm text-slate-50 transition-all group"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recent Scans */}
          <motion.div 
            className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Recent Scans
            </h3>
            
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <Scan className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No scans yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScans.map((scan, i) => {
                  const config = severityConfig[scan.severity]
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <config.icon className={cn("w-4 h-4", config.color)} />
                        <div>
                          <p className="text-sm text-slate-50 font-mono">
                            {scan.address.slice(0, 6)}...{scan.address.slice(-4)}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {scan.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-xs px-2 py-1 rounded-full", config.bg, config.color)}>
                        {scan.severity}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Network Status */}
          <motion.div 
            className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-sm font-semibold text-slate-50 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              Networks
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Hardhat Local', status: 'Connected', color: 'text-emerald-400', dot: 'bg-emerald-500' },
                { name: 'Sepolia', status: 'Available', color: 'text-amber-400', dot: 'bg-amber-500' },
                { name: 'Ethereum', status: 'Available', color: 'text-amber-400', dot: 'bg-amber-500' },
              ].map((net, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-50">{net.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", net.dot)} />
                    <span className={cn("text-xs", net.color)}>{net.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Scanner Info */}
          <motion.div 
            className="rounded-2xl border border-white/10 bg-gradient-to-b from-amber-500/5 to-transparent p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-50">Scanner Status</h3>
                <p className="text-xs text-neutral-500">v2.4.1-stable</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>AI Model</span>
                <span className="text-slate-50">Grok-4</span>
              </div>
              <div className="flex justify-between">
                <span>Heuristics</span>
                <span className="text-slate-50">5 patterns</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update</span>
                <span className="text-slate-50">Just now</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
