import { useState, useEffect } from 'react'
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
  ExternalLink
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useScanner, ScanResult, Severity } from '../hooks/useScanner'
import { useGuardian, useAuditLogger } from '../hooks/useContracts'
import { CONTRACT_ADDRESSES } from '../utils/wagmi'

const severityConfig: Record<Severity, { color: string; icon: any; bg: string }> = {
  CRITICAL: { 
    color: 'text-red-500', 
    bg: 'bg-red-500/10',
    icon: AlertOctagon 
  },
  HIGH: { 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10',
    icon: AlertTriangle 
  },
  MEDIUM: { 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10',
    icon: AlertTriangle 
  },
  LOW: { 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    icon: Shield 
  },
  SAFE: { 
    color: 'text-green-500', 
    bg: 'bg-green-500/10',
    icon: CheckCircle 
  },
}

interface RecentScan {
  address: string
  severity: Severity
  timestamp: Date
  action: string
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [contractAddress, setContractAddress] = useState('')
  const [chainId, setChainId] = useState(31337) // Default to Hardhat
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [stats, setStats] = useState({ totalScans: 0, activePauses: 0, avgResponse: '< 5s' })
  
  const { scanContract, isScanning, status, result, setResult } = useScanner()
  const { emergencyPause, getActivePauseCount, getTotalPausesExecuted } = useGuardian()
  const { getTotalScans, getStats } = useAuditLogger()

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [totalScans, activePauses, totalPauses] = await Promise.all([
          getTotalScans(),
          getActivePauseCount(),
          getTotalPausesExecuted(),
        ])
        setStats({
          totalScans: totalScans || 0,
          activePauses: activePauses || 0,
          avgResponse: '< 5s',
        })
      } catch (e) {
        console.warn('Failed to load stats:', e)
      }
    }
    if (isConnected) {
      loadStats()
    }
  }, [isConnected, getTotalScans, getActivePauseCount, getTotalPausesExecuted])

  const handleScan = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    const scanResult = await scanContract(contractAddress, chainId)
    
    if (scanResult) {
      // Add to recent scans
      setRecentScans(prev => [{
        address: contractAddress,
        severity: scanResult.severity,
        timestamp: new Date(),
        action: scanResult.severity === 'CRITICAL' ? 'PAUSE' : 
                scanResult.severity === 'HIGH' ? 'ALERT' : 'LOG',
      }, ...prev].slice(0, 10))
    }
  }

  const handleEmergencyPause = async () => {
    if (!isConnected || !result) return
    
    try {
      const toastId = toast.loading('Executing emergency pause...')
      
      // Generate vulnerability hash
      const vulnHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}` as `0x${string}`
      
      const tx = await emergencyPause(contractAddress, vulnHash)
      
      toast.success('Emergency pause executed!', { id: toastId })
      
      // Update stats
      setStats(prev => ({ ...prev, activePauses: prev.activePauses + 1 }))
    } catch (error) {
      console.error('Pause error:', error)
      toast.error('Failed to execute pause. Contract may not be registered or already paused.')
    }
  }

  const severityBadge = (severity: Severity) => {
    const config = severityConfig[severity]
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
        config.bg,
        config.color
      )}>
        <config.icon className="h-4 w-4" />
        {severity}
      </span>
    )
  }

  const getExplorerUrl = (addr: string) => {
    return chainId === 11155111 
      ? `https://sepolia.etherscan.io/address/${addr}`
      : chainId === 1
      ? `https://etherscan.io/address/${addr}`
      : '#'
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Security Scanner</h1>
        <p className="mt-2 text-muted-foreground">
          Scan any smart contract for vulnerabilities using xAI Grok-powered analysis
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Scanner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input */}
          <div className="glass rounded-xl p-6">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Contract Address
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <FileCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sentinel-500 font-mono text-sm"
                  disabled={isScanning}
                />
              </div>
              <select
                value={chainId}
                onChange={(e) => setChainId(Number(e.target.value))}
                className="px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sentinel-500"
                disabled={isScanning}
              >
                <option value={31337}>Hardhat</option>
                <option value={11155111}>Sepolia</option>
                <option value={1}>Mainnet</option>
              </select>
              <button
                onClick={handleScan}
                disabled={isScanning || !contractAddress || !isConnected}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all',
                  isScanning || !isConnected
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-sentinel-600 text-white hover:bg-sentinel-500'
                )}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Scan
                  </>
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Powered by Chainlink CRE • xAI Grok API • Confidential Compute
            </p>
          </div>

          {/* Status */}
          <AnimatePresence mode="wait">
            {status.step !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-xl p-6"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    status.step === 'error' ? 'bg-red-500/20' : 'bg-sentinel-500/20'
                  )}>
                    {status.step === 'complete' ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : status.step === 'error' ? (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    ) : (
                      <Loader2 className="h-6 w-6 text-sentinel-500 animate-spin" />
                    )}
                  </div>
                  <div>
                    <p className={cn(
                      'font-medium',
                      status.step === 'error' ? 'text-red-400' : 'text-white'
                    )}>
                      {status.message}
                    </p>
                    {status.timestamp && (
                      <p className="text-sm text-muted-foreground">
                        Completed at {new Date(status.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Steps */}
                {isScanning && (
                  <div className="mt-6 flex gap-2">
                    {['fetching', 'analyzing', 'evaluating'].map((s, i) => (
                      <div
                        key={s}
                        className={cn(
                          'flex-1 h-2 rounded-full transition-colors',
                          ['fetching', 'analyzing', 'evaluating'].indexOf(status.step) >= i 
                            ? 'bg-sentinel-500' 
                            : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-xl overflow-hidden"
              >
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {severityBadge(result.severity)}
                      <span className="text-sm text-muted-foreground">
                        Confidence: {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    {result.severity === 'CRITICAL' && isConnected && (
                      <button 
                        onClick={handleEmergencyPause}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Zap className="h-4 w-4" />
                        Trigger Emergency Pause
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Vulnerability Category
                    </h4>
                    <p className="text-lg font-semibold text-white">{result.category}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Description
                    </h4>
                    <p className="text-white">{result.vector}</p>
                  </div>

                  {result.lines.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Affected Lines
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {result.lines.map(line => (
                          <span 
                            key={line}
                            className="px-2 py-1 bg-sentinel-500/20 text-sentinel-400 rounded text-sm font-mono"
                          >
                            Line {line}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Recommendation
                    </h4>
                    <p className="text-white">{result.recommendation}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border/50">
                    <Lock className="h-4 w-4" />
                    <span>Vulnerability details kept private via Confidential Compute</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-sentinel-500" />
              Network Stats
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Total Scans', value: stats.totalScans.toString(), color: 'text-sentinel-400' },
                { label: 'Active Pauses', value: stats.activePauses.toString(), color: 'text-red-400' },
                { label: 'Avg Response', value: stats.avgResponse, color: 'text-green-400' },
              ].map(stat => (
                <div key={stat.label} className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{stat.label}</span>
                  <span className={cn('font-semibold', stat.color)}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Addresses */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-sentinel-500" />
              Contract Addresses
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Registry', address: CONTRACT_ADDRESSES.hardhat.registry },
                { name: 'Guardian', address: CONTRACT_ADDRESSES.hardhat.guardian },
                { name: 'AuditLogger', address: CONTRACT_ADDRESSES.hardhat.auditLogger },
              ].map(contract => (
                <div key={contract.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{contract.name}</span>
                  <a 
                    href={getExplorerUrl(contract.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-mono text-sentinel-400 hover:text-sentinel-300"
                  >
                    {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Scans */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-sentinel-500" />
              Recent Scans
            </h3>
            <div className="space-y-3">
              {recentScans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scans yet</p>
              ) : (
                recentScans.map((scan, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-white truncate">
                        {scan.address.slice(0, 8)}...{scan.address.slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scan.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium px-2 py-1 rounded shrink-0',
                      scan.severity === 'CRITICAL' && 'bg-red-500/20 text-red-400',
                      scan.severity === 'HIGH' && 'bg-orange-500/20 text-orange-400',
                      scan.severity === 'MEDIUM' && 'bg-yellow-500/20 text-yellow-400',
                      scan.severity === 'SAFE' && 'bg-green-500/20 text-green-400',
                    )}>
                      {scan.severity}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="glass rounded-xl p-6 border border-sentinel-500/20">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-sentinel-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-white text-sm">Privacy First</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  API keys and vulnerability details are never exposed. 
                  Emergency responses use Confidential Compute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
