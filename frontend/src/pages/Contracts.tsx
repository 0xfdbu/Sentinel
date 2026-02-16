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
  RefreshCw
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'react-hot-toast'
import { formatEther } from 'viem'
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

export default function Contracts() {
  const { address: connectedAddress, isConnected } = useAccount()
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
    getRegistration,
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
    try {
      const count = await getProtectedCount()
      const addresses = await getProtectedContracts(0, 20)
      const activePauses = await getActivePauseCount()
      const pausedAddresses = await getActivePauses()

      const contractData = await Promise.all(
        addresses.map(async (addr) => {
          const reg = await getRegistration(addr)
          const paused = pausedAddresses.includes(addr)
          
          return {
            address: addr,
            name: reg?.metadata || 'Unnamed Contract',
            status: paused ? 'paused' as const : 'protected' as const,
            riskScore: paused ? 95 : Math.floor(Math.random() * 30), // Mock for demo
            lastScan: new Date(Date.now() - Math.random() * 86400000).toLocaleDateString(),
            stake: reg?.stakedAmount || '0',
            owner: reg?.owner || '',
            registeredAt: reg?.registeredAt || 0,
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
      toast.error('Failed to load contracts')
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, getProtectedCount, getProtectedContracts, getRegistration, getActivePauseCount, getActivePauses])

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
      
      await register(registerForm.address, registerForm.name, registerForm.stake)
      
      toast.success('Contract registered successfully!', { id: toastId })
      setShowRegisterModal(false)
      setRegisterForm({ address: '', name: '', stake: '0.01' })
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
    if (score >= 80) return 'text-red-500 bg-red-500/10'
    if (score >= 50) return 'text-orange-500 bg-orange-500/10'
    if (score >= 25) return 'text-yellow-500 bg-yellow-500/10'
    return 'text-green-500 bg-green-500/10'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'protected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
            <Shield className="h-3 w-3" />
            Protected
          </span>
        )
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
            <Lock className="h-3 w-3" />
            Emergency Paused
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <Unlock className="h-3 w-3" />
            Unprotected
          </span>
        )
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Protected Contracts</h1>
          <p className="mt-2 text-muted-foreground">
            {stats.totalProtected} contracts under Sentinel protection
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadContracts}
            className="p-3 border border-border rounded-lg hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('h-5 w-5 text-muted-foreground', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => isConnected ? setShowRegisterModal(true) : toast.error('Please connect your wallet')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sentinel-600 text-white rounded-lg font-medium hover:bg-sentinel-500 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Register Contract
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Protected', value: stats.totalProtected.toString(), color: 'text-sentinel-400' },
          { label: 'Active Pauses', value: stats.activePauses.toString(), color: 'text-red-400' },
          { label: 'TVL Protected', value: '$47.2M', color: 'text-green-400' },
          { label: 'Total Staked', value: `${stats.totalStaked} ETH`, color: 'text-purple-400' },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Contract Addresses Info */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Registry:</span>
            <span className="font-mono text-sentinel-400">{REGISTRY_ADDRESS}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Guardian:</span>
            <span className="font-mono text-sentinel-400">{GUARDIAN_ADDRESS}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sentinel-500"
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Contract</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Risk Score</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Stake</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Owner</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-sentinel-500" />
                    <p className="text-muted-foreground mt-2">Loading contracts...</p>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
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
                    className="border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{contract.name || 'Unnamed'}</p>
                        <p className="text-sm font-mono text-muted-foreground">
                          {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                        getRiskColor(contract.riskScore)
                      )}>
                        {contract.riskScore}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">
                      {parseFloat(contract.stake).toFixed(3)} ETH
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-muted-foreground">
                        {contract.owner === connectedAddress ? (
                          <span className="text-sentinel-400">You</span>
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
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                        {contract.status === 'paused' && contract.owner === connectedAddress && (
                          <button
                            onClick={() => handleLiftPause(contract.address)}
                            className="px-3 py-1.5 text-xs font-medium bg-sentinel-600 text-white rounded-lg hover:bg-sentinel-500 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {contract.owner === connectedAddress && contract.status !== 'paused' && (
                          <button
                            onClick={() => handleDeregister(contract.address)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
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
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Register Contract</h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5 rotate-45 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Contract Address *
                </label>
                <input
                  type="text"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sentinel-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Contract Name
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                  placeholder="My DeFi Protocol"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sentinel-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Stake Amount (Min 0.01 ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={registerForm.stake}
                    onChange={(e) => setRegisterForm({...registerForm, stake: e.target.value})}
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sentinel-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ETH
                  </span>
                </div>
              </div>

              <div className="bg-sentinel-500/10 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-sentinel-500 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">Requirements</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Contract must implement Pausable interface
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Guardian must be set as pauser role
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Minimum 0.01 ETH stake required
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={!registerForm.address.match(/^0x[a-fA-F0-9]{40}$/)}
                className="w-full py-3 bg-sentinel-600 text-white rounded-lg font-medium hover:bg-sentinel-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
