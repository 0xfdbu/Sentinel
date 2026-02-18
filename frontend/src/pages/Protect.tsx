/**
 * Protect Page - Unified Contract Security Hub
 * 
 * Merges Vault + Scan functionality:
 * - View all protected contracts
 * - Register new contracts with automatic AI security scan
 * - Real-time risk scoring via Chainlink CRE confidential HTTP
 * - Manage pause/unpause states
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Search, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  AlertOctagon,
  Lock,
  Unlock,
  Loader2,
  Wallet,
  AlertTriangle,
  FileCode,
  Scan,
  Sparkles,
  Bug,
  Activity
} from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useRegistry, useGuardian } from '../hooks/useContracts'
import { useScannerCRE, Severity, ScanResult } from '../hooks/useScannerCRE'
import { getAddresses } from '../utils/wagmi'
import { useNetwork } from 'wagmi'

interface ContractData {
  address: string
  name: string
  status: 'protected' | 'paused' | 'unprotected'
  riskScore: number
  riskLevel: Severity
  isVerified: boolean
  lastScan: string
  scanResult?: ScanResult
  stake: string
  owner: string
  registeredAt: number
}

// Export for use in other components
export type { Severity, ScanResult }

// Animated scanning effect
function ScanningAnimation() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-amber-500/20"
          initial={{ width: 100, height: 100, opacity: 0 }}
          animate={{ 
            width: [100, 300, 500], 
            height: [100, 300, 500], 
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

// Risk badge component
function RiskBadge({ score, level, isVerified = true }: { score: number; level: Severity; isVerified?: boolean }) {
  // Not verified case
  if (!isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-neutral-400 bg-neutral-500/10 border-neutral-500/30">
        <AlertTriangle className="h-3 w-3" />
        Not Verified
      </span>
    )
  }
  
  const config = {
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle },
    HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertCircle },
    MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertCircle },
    LOW: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: CheckCircle },
    SAFE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Shield },
  }
  
  const { color, bg, border, icon: Icon } = config[level]
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", color, bg, border)}>
      <Icon className="h-3 w-3" />
      {level} ({score})
    </span>
  )
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'protected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Shield className="h-3 w-3" />
          Protected
        </span>
      )
    case 'paused':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <Lock className="h-3 w-3" />
          Paused
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-white/10">
          <Unlock className="h-3 w-3" />
          Unprotected
        </span>
      )
  }
}

export default function Protect() {
  const { address: connectedAddress, isConnected } = useAccount()
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  // Get addresses for current chain
  getAddresses(chain?.id)
  
  // Scanner hook (uses Chainlink CRE backend)
  const { isScanning, status, result, scanContract, setResult, setStatus } = useScannerCRE()
  
  // Registry/Guardian hooks
  const {
    register,
    deregister,
    getProtectedContracts,
    getProtectedCount,
  } = useRegistry()
  
  const {
    getActivePauses,
    getActivePauseCount,
    liftPause,
  } = useGuardian()

  // State
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerStep, setRegisterStep] = useState<'input' | 'scanning' | 'confirm'>('input')
  const [registerForm, setRegisterForm] = useState({
    address: '',
    name: '',
    stake: '0.01'
  })
  const [stats, setStats] = useState({
    totalProtected: 0,
    activePauses: 0,
    totalStaked: '0',
    avgRiskScore: 0,
  })

  // Load contracts with Alchemy RPC
  const loadContracts = useCallback(async () => {
    if (!isConnected || !publicClient) return
    setIsLoading(true)
    
    try {
      console.log('📋 Loading contracts via Alchemy...')
      const count = await getProtectedCount()
      const addresses = await getProtectedContracts(0, 20)
      const activePauses = await getActivePauseCount()
      const pausedAddresses = await getActivePauses()

      const contractData = await Promise.all(
        addresses.map(async (addr: `0x${string}`) => {
          const paused = pausedAddresses.includes(addr)
          
          // Get contract info from public client (Alchemy)
          let riskScore = 0
          let riskLevel: Severity = 'SAFE'
          let isVerified = true
          
          // Check if we have a stored scan result
          const storedScan = localStorage.getItem(`scan-${addr}`)
          if (storedScan) {
            const scanData = JSON.parse(storedScan)
            riskScore = scanData.score || 0
            riskLevel = scanData.level || 'SAFE'
            isVerified = scanData.category !== 'Not Verified'
          } else {
            // Default risk assessment based on pause status
            riskScore = paused ? 95 : 25
            riskLevel = paused ? 'CRITICAL' : 'LOW'
          }
          
          return {
            address: addr,
            name: 'Protected Contract',
            status: paused ? 'paused' as const : 'protected' as const,
            riskScore,
            riskLevel,
            isVerified,
            lastScan: storedScan ? new Date(JSON.parse(storedScan).timestamp).toLocaleDateString() : 'Never',
            stake: '0.01',
            owner: connectedAddress || '',
            registeredAt: Date.now(),
          }
        })
      )

      setContracts(contractData)
      setStats({
        totalProtected: count,
        activePauses,
        totalStaked: contractData.reduce((sum, c) => sum + parseFloat(c.stake), 0).toFixed(2),
        avgRiskScore: contractData.length > 0 
          ? Math.round(contractData.reduce((sum, c) => sum + c.riskScore, 0) / contractData.length)
          : 0,
      })
    } catch (e) {
      console.error('Failed to load contracts:', e)
      toast.error('Failed to load contracts')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, publicClient, getProtectedCount, getProtectedContracts, getActivePauseCount, getActivePauses, connectedAddress])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  // Auto-scan on registration
  const handleRegisterFlow = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }

    if (!registerForm.address || !registerForm.name) {
      toast.error('Please fill in all fields')
      return
    }

    // Step 1: AI Security Scan
    setRegisterStep('scanning')
    setResult(null)
    setStatus({ step: 'fetching', message: 'Fetching contract source...' })
    
    try {
      toast.loading('🔍 Running AI security scan via Chainlink CRE...')
      
      // Perform scan
      await scanContract(registerForm.address, chain?.id || 11155111)
      
      toast.dismiss()
      setRegisterStep('confirm')
      
    } catch (error: any) {
      toast.dismiss()
      
      // Check if contract is not verified
      if (error?.message === 'CONTRACT_NOT_VERIFIED' || 
          error?.message?.includes('not verified') ||
          error?.toString()?.includes('CONTRACT_NOT_VERIFIED')) {
        toast.error('⚠️ Contract not verified on Etherscan')
        // Set a special "not verified" result
        setResult({
          severity: 'SAFE' as const,
          category: 'Not Verified',
          vector: 'Contract source code not available on Etherscan',
          lines: [],
          confidence: 0,
          recommendation: 'Contract must be verified on Etherscan for AI security analysis. You can still register for monitoring, but automated vulnerability detection will not be available.'
        })
      } else {
        toast.error('Scan failed, but you can still register')
      }
      
      setRegisterStep('confirm')
    }
  }

  // Confirm registration after scan
  const handleConfirmRegister = async () => {
    try {
      const toastId = toast.loading('Registering contract...')
      
      const txHash = await register(registerForm.address, registerForm.name, registerForm.stake)
      
      toast.loading('Waiting for confirmation...', { id: toastId })
      await publicClient?.waitForTransactionReceipt({ hash: txHash })
      
      // Store scan result
      if (result) {
        localStorage.setItem(`scan-${registerForm.address}`, JSON.stringify({
          ...result,
          timestamp: Date.now()
        }))
      }
      
      toast.success(
        result?.category === 'Not Verified' 
          ? 'Contract registered (not verified - monitoring only)' 
          : 'Contract registered and protected!', 
        { id: toastId }
      )
      setShowRegisterModal(false)
      setRegisterStep('input')
      setRegisterForm({ address: '', name: '', stake: '0.01' })
      setResult(null)
      setStatus({ step: 'idle', message: 'Ready to scan' })
      
      await loadContracts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to register contract')
    }
  }

  // Manual rescan
  const handleRescan = async (contractAddr: string) => {
    try {
      toast.loading('🔍 Re-scanning contract...')
      await scanContract(contractAddr, chain?.id || 11155111)
      
      if (result) {
        localStorage.setItem(`scan-${contractAddr}`, JSON.stringify({
          ...result,
          timestamp: Date.now()
        }))
        
        const isVerified = result.category !== 'Not Verified'
        
        // Update contract in list
        setContracts(prev => prev.map(c => 
          c.address.toLowerCase() === contractAddr.toLowerCase()
            ? { 
                ...c, 
                riskScore: result.severity === 'CRITICAL' ? 95 : result.severity === 'HIGH' ? 75 : result.severity === 'MEDIUM' ? 50 : result.severity === 'LOW' ? 25 : 10, 
                riskLevel: result.severity, 
                isVerified,
                lastScan: new Date().toLocaleDateString() 
              }
            : c
        ))
        
        toast.success(isVerified ? `Scan complete: ${result.severity} risk detected` : 'Contract not verified on Etherscan')
      }
    } catch (error) {
      toast.error('Scan failed')
    }
  }

  // Deregister
  const handleDeregister = async (contractAddr: string) => {
    try {
      const toastId = toast.loading('Removing protection...')
      await deregister(contractAddr)
      toast.success('Contract deregistered', { id: toastId })
      localStorage.removeItem(`scan-${contractAddr}`)
      await loadContracts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to deregister')
    }
  }

  // Lift pause
  const handleLiftPause = async (contractAddr: string) => {
    try {
      const toastId = toast.loading('Lifting pause...')
      await liftPause(contractAddr)
      toast.success('Pause lifted successfully', { id: toastId })
      await loadContracts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to lift pause')
    }
  }

  const filteredContracts = contracts.filter(c => 
    c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <Shield className="w-6 h-6 text-neutral-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Protect</h1>
            <p className="text-sm text-neutral-400">AI-powered contract security via Chainlink CRE</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRegisterModal(true)}
            disabled={!isConnected}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Register Contract
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div 
          className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Protected</p>
              <p className="text-2xl font-bold text-slate-50">{stats.totalProtected}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
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
              <p className="text-sm text-neutral-500 mb-1">Paused</p>
              <p className="text-2xl font-bold text-red-400">{stats.activePauses}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-400" />
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
              <p className="text-sm text-neutral-500 mb-1">Total Staked</p>
              <p className="text-2xl font-bold text-amber-400">{stats.totalStaked} ETH</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-400" />
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
              <p className="text-sm text-neutral-500 mb-1">Avg Risk</p>
              <p className={cn("text-2xl font-bold", stats.avgRiskScore > 70 ? 'text-red-400' : stats.avgRiskScore > 40 ? 'text-orange-400' : 'text-emerald-400')}>
                {stats.avgRiskScore}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input
          type="text"
          placeholder="Search contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-neutral-900/50 border border-white/10 rounded-xl text-slate-50 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Contracts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12 border border-white/10 rounded-2xl bg-neutral-900/30">
            <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">No contracts registered yet</p>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="mt-4 text-amber-400 hover:text-amber-300 text-sm"
            >
              Register your first contract →
            </button>
          </div>
        ) : (
          filteredContracts.map((contract, index) => (
            <motion.div
              key={contract.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group rounded-xl border border-white/10 bg-neutral-900/50 p-5 hover:border-amber-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", 
                    !contract.isVerified ? 'bg-neutral-500/10' :
                    contract.riskLevel === 'CRITICAL' ? 'bg-red-500/10' :
                    contract.riskLevel === 'HIGH' ? 'bg-orange-500/10' :
                    contract.riskLevel === 'MEDIUM' ? 'bg-yellow-500/10' :
                    'bg-emerald-500/10'
                  )}>
                    <FileCode className={cn("w-5 h-5",
                      !contract.isVerified ? 'text-neutral-400' :
                      contract.riskLevel === 'CRITICAL' ? 'text-red-400' :
                      contract.riskLevel === 'HIGH' ? 'text-orange-400' :
                      contract.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                      'text-emerald-400'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">{contract.name}</span>
                      <StatusBadge status={contract.status} />
                      <RiskBadge score={contract.riskScore} level={contract.riskLevel} isVerified={contract.isVerified} />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-500 mt-1">
                      <code>{contract.address.slice(0, 6)}...{contract.address.slice(-4)}</code>
                      <span>•</span>
                      <span>Last scan: {contract.lastScan}</span>
                      <span>•</span>
                      <span>{contract.stake} ETH staked</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRescan(contract.address)}
                    disabled={isScanning}
                    className="p-2 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                    title="Rescan contract"
                  >
                    <Scan className="w-4 h-4" />
                  </button>
                  
                  {contract.status === 'paused' && (
                    <button
                      onClick={() => handleLiftPause(contract.address)}
                      className="px-3 py-1.5 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
                    >
                      Lift Pause
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeregister(contract.address)}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove protection"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

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
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowRegisterModal(false)
                  setRegisterStep('input')
                  setResult(null)
                  setStatus({ step: 'idle', message: 'Ready to scan' })
                }}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                ×
              </button>

              {registerStep === 'input' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-50">Register Contract</h2>
                      <p className="text-sm text-neutral-400">AI security scan included</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Contract Address</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={registerForm.address}
                        onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800 border border-white/10 rounded-xl text-slate-50 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Contract Name</label>
                      <input
                        type="text"
                        placeholder="My Protocol"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800 border border-white/10 rounded-xl text-slate-50 placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">Stake Amount (ETH)</label>
                      <input
                        type="text"
                        value={registerForm.stake}
                        onChange={(e) => setRegisterForm({ ...registerForm, stake: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800 border border-white/10 rounded-xl text-slate-50 focus:border-amber-500/50 focus:outline-none"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Minimum 0.01 ETH required</p>
                    </div>

                    <button
                      onClick={handleRegisterFlow}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Scan className="w-4 h-4" />
                      Start Security Scan
                    </button>
                  </div>
                </>
              )}

              {registerStep === 'scanning' && (
                <div className="py-8 text-center relative">
                  <ScanningAnimation />
                  
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-50 mb-2">AI Security Scan</h3>
                    <p className="text-neutral-400 mb-6">Analyzing contract via Chainlink CRE...</p>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {status.message}
                    </div>
                  </div>
                </div>
              )}

              {registerStep === 'confirm' && (
                <>
                  {/* Risk Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border-2",
                      result?.category === 'Not Verified' ? 'bg-neutral-500/10 border-neutral-500/30' :
                      result?.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/50' :
                      result?.severity === 'HIGH' ? 'bg-orange-500/10 border-orange-500/50' :
                      result?.severity === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/50' :
                      'bg-emerald-500/10 border-emerald-500/50'
                    )}>
                      {result?.category === 'Not Verified' ? (
                        <AlertTriangle className="w-6 h-6 text-neutral-400" />
                      ) : result?.severity === 'SAFE' ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : result?.severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-6 h-6 text-red-400" />
                      ) : (
                        <Bug className={cn("w-6 h-6",
                          result?.severity === 'HIGH' ? 'text-orange-400' :
                          result?.severity === 'MEDIUM' ? 'text-yellow-400' :
                          'text-blue-400'
                        )} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-slate-50">
                        {result?.category === 'Not Verified' ? 'Contract Not Verified' :
                         result?.severity === 'CRITICAL' ? 'Critical Vulnerabilities Found' :
                         result?.severity === 'HIGH' ? 'High Risk Detected' :
                         result?.severity === 'MEDIUM' ? 'Medium Risk Detected' :
                         result?.severity === 'LOW' ? 'Low Risk Detected' :
                         'No Issues Found'}
                      </h2>
                      <p className={cn("text-sm",
                        result?.category === 'Not Verified' ? 'text-neutral-400' :
                        result?.severity === 'CRITICAL' ? 'text-red-400' :
                        result?.severity === 'HIGH' ? 'text-orange-400' :
                        result?.severity === 'MEDIUM' ? 'text-yellow-400' :
                        'text-emerald-400'
                      )}>
                        {result?.category === 'Not Verified' ? 'Source code not available on Etherscan' : 
                         result?.severity === 'SAFE' ? 'Contract appears safe for registration' :
                         `${result?.severity} risk level detected by AI analysis`}
                      </p>
                    </div>
                  </div>

                  {/* Warning Banner for High/Critical */}
                  {result && result.severity === 'CRITICAL' && result.category !== 'Not Verified' && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-start gap-3">
                        <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-red-400">Critical Risk Warning</h4>
                          <p className="text-sm text-red-300/80 mt-1">
                            This contract has critical vulnerabilities that could lead to fund loss. 
                            We strongly recommend NOT registering it. If you still want to proceed, 
                            it will be for monitoring purposes only.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {result && result.severity === 'HIGH' && result.category !== 'Not Verified' && (
                    <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-orange-400">High Risk Warning</h4>
                          <p className="text-sm text-orange-300/80 mt-1">
                            This contract has significant security issues. Proceed with caution.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scan Results Details */}
                  {result && (
                    <div className="rounded-xl border border-white/10 bg-neutral-800/30 p-5 mb-6">
                      {result.category === 'Not Verified' ? (
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</span>
                            <p className="text-sm text-amber-400 mt-1">Not Verified on Etherscan</p>
                          </div>
                          <div className="pt-4 border-t border-white/10">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Note</span>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                              This contract is not verified on Etherscan, so we cannot analyze its source code for vulnerabilities. 
                              You can still register it for runtime monitoring and heuristics-based protection.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Category & Confidence - side by side since they're short */}
                          <div className="flex gap-8">
                            <div className="flex-1">
                              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Category</span>
                              <p className="text-sm text-slate-200 mt-1 font-medium">{result.category}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Confidence</span>
                              <p className="text-sm text-slate-200 mt-1 font-medium">{(result.confidence * 100).toFixed(0)}%</p>
                            </div>
                          </div>

                          {/* Attack Vector - full width with highlight */}
                          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Attack Vector</span>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{result.vector}</p>
                          </div>

                          {/* Recommendation */}
                          <div className="pt-4 border-t border-white/10">
                            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">AI Recommendation</span>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{result.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Conditional based on risk */}
                  <div className="space-y-3">
                    {/* Primary Action */}
                    {result?.severity === 'SAFE' ? (
                      <button
                        onClick={handleConfirmRegister}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Shield className="w-5 h-5" />
                        Register for Protection
                      </button>
                    ) : result?.severity === 'CRITICAL' && result?.category !== 'Not Verified' ? (
                      <button
                        onClick={handleConfirmRegister}
                        className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        Register Anyway (Monitoring Only)
                      </button>
                    ) : result?.category === 'Not Verified' ? (
                      <button
                        onClick={handleConfirmRegister}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Shield className="w-5 h-5" />
                        Register for Runtime Monitoring
                      </button>
                    ) : (
                      <button
                        onClick={handleConfirmRegister}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Shield className="w-5 h-5" />
                        Register with Risk Acknowledged
                      </button>
                    )}

                    {/* Secondary Action */}
                    <button
                      onClick={() => setRegisterStep('input')}
                      className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-slate-50 rounded-xl font-medium transition-colors"
                    >
                      Back to Edit
                    </button>

                    {/* Info text */}
                    <p className="text-xs text-neutral-500 text-center">
                      {result?.severity === 'CRITICAL' && result?.category !== 'Not Verified' 
                        ? '⚠️ Registering a compromised contract is not recommended. Funds may be at risk.'
                        : result?.category === 'Not Verified'
                        ? 'ℹ️ Runtime monitoring uses heuristics without source code analysis'
                        : 'ℹ️ Registration requires 0.01 ETH stake for sybil resistance'}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
