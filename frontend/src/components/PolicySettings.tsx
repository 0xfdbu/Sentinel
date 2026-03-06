/**
 * PolicySettings Component
 * 
 * Allows contract owners to configure custom ACE policies for their contract.
 * Only visible to the contract owner.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Settings,
  AlertTriangle,
  Ban,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Volume2,
  FileCode,
  AlertOctagon,
  Info,
  Save
} from 'lucide-react'
import { usePolicyConfigurator } from '../hooks/usePolicyConfigurator'
import { formatEther } from 'viem'
import { toast } from 'react-hot-toast'

interface PolicySettingsProps {
  contractAddress: string
  isOwner: boolean
}

export function PolicySettings({ contractAddress, isOwner }: PolicySettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'blacklist' | 'functions'>('general')
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Volume limits form
  const [minVolume, setMinVolume] = useState('0.001')
  const [maxVolume, setMaxVolume] = useState('100')
  const [dailyVolume, setDailyVolume] = useState('1000')
  
  // Blacklist form
  const [newBlacklistAddr, setNewBlacklistAddr] = useState('')
  const [blacklist, setBlacklist] = useState<string[]>([])
  
  const {
    isLoading: isHookLoading,
    getContractPolicy,
    enablePolicies,
    disablePolicies,
    setVolumeLimits,
    addToBlacklist,
    removeFromBlacklist
  } = usePolicyConfigurator()

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      try {
        const policy = await getContractPolicy(contractAddress)
        if (policy) {
          setIsEnabled(policy.enabled)
          setMinVolume(policy.minValue)
          setMaxVolume(policy.maxValue)
          setDailyVolume(policy.dailyLimit)
          setBlacklist(policy.blacklist)
        }
      } catch (e) {
        console.error('Failed to load policy settings:', e)
      }
      setIsLoading(false)
    }
    
    loadSettings()
  }, [contractAddress, getContractPolicy])

  const handleTogglePolicies = async () => {
    try {
      if (isEnabled) {
        await disablePolicies(contractAddress)
        setIsEnabled(false)
        toast.success('Policies disabled')
      } else {
        await enablePolicies(contractAddress)
        setIsEnabled(true)
        toast.success('Policies enabled')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle policies')
    }
  }

  const handleSaveVolumeLimits = async () => {
    try {
      await setVolumeLimits(contractAddress, minVolume, maxVolume, dailyVolume)
      toast.success('Volume limits saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save volume limits')
    }
  }

  const handleAddToBlacklist = async () => {
    if (!newBlacklistAddr.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid address')
      return
    }
    
    try {
      await addToBlacklist(contractAddress, newBlacklistAddr)
      setBlacklist([...blacklist, newBlacklistAddr.toLowerCase()])
      setNewBlacklistAddr('')
      toast.success('Address added to blacklist')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to blacklist')
    }
  }

  const handleRemoveFromBlacklist = async (addr: string) => {
    try {
      await removeFromBlacklist(contractAddress, addr)
      setBlacklist(blacklist.filter(a => a !== addr))
      toast.success('Address removed from blacklist')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove from blacklist')
    }
  }

  if (!isOwner) {
    return (
      <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6">
        <div className="flex items-center gap-3 text-neutral-400">
          <Shield className="w-5 h-5" />
          <p className="text-sm">Policy settings are only available to the contract owner.</p>
        </div>
      </div>
    )
  }

  if (isLoading || isHookLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-300/10 border border-neutral-300/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-neutral-200" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Custom Policies</h3>
            <p className="text-sm text-neutral-400">
              Configure additional protections specific to your contract
            </p>
          </div>
        </div>
        
        {/* Enable/Disable Toggle */}
        <button
          onClick={handleTogglePolicies}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          {isEnabled ? (
            <>
              <ToggleRight className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-neutral-200">Enabled</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-neutral-500" />
              <span className="text-sm text-neutral-400">Disabled</span>
            </>
          )}
        </button>
      </div>

      {!isEnabled ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-neutral-300 mb-2">
            Custom Policies Disabled
          </h4>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mb-4">
            Enable custom policies to set additional restrictions beyond the global Sentinel policies.
            These settings only apply to your contract.
          </p>
          <button
            onClick={handleTogglePolicies}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
          >
            Enable Custom Policies
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10">
            {[
              { id: 'general', label: 'Volume Limits', icon: Volume2 },
              { id: 'blacklist', label: 'Blacklist', icon: Ban },
              { id: 'functions', label: 'Functions', icon: FileCode },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-white border-white'
                    : 'text-neutral-400 border-transparent hover:text-neutral-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                    <p className="text-sm text-neutral-400">
                      Set custom transaction value limits for your contract. 
                      These must be stricter than the global limits. 
                      Use 0 to use global defaults.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Minimum Value (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={minVolume}
                        onChange={(e) => setMinVolume(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-white focus:border-white/30 focus:outline-none"
                        placeholder="0.001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Maximum Value (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={maxVolume}
                        onChange={(e) => setMaxVolume(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-white focus:border-white/30 focus:outline-none"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Daily Limit (ETH)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={dailyVolume}
                        onChange={(e) => setDailyVolume(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-white focus:border-white/30 focus:outline-none"
                        placeholder="1000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleSaveVolumeLimits}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-neutral-950 rounded-xl font-medium hover:bg-neutral-200 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Limits
                    </button>
                  </div>
                </div>

                {/* Pause Threshold */}
                <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Pause Threshold</h4>
                  <div className="flex gap-2">
                    {[
                      { level: 4, label: 'CRITICAL', color: 'bg-red-500', desc: 'Only critical threats' },
                      { level: 3, label: 'HIGH', color: 'bg-orange-500', desc: 'High severity+' },
                      { level: 2, label: 'MEDIUM', color: 'bg-yellow-500', desc: 'Medium severity+' },
                      { level: 1, label: 'LOW', color: 'bg-blue-500', desc: 'Any violation' },
                    ].map((t) => (
                      <button
                        key={t.level}
                        className="flex-1 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <div className={`w-3 h-3 rounded-full ${t.color} mb-2`} />
                        <p className="text-sm font-medium text-white">{t.label}</p>
                        <p className="text-xs text-neutral-500">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'blacklist' && (
              <motion.div
                key="blacklist"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <AlertOctagon className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <h4 className="text-lg font-medium text-white">Custom Blacklist</h4>
                      <p className="text-sm text-neutral-400">
                        These addresses are blocked from interacting with your contract, 
                        in addition to the global Sentinel blacklist.
                      </p>
                    </div>
                  </div>

                  {/* Add Address */}
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={newBlacklistAddr}
                      onChange={(e) => setNewBlacklistAddr(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-white/30 focus:outline-none"
                    />
                    <button
                      onClick={handleAddToBlacklist}
                      className="flex items-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Block Address
                    </button>
                  </div>

                  {/* Blacklist */}
                  <div className="space-y-2">
                    {blacklist.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500">
                        <Ban className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No addresses blacklisted</p>
                      </div>
                    ) : (
                      blacklist.map((addr) => (
                        <div
                          key={addr}
                          className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                        >
                          <div className="flex items-center gap-3">
                            <Ban className="w-4 h-4 text-red-400" />
                            <code className="text-sm text-neutral-300 font-mono">
                              {addr.slice(0, 6)}...{addr.slice(-4)}
                            </code>
                          </div>
                          <button
                            onClick={() => handleRemoveFromBlacklist(addr)}
                            className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'functions' && (
              <motion.div
                key="functions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-white/10 bg-neutral-900/50 p-6"
              >
                <div className="flex items-start gap-3 mb-6">
                  <FileCode className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-lg font-medium text-white">Function Restrictions</h4>
                    <p className="text-sm text-neutral-400">
                      Block specific function signatures or enable allowlist mode.
                    </p>
                  </div>
                </div>

                <div className="p-8 text-center text-neutral-500">
                  <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Function restriction management coming soon</p>
                  <p className="text-xs mt-1 opacity-70">
                    Use the ManageACE CLI for now
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export default PolicySettings
