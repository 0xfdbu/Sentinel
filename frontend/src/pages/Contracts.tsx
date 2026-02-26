import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Search, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Lock,
  Unlock,
  Loader2,
  RefreshCw,
  Wallet,
  AlertTriangle
} from 'lucide-react'
import { useAccount, usePublicClient } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useRegistry, useGuardian } from '../hooks/useContracts'

interface ContractData {
  address: string
  name: string
  status: 'protected' | 'paused' | 'unprotected'
  riskScore: number
  lastScan: string
  stake: string
  owner: string
  registeredAt: number
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
        <div className="w-10 h-10 rounded-xl bg-neutral-300/10 border border-neutral-300/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-neutral-200" />
        </div>
      </div>
    </motion.div>
  )
}

export default function Contracts() {
  const { address: connectedAddress, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalProtected: 0,
    activePauses: 0,
    totalStaked: '0',
  })

  const {
    register,
    deregister,
    getProtectedContracts,
    getProtectedCount,
    REGISTRY_ADDRESS,
  } = useRegistry()

  const {
    getActivePauses,
    getActivePauseCount,
    liftPause,
    GUARDIAN_ADDRESS,
  } = useGuardian()

  const [registerForm, setRegisterForm] = useState({
    address: '',
    name: '',
    stake: '0.01'
  })

  // Load contracts
  const loadContracts = useCallback(async () => {
    if (!isConnected) return
    setIsLoading(true)
    console.log('Loading contracts...')
    try {
      const count = await getProtectedCount()
      console.log('Protected count:', count)
      
      const addresses = await getProtectedContracts(0, 20)
      console.log('Protected addresses:', addresses)
      
      const activePauses = await getActivePauseCount()
      const pausedAddresses = await getActivePauses()

      const contractData = await Promise.all(
        addresses.map(async (addr: `0x${string}`) => {
          const paused = pausedAddresses.includes(addr)
          
          return {
            address: addr,
            name: 'Protected Contract',
            status: paused ? 'paused' as const : 'protected' as const,
            riskScore: paused ? 95 : Math.floor(Math.random() * 30),
            lastScan: new Date(Date.now() - Math.random() * 86400000).toLocaleDateString(),
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
      })
    } catch (e) {
      console.error('Failed to load contracts:', e)
      toast.error('Failed to load contracts - check console')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, getProtectedCount, getProtectedContracts, getActivePauseCount, getActivePauses, connectedAddress])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  const handleRegister = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }

    try {
      const toastId = toast.loading('Registering contract...')
      
      const txHash = await register(registerForm.address, registerForm.name, registerForm.stake)
      
      // Wait for transaction confirmation
      toast.loading('Waiting for confirmation...', { id: toastId })
      await publicClient?.waitForTransactionReceipt({ hash: txHash })
      
      toast.success('Contract registered successfully!', { id: toastId })
      setShowRegisterModal(false)
      setRegisterForm({ address: '', name: '', stake: '0.01' })
      
      // Small delay for RPC propagation
      await new Promise(r => setTimeout(r, 2000))
      await loadContracts()
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Failed to register contract')
    }
  }

  const handleDeregister = async (contractAddr: string) => {
    try {
      const toastId = toast.loading('Deregistering contract...')
      
      await deregister(contractAddr)
      
      toast.success('Contract deregistered', { id: toastId })
      await loadContracts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to deregister')
    }
  }

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

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-500/10 border-red-500/30'
    if (score >= 50) return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30'
    if (score >= 25) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  }

  const getStatusBadge = (status: string) => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-300/10 border border-neutral-300/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-neutral-200" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Protected Contracts</h1>
            <p className="text-neutral-400 text-sm">{stats.totalProtected} contracts under Sentinel protection</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadContracts}
            className="p-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('h-5 w-5 text-neutral-400', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => isConnected ? setShowRegisterModal(true) : toast.error('Please connect your wallet')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 text-neutral-950 rounded-xl font-medium hover:bg-white transition-colors shadow-lg shadow-neutral-300/10"
          >
            <Plus className="h-5 w-5" />
            Register Contract
          </button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard 
          label="Total Protected" 
          value={stats.totalProtected} 
          icon={Shield}
          color="text-emerald-400"
        />
        <StatCard 
          label="Active Pauses" 
          value={stats.activePauses} 
          icon={AlertTriangle}
          color="text-red-400"
        />
        <StatCard 
          label="TVL Protected" 
          value="$47.2M" 
          icon={Wallet}
          color="text-neutral-200"
        />
        <StatCard 
          label="Total Staked" 
          value={`${stats.totalStaked} ETH`} 
          icon={Lock}
          color="text-blue-400"
        />
      </motion.div>

      {/* Contract Addresses Info */}
      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Registry:</span>
            <span className="font-mono text-neutral-200">{REGISTRY_ADDRESS}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Guardian:</span>
            <span className="font-mono text-neutral-200">{GUARDIAN_ADDRESS}</span>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-12 pr-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-300/50 transition-colors"
          />
        </div>
      </motion.div>

      {/* Contracts Table */}
      <motion.div 
        className="rounded-2xl border border-white/10 bg-neutral-900/50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Contract</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Risk Score</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Stake</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Owner</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-200" />
                    <p className="text-neutral-500 mt-2">Loading contracts...</p>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    No contracts found. Register one to get started.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => (
                  <motion.tr
                    key={contract.address}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-50">{contract.name || 'Unnamed'}</p>
                        <p className="text-sm font-mono text-neutral-500">
                          {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                        getRiskColor(contract.riskScore)
                      )}>
                        {contract.riskScore}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-50">
                      {parseFloat(contract.stake).toFixed(3)} ETH
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-neutral-500">
                        {contract.owner === connectedAddress ? (
                          <span className="text-neutral-200">You</span>
                        ) : (
                          `${contract.owner.slice(0, 6)}...${contract.owner.slice(-4)}`
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://etherscan.io/address/${contract.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-neutral-400" />
                        </a>
                        {contract.status === 'paused' && contract.owner === connectedAddress && (
                          <button
                            onClick={() => handleLiftPause(contract.address)}
                            className="px-3 py-1.5 text-xs font-medium bg-neutral-300/10 text-neutral-200 border border-neutral-300/20 rounded-lg hover:bg-neutral-300/20 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {contract.owner === connectedAddress && contract.status !== 'paused' && (
                          <button
                            onClick={() => handleDeregister(contract.address)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            Exit
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-white/10 bg-neutral-900 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-50">Register Contract</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5 rotate-45 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Contract Address *
                </label>
                <input
                  type="text"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-300/50 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Contract Name
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                  placeholder="My DeFi Protocol"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-300/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Stake Amount (Min 0.01 ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={registerForm.stake}
                    onChange={(e) => setRegisterForm({...registerForm, stake: e.target.value})}
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 focus:outline-none focus:border-neutral-300/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
                    ETH
                  </span>
                </div>
              </div>

              <div className="bg-neutral-300/10 rounded-xl p-4 flex items-start gap-3 border border-neutral-300/20">
                <AlertCircle className="h-5 w-5 text-neutral-200 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-50 font-medium">Requirements</p>
                  <ul className="text-sm text-neutral-400 mt-1 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      Contract must implement Pausable interface
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      Guardian must be set as pauser role
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      Minimum 0.01 ETH stake required
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={!registerForm.address.match(/^0x[a-fA-F0-9]{40}$/)}
                className="w-full py-3 bg-slate-50 text-neutral-950 rounded-xl font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register & Stake {registerForm.stake} ETH
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
