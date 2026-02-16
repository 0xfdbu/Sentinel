import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  FileCode,
  Zap,
  Lock,
  Loader2,
  AlertOctagon,
  ExternalLink,
  Scan,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Code2,
  History,
  Settings,
  Play,
  Pause,
  Globe,
  Cpu
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useScanner, ScanResult, Severity } from '../hooks/useScanner'
import { useGuardian, useAuditLogger } from '../hooks/useContracts'

const severityConfig: Record<Severity, { 
  color: string; 
  bg: string; 
  border: string;
  icon: any;
  label: string;
}> = {
  CRITICAL: { 
    color: 'text-red-400', 
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: AlertOctagon,
    label: 'Critical Risk'
  },
  HIGH: { 
    color: 'text-orange-400', 
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
    label: 'High Risk'
  },
  MEDIUM: { 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: AlertCircle,
    label: 'Medium Risk'
  },
  LOW: { 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: ShieldCheck,
    label: 'Low Risk'
  },
  SAFE: { 
    color: 'text-green-400', 
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: CheckCircle,
    label: 'Safe'
  },
}

// Animated background for scanner
function ScannerBackground({ isScanning }: { isScanning: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {isScanning && (
        <>
          {/* Scanning lines */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sentinel-500/50 to-transparent"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {/* Pulsing rings */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-sentinel-500/20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </>
      )}
    </div>
  )
}

// Stat card component
function StatCard({ label, value, subtext, icon: Icon, color }: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  icon: any;
  color: string;
}) {
  return (
    <motion.div 
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6 group"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20", color)} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color.replace('bg-', 'bg-').replace('/10', '/20'))}>
            <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-').replace('/10', ''))} />
          </div>
          {subtext && (
            <span className="text-xs text-muted-foreground">{subtext}</span>
          )}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  )
}

// Scan status indicator
function ScanStatus({ status }: { status: string }) {
  const steps = [
    { id: 'fetching', label: 'Fetching Source', icon: Code2 },
    { id: 'analyzing', label: 'AI Analysis', icon: Cpu },
    { id: 'evaluating', label: 'Risk Check', icon: ShieldCheck },
  ]
  
  const currentStep = steps.findIndex(s => status.toLowerCase().includes(s.id))
  
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isActive = i <= currentStep && currentStep >= 0
        const isCurrent = i === currentStep
        
        return (
          <div key={step.id} className="flex items-center">
            <motion.div 
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                isActive ? "bg-sentinel-500/20 text-sentinel-400" : "bg-white/5 text-muted-foreground"
              )}
              animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}
            >
              {isCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <step.icon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [contractAddress, setContractAddress] = useState('')
  const [chainId, setChainId] = useState(31337)
  const [recentScans, setRecentScans] = useState<Array<{
    address: string;
    severity: Severity;
    timestamp: Date;
  }>>([])
  
  const { scanContract, isScanning, status, result, setResult } = useScanner()
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
        severity: scanResult.severity,
        timestamp: new Date(),
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Security <span className="text-gradient">Scanner</span>
        </h1>
        <p className="text-muted-foreground">
          Analyze smart contracts for vulnerabilities using AI and runtime heuristics
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard 
          label="Total Scans" 
          value="1,247" 
          icon={Scan}
          color="bg-sentinel-500"
        />
        <StatCard 
          label="Active Alerts" 
          value="3" 
          subtext="+1 today"
          icon={AlertTriangle}
          color="bg-orange-500"
        />
        <StatCard 
          label="Protected Value" 
          value="$47.2M" 
          icon={Shield}
          color="bg-green-500"
        />
        <StatCard 
          label="Avg Response" 
          value="< 3s" 
          icon={Zap}
          color="bg-yellow-500"
        />
      </motion.div>

      {/* Main Scanner Interface */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scanner Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input Card */}
          <motion.div 
            className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ScannerBackground isScanning={isScanning} />
            
            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sentinel-500/20 flex items-center justify-center">
                    <Scan className="w-5 h-5 text-sentinel-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Contract Scanner</h3>
                    <p className="text-sm text-muted-foreground">Powered by xAI Grok</p>
                  </div>
                </div>
                {isScanning && <ScanStatus status={status.step} />}
              </div>

              {/* Input */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <FileCode className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="Enter contract address (0x...)"
                    className="w-full pl-12 pr-4 py-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-sentinel-500/50 transition-colors font-mono text-sm"
                    disabled={isScanning}
                  />
                </div>

                <div className="flex gap-3">
                  <select
                    value={chainId}
                    onChange={(e) => setChainId(Number(e.target.value))}
                    className="px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sentinel-500/50"
                    disabled={isScanning}
                  >
                    <option value={31337}>Hardhat Local</option>
                    <option value={11155111}>Sepolia</option>
                    <option value={1}>Ethereum</option>
                  </select>
                  
                  <button
                    onClick={handleScan}
                    disabled={isScanning || !contractAddress || !isConnected}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                      isScanning || !contractAddress || !isConnected
                        ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                        : "bg-sentinel-600 text-white hover:bg-sentinel-500 hover:scale-[1.02]"
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
              </div>
            </div>
          </motion.div>

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
                {/* Header */}
                <div className={cn("p-6 border-b", severityConfig[result.severity].border)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", severityConfig[result.severity].bg)}>
                        {(() => {
                          const Icon = severityConfig[result.severity].icon
                          return <Icon className={cn("w-7 h-7", severityConfig[result.severity].color)} />
                        })()}
                      </div>
                      <div>
                        <div className={cn("text-2xl font-bold", severityConfig[result.severity].color)}>
                          {severityConfig[result.severity].label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(result.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {result.severity === 'CRITICAL' && (
                      <motion.button
                        onClick={handleEmergencyPause}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25"
                      >
                        <Zap className="w-5 h-5" />
                        Emergency Pause
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Vulnerability</h4>
                    <p className="text-white text-lg">{result.category}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                    <p className="text-white">{result.vector}</p>
                  </div>

                  {result.lines.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Affected Lines</h4>
                      <div className="flex gap-2 flex-wrap">
                        {result.lines.map(line => (
                          <span 
                            key={line}
                            className="px-3 py-1 rounded-lg bg-white/5 text-sentinel-400 font-mono text-sm"
                          >
                            Line {line}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Recommendation</h4>
                    <p className="text-white">{result.recommendation}</p>
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
            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-sentinel-400" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Scan Vulnerable Vault', action: () => setContractAddress('0x...') },
                { label: 'Scan Safe Vault', action: () => setContractAddress('0x...') },
                { label: 'View Audit Log', action: () => {} },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-sm text-white transition-colors group"
                >
                  {item.label}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recent Scans */}
          <motion.div 
            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-sentinel-400" />
              Recent Scans
            </h3>
            
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Scan className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No scans yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan, i) => {
                  const config = severityConfig[scan.severity]
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <config.icon className={cn("w-4 h-4", config.color)} />
                        <div>
                          <p className="text-sm text-white font-mono">
                            {scan.address.slice(0, 6)}...{scan.address.slice(-4)}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-sentinel-400" />
              Network Status
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Hardhat Local', status: 'Connected', color: 'text-green-400' },
                { name: 'Sepolia', status: 'Available', color: 'text-yellow-400' },
                { name: 'Ethereum', status: 'Available', color: 'text-yellow-400' },
              ].map((net, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white">{net.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", net.color.replace('text-', 'bg-'))} />
                    <span className={cn("text-xs", net.color)}>{net.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
