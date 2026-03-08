/**
 * Monitor Page - Sentinel Node Dashboard
 * Shows registered contracts and security status
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Server,
  Globe,
  FileCode,
  Plus,
  X,
  Clock,
  Search,
  Zap,
  Wallet,
  Code,
  LayoutGrid
} from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { getAddresses } from '../utils/wagmi'

// Default guardian (EmergencyGuardian V8)
const DEFAULT_GUARDIAN = '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1'

// Grid Background
function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
        backgroundSize: '100% 4px'
      }} />
      <div className="absolute inset-0 opacity-[0.15]" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-white/10" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-white/10" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-white/10" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-white/10" />
    </div>
  )
}

const SENTINEL_API_URL = import.meta.env.VITE_SENTINEL_API_URL || 'http://localhost:9001';

interface Contract {
  address: string;
  name: string;
  functions: number;
  files: number;
  compiler: string;
  proxy: boolean;
  registeredAt: number;
  lastScanned: number;
  hasSource?: boolean;
}

export default function Monitor() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const ADDRESSES = getAddresses(chainId)

  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newContractAddress, setNewContractAddress] = useState('')
  const [contractDetails, setContractDetails] = useState<any>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [guardianAddress, setGuardianAddress] = useState(DEFAULT_GUARDIAN)

  // Load contracts from Sentinel Node
  const loadContracts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${SENTINEL_API_URL}/contracts`)
      const data = await response.json()
      
      if (data.success) {
        setContracts(data.data)
      }
    } catch (error) {
      console.error('Failed to load contracts:', error)
      toast.error('Failed to connect to Sentinel Node')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load contract details
  const loadContractDetails = async (address: string) => {
    try {
      const response = await fetch(`${SENTINEL_API_URL}/contracts/${address}`)
      const data = await response.json()
      
      if (data.success) {
        setContractDetails(data.data)
      }
    } catch (error) {
      console.error('Failed to load contract details:', error)
    }
  }

  // Register new contract
  const registerContract = async () => {
    if (!newContractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid address')
      return
    }

    setIsRegistering(true)
    try {
      const response = await fetch(`${SENTINEL_API_URL}/contracts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: newContractAddress })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Registered: ${data.data.name}`)
        setNewContractAddress('')
        setShowRegisterModal(false)
        loadContracts()
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch (error) {
      toast.error('Failed to register contract')
    } finally {
      setIsRegistering(false)
    }
  }

  // Trigger manual scan
  const triggerScan = async () => {
    try {
      await fetch(`${SENTINEL_API_URL}/scan`, { method: 'POST' })
      toast.success('Scan triggered')
    } catch (error) {
      toast.error('Failed to trigger scan')
    }
  }

  useEffect(() => {
    loadContracts()
    const interval = setInterval(loadContracts, 30000)
    return () => clearInterval(interval)
  }, [loadContracts])

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white relative">
        <GridBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-24 h-24 rounded-3xl border border-white/10 bg-neutral-900/50 flex items-center justify-center mx-auto mb-8">
              <Wallet className="w-12 h-12 text-neutral-400" />
            </div>
            <h1 className="text-4xl font-semibold text-white mb-4">Connect Wallet</h1>
            <p className="text-neutral-400 mb-8">
              Connect your wallet to view the Sentinel monitoring dashboard.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white relative">
      <GridBackground />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-neutral-900/30 text-neutral-400 text-sm mb-4">
                <Server className="w-4 h-4" />
                <span>Sentinel Node Monitor</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold text-white mb-2">
                Contract Registry
              </h1>
              <p className="text-neutral-400 max-w-xl">
                Monitor registered contracts and security scans. 
                Contracts are pre-fetched and analyzed by CRE workflows.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadContracts}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={triggerScan}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Scan Now
              </button>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white text-neutral-950 font-medium hover:bg-neutral-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Register
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="p-5 rounded-2xl border border-white/10 bg-neutral-900/30">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <FileCode className="w-4 h-4" />
              Contracts
            </div>
            <div className="text-2xl font-semibold text-white">{contracts.length}</div>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-neutral-900/30">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Code className="w-4 h-4" />
              Total Functions
            </div>
            <div className="text-2xl font-semibold text-white">
              {contracts.reduce((acc, c) => acc + c.functions, 0)}
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-neutral-900/30">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <LayoutGrid className="w-4 h-4" />
              Proxy Contracts
            </div>
            <div className="text-2xl font-semibold text-white">
              {contracts.filter(c => c.proxy).length}
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-white/10 bg-neutral-900/30">
            <div className="flex items-center gap-2 text-neutral-400 text-sm mb-2">
              <Activity className="w-4 h-4" />
              Node Status
            </div>
            <div className="text-2xl font-semibold text-emerald-400">Online</div>
          </div>
        </motion.div>

        {/* Guardian Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 p-4 rounded-2xl border border-white/10 bg-neutral-900/30"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 min-w-fit">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-neutral-400">Guardian Node:</span>
            </div>
            <input
              type="text"
              value={guardianAddress}
              onChange={(e) => setGuardianAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-neutral-950 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <div className="flex items-center gap-2">
              {guardianAddress.toLowerCase() === DEFAULT_GUARDIAN.toLowerCase() && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                  Default
                </span>
              )}
              {address && guardianAddress.toLowerCase() === address.toLowerCase() && (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                  You
                </span>
              )}
              <button
                onClick={() => setGuardianAddress(DEFAULT_GUARDIAN)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:bg-white/5 transition-colors text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </motion.div>

        {/* Contracts Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {contracts.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <FileCode className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400 text-lg mb-2">No contracts registered</p>
              <p className="text-neutral-600 mb-6">Register contracts to start security monitoring</p>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-6 py-3 bg-white text-neutral-950 rounded-xl font-medium hover:bg-neutral-200 transition-colors"
              >
                Register First Contract
              </button>
            </div>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.address}
                onClick={() => {
                  setSelectedContract(contract)
                  loadContractDetails(contract.address)
                }}
                className="p-5 rounded-2xl border border-white/10 bg-neutral-900/30 hover:border-white/20 hover:bg-neutral-900/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border border-white/10 bg-neutral-800 flex items-center justify-center group-hover:border-white/20 transition-colors">
                      <FileCode className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{contract.name}</h3>
                      <code className="text-xs text-neutral-500 font-mono">{formatAddress(contract.address)}</code>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {contract.functions === 0 && (
                      <span className="px-2 py-1 bg-neutral-700/50 text-neutral-400 text-xs rounded-full">
                        Light
                      </span>
                    )}
                    {contract.proxy && (
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full">
                        Proxy
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                  <div className="p-2 rounded-lg bg-neutral-950/50">
                    <div className="text-neutral-500 text-xs">Functions</div>
                    <div className="text-white font-medium">{contract.functions}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/50">
                    <div className="text-neutral-500 text-xs">Files</div>
                    <div className="text-white font-medium">{contract.files}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/50">
                    <div className="text-neutral-500 text-xs">Compiler</div>
                    <div className="text-white font-medium truncate">{contract.compiler?.split('+')[0] || 'Unknown'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Last scanned: {contract.lastScanned ? new Date(contract.lastScanned).toLocaleDateString() : 'Never'}</span>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </motion.div>

        {/* Contract Details Modal */}
        <AnimatePresence>
          {selectedContract && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setSelectedContract(null)
                setContractDetails(null)
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedContract.name}</h2>
                    <code className="text-sm text-neutral-500 font-mono">{selectedContract.address}</code>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedContract(null)
                      setContractDetails(null)
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                      <div className="text-neutral-500 text-xs mb-1">Functions</div>
                      <div className="text-xl font-semibold text-white">{selectedContract.functions}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                      <div className="text-neutral-500 text-xs mb-1">Source Files</div>
                      <div className="text-xl font-semibold text-white">{selectedContract.files}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                      <div className="text-neutral-500 text-xs mb-1">Compiler</div>
                      <div className="text-sm font-medium text-white">{selectedContract.compiler?.split('+')[0] || 'Unknown'}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-neutral-950/50">
                      <div className="text-neutral-500 text-xs mb-1">Proxy</div>
                      <div className="text-sm font-medium text-white">{selectedContract.proxy ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {/* Functions List */}
                  {contractDetails?.functions && (
                    <div>
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Code className="w-4 h-4 text-neutral-400" />
                        Functions ({contractDetails.functions.length})
                      </h3>
                      <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl p-3 space-y-1">
                        {contractDetails.functions.map((fn: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5">
                            <code className="text-sm text-neutral-300 font-mono">{fn.signature}</code>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              fn.type === 'view' || fn.type === 'pure' 
                                ? "bg-blue-500/10 text-blue-400" 
                                : "bg-purple-500/10 text-purple-400"
                            )}>
                              {fn.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Files */}
                  {contractDetails?.sourceFiles && (
                    <div>
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-neutral-400" />
                        Source Files
                      </h3>
                      <div className="space-y-2">
                        {contractDetails.sourceFiles.map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 border border-white/10 rounded-xl">
                            <span className="text-sm text-neutral-300">{file.name}</span>
                            <a
                              href={`${SENTINEL_API_URL}/contracts/${selectedContract.address}/source`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-neutral-500 hover:text-white flex items-center gap-1"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Etherscan Link */}
                  <a
                    href={`https://${chainId === 11155111 ? 'sepolia.' : ''}etherscan.io/address/${selectedContract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    View on Etherscan <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Register Modal */}
        <AnimatePresence>
          {showRegisterModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowRegisterModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-semibold text-white mb-2">Register Contract</h2>
                <p className="text-neutral-400 text-sm mb-6">
                  Enter a contract address to fetch its source code from Etherscan and register it for monitoring.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-neutral-400 block mb-2">Contract Address</label>
                    <input
                      type="text"
                      value={newContractAddress}
                      onChange={(e) => setNewContractAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRegisterModal(false)}
                      className="flex-1 px-4 py-3 border border-white/10 text-neutral-400 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={registerContract}
                      disabled={isRegistering || !newContractAddress.match(/^0x[a-fA-F0-9]{40}$/)}
                      className="flex-1 px-4 py-3 bg-white text-neutral-950 rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                      {isRegistering ? 'Registering...' : 'Register'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
