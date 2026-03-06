/**
 * CCIP Bridge Component - Redesigned
 * 
 * Modern UI for cross-chain bridging of USDA Stablecoin using Chainlink CCIP
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightLeft,
  Globe,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Clock,
  ExternalLink,
  ChevronDown,
  Info,
  ArrowRight,
  Layers,
  Shield,
  Zap,
  TrendingUp,
  Copy,
  Check,
  X
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { useCCIPBridge, CCIP_CHAIN_SELECTORS, CHAIN_NAMES, CHAIN_COLORS } from '../hooks/useCCIPBridge'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { cn } from '../utils/cn'

interface CCIPBridgeProps {
  stablecoinAddress: string
  tokenSymbol?: string
  tokenDecimals?: number
  onClose?: () => void
}

// Chain logos as simple colored circles with initials
const CHAIN_LOGOS: Record<string, { color: string; initials: string }> = {
  [CCIP_CHAIN_SELECTORS.sepolia.toString()]: { color: '#627EEA', initials: 'S' },
  [CCIP_CHAIN_SELECTORS.arbitrumSepolia.toString()]: { color: '#28A0F0', initials: 'A' },
  [CCIP_CHAIN_SELECTORS.baseSepolia.toString()]: { color: '#0052FF', initials: 'B' },
}

export function CCIPBridge({ 
  stablecoinAddress, 
  tokenSymbol = 'USDA',
  tokenDecimals = 6,
  onClose
}: CCIPBridgeProps) {
  const { address } = useAccount()
  const { balance, isLoading: balanceLoading } = useTokenBalance(stablecoinAddress as `0x${string}`)
  
  const {
    isBridging,
    bridgeTokens,
    getBridgeEstimate,
    isChainConfigured,
    bridgeHistory,
    chainNames,
    chainColors
  } = useCCIPBridge(stablecoinAddress)

  const [amount, setAmount] = useState('')
  const [receiver, setReceiver] = useState('')
  const [selectedChain, setSelectedChain] = useState<bigint>(CCIP_CHAIN_SELECTORS.arbitrumSepolia)
  const [showChainSelect, setShowChainSelect] = useState(false)
  const [estimate, setEstimate] = useState<{
    ccipFeeFormatted: string
    bridgeFeeFormatted: string
    amountAfterFeeFormatted: string
  } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [configuredChains, setConfiguredChains] = useState<bigint[]>([])
  const [copiedAddress, setCopiedAddress] = useState(false)

  // Set receiver to user's address by default
  useEffect(() => {
    if (address && !receiver) {
      setReceiver(address)
    }
  }, [address, receiver])

  // Check which chains are configured
  useEffect(() => {
    const checkChains = async () => {
      const chains: bigint[] = []
      const configured = await Promise.all([
        isChainConfigured(CCIP_CHAIN_SELECTORS.sepolia),
        isChainConfigured(CCIP_CHAIN_SELECTORS.arbitrumSepolia)
      ])
      
      if (configured[0]) chains.push(CCIP_CHAIN_SELECTORS.sepolia)
      if (configured[1]) chains.push(CCIP_CHAIN_SELECTORS.arbitrumSepolia)
      
      setConfiguredChains(chains)
    }
    checkChains()
  }, [isChainConfigured])

  // Calculate bridge estimate when inputs change
  useEffect(() => {
    const calculateEstimate = async () => {
      if (!amount || parseFloat(amount) <= 0 || !receiver) {
        setEstimate(null)
        return
      }

      setIsCalculating(true)
      const result = await getBridgeEstimate(selectedChain, receiver, amount)
      if (result) {
        setEstimate({
          ccipFeeFormatted: result.ccipFeeFormatted,
          bridgeFeeFormatted: result.bridgeFeeFormatted,
          amountAfterFeeFormatted: result.amountAfterFeeFormatted
        })
      }
      setIsCalculating(false)
    }

    const timeout = setTimeout(calculateEstimate, 500)
    return () => clearTimeout(timeout)
  }, [amount, receiver, selectedChain, getBridgeEstimate])

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0 || !receiver) return

    await bridgeTokens({
      destinationChainSelector: selectedChain,
      receiver,
      amount
    })

    // Reset form
    setAmount('')
    setEstimate(null)
  }

  const formatChainName = (selector: bigint) => {
    return chainNames[selector.toString()] || `Chain ${selector}`
  }

  const getChainColor = (selector: bigint) => {
    return chainColors[selector.toString()] || '#666'
  }

  const getChainLogo = (selector: bigint) => {
    return CHAIN_LOGOS[selector.toString()] || { color: '#666', initials: '?' }
  }

  const availableChains = configuredChains.length > 0 
    ? configuredChains 
    : [CCIP_CHAIN_SELECTORS.sepolia, CCIP_CHAIN_SELECTORS.arbitrumSepolia]

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  const currentChainLogo = getChainLogo(selectedChain)
  const balanceFormatted = formatUnits(balance || 0n, tokenDecimals)

  return (
    <div className="space-y-6">
      {/* Main Bridge Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                <Layers className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Cross-Chain Bridge</h3>
                <p className="text-sm text-neutral-400">
                  Transfer {tokenSymbol} via Chainlink CCIP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">CCIP Active</span>
              </div>
              {onClose && (
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              )}
            </div>
          </div>

          {/* Bridge Flow */}
          <div className="space-y-4">
            {/* From Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/5 bg-black/20 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-neutral-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-neutral-500">1</span>
                  From
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-400">Balance:</span>
                  <span className="text-white font-medium">
                    {balanceLoading ? '...' : parseFloat(balanceFormatted).toFixed(2)} {tokenSymbol}
                  </span>
                </div>
              </div>
              
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-4xl font-semibold text-white placeholder-neutral-600 focus:outline-none"
                  />
                  <div className="text-sm text-neutral-500 mt-1">
                    ≈ ${amount ? (parseFloat(amount) * 1).toFixed(2) : '0.00'} USD
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setAmount(balanceFormatted)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    MAX
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                      {tokenSymbol.charAt(0)}
                    </div>
                    <span className="font-medium text-white">{tokenSymbol}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Arrow Connector */}
            <div className="flex justify-center -my-2 relative z-10">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 border border-white/20 flex items-center justify-center shadow-lg shadow-blue-500/20"
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </motion.div>
            </div>

            {/* To Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-white/5 bg-black/20 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-neutral-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-neutral-500">2</span>
                  To
                </span>
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Secured by Chainlink
                </span>
              </div>

              {/* Destination Chain Selector */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowChainSelect(!showChainSelect)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: `${currentChainLogo.color}40` }}
                    >
                      <span style={{ color: currentChainLogo.color }}>{currentChainLogo.initials}</span>
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">
                        {formatChainName(selectedChain)}
                      </div>
                      <div className="text-xs text-neutral-500">Destination Chain</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showChainSelect ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showChainSelect && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-neutral-800 border border-white/10 shadow-2xl z-50 overflow-hidden"
                    >
                      {availableChains.map((chain) => {
                        const logo = getChainLogo(chain)
                        return (
                          <button
                            key={chain.toString()}
                            onClick={() => {
                              setSelectedChain(chain)
                              setShowChainSelect(false)
                            }}
                            className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                          >
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                              style={{ backgroundColor: `${logo.color}40` }}
                            >
                              <span style={{ color: logo.color }}>{logo.initials}</span>
                            </div>
                            <div className="text-left">
                              <div className="text-white font-medium">{formatChainName(chain)}</div>
                              <div className="text-xs text-neutral-500">
                                {chain === selectedChain ? 'Selected' : 'Click to select'}
                              </div>
                            </div>
                            {chain === selectedChain && (
                              <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />
                            )}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Receiver Address */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">Receiver Address</span>
                  {address && (
                    <button
                      onClick={() => setReceiver(address)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Use my address
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:border-blue-500/50 focus:outline-none pr-12"
                  />
                  {receiver && (
                    <button
                      onClick={copyAddress}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {copiedAddress ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Fee Breakdown Card */}
            <AnimatePresence>
              {estimate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-emerald-400">Bridge Estimate</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400 flex items-center gap-2">
                        Bridge Fee
                        <Info className="w-3 h-3 text-neutral-600" />
                      </span>
                      <span className="text-sm text-white">{parseFloat(estimate.bridgeFeeFormatted).toFixed(4)} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-400">CCIP Fee</span>
                      <span className="text-sm text-white">{parseFloat(estimate.ccipFeeFormatted).toFixed(6)} ETH</span>
                    </div>
                    <div className="h-px bg-white/10 my-3" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white">You will receive</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {parseFloat(estimate.amountAfterFeeFormatted).toFixed(2)} {tokenSymbol}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isCalculating && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating fees...
              </div>
            )}

            {/* Bridge Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleBridge}
              disabled={!amount || parseFloat(amount) <= 0 || !receiver || isBridging || isCalculating}
              className="w-full py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%] hover:bg-[position:100%_0] disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25"
            >
              {isBridging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Bridge...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-5 h-5" />
                  Bridge {tokenSymbol}
                </>
              )}
            </motion.button>

            {/* Info Alert */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-200/80">
                  Cross-chain transfers typically take <span className="font-medium">10-30 minutes</span> to complete depending on network congestion.
                </p>
                <p className="text-xs text-amber-200/60 mt-1">
                  Make sure the destination address is correct. Transactions cannot be reversed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatBox 
          icon={Globe}
          label="Supported Chains"
          value="2"
          subValue="Sepolia & Arbitrum"
          color="blue"
        />
        <StatBox 
          icon={TrendingUp}
          label="Bridge Fee"
          value="0.30%"
          subValue="Of transfer amount"
          color="purple"
        />
        <StatBox 
          icon={Shield}
          label="Security"
          value="CCIP"
          subValue="Chainlink secured"
          color="emerald"
        />
      </div>

      {/* Bridge History */}
      <AnimatePresence>
        {bridgeHistory.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-neutral-400" />
              <h4 className="text-lg font-semibold text-white">Recent Bridges</h4>
            </div>
            <div className="space-y-3">
              {bridgeHistory.map((bridge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      bridge.status === 'completed' ? "bg-emerald-500/10" :
                      bridge.status === 'pending' ? "bg-yellow-500/10" : "bg-red-500/10"
                    )}>
                      {bridge.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : bridge.status === 'pending' ? (
                        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {formatUnits(bridge.amount, tokenDecimals)} {tokenSymbol}
                      </p>
                      <p className="text-xs text-neutral-500">
                        To {formatChainName(bridge.destinationChain)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs px-3 py-1.5 rounded-full font-medium",
                      bridge.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                      bridge.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {bridge.status === 'completed' ? 'Completed' : 
                       bridge.status === 'pending' ? 'In Progress' : 'Failed'}
                    </span>
                    {bridge.messageId && (
                      <a
                        href={`https://ccip.chain.link/#/side-drawer/msg/${bridge.messageId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Stat Box Component
function StatBox({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color 
}: { 
  icon: any
  label: string
  value: string
  subValue: string
  color: 'blue' | 'purple' | 'emerald'
}) {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  }

  const iconColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
  }

  return (
    <div className={cn(
      "rounded-2xl border p-4 bg-gradient-to-br",
      colorClasses[color]
    )}>
      <Icon className={cn("w-5 h-5 mb-2", iconColors[color])} />
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{subValue}</div>
    </div>
  )
}

export default CCIPBridge
