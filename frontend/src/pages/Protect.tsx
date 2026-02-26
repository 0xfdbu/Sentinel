/**
 * Protect Page - Contract Registration Setup Flow
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  CheckCircle, 
  AlertOctagon,
  Lock,
  Loader2,
  AlertTriangle,
  FileCode,
  Scan,
  Sparkles,
  Bug,
  ArrowRight,
  Key,
  Copy,
  ExternalLink,
  RefreshCw,
  PauseCircle,
  ShieldCheck,
  Info,
  ChevronLeft,
  Wallet,
  Cpu,
  Zap
} from 'lucide-react'
import { useAccount, usePublicClient, useWalletClient, useNetwork } from 'wagmi'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useRegistry, useGuardian } from '../hooks/useContracts'
import { useScannerCRE, Severity, ScanResult } from '../hooks/useScannerCRE'
import { getAddresses } from '../utils/wagmi'
import { Address } from 'viem'

// ABI fragment for granting PAUSER_ROLE
const PAUSABLE_ABI = [
  {
    name: 'grantRole',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'PAUSER_ROLE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32' }]
  }
] as const

// Setup steps configuration
const SETUP_STEPS = [
  { id: 'address', title: 'Contract Address', icon: FileCode, description: 'Enter contract details' },
  { id: 'scan', title: 'Security Scan', icon: Scan, description: 'AI vulnerability analysis' },
  { id: 'register', title: 'Register', icon: Shield, description: 'Stake & register' },
  { id: 'permission', title: 'Grant Permission', icon: Key, description: 'Allow Sentinel to pause' },
  { id: 'complete', title: 'Protected', icon: CheckCircle, description: 'Monitoring active' },
] as const

type SetupStep = typeof SETUP_STEPS[number]['id']

// Animated scanning effect
function ScanningAnimation() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-neutral-300/20"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-3 rounded-full border-2 border-neutral-300/40"
        animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      <motion.div
        className="absolute inset-6 rounded-full bg-neutral-300/10 flex items-center justify-center"
        animate={{ scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <Sparkles className="w-6 h-6 text-neutral-200" />
      </motion.div>
    </div>
  )
}

// Severity badge component
function SeverityBadge({ severity, category }: { severity?: Severity, category?: string }) {
  if (category === 'Not Verified') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
        <AlertTriangle className="w-4 h-4" />
        Not Verified
      </span>
    )
  }
  
  const config = {
    CRITICAL: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertOctagon, label: 'Critical' },
    HIGH: { color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20', icon: AlertTriangle, label: 'High' },
    MEDIUM: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: AlertTriangle, label: 'Medium' },
    LOW: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Bug, label: 'Low' },
    SAFE: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle, label: 'Safe' },
  }
  
  const { color, icon: Icon, label } = config[severity || 'SAFE']
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border", color)}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  )
}

// Mobile Step Indicator (Horizontal)
function MobileStepIndicator({ steps, currentStep }: { steps: typeof SETUP_STEPS, currentStep: SetupStep }) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)
  
  return (
    <div className="lg:hidden mb-6">
      {/* Progress bar */}
      <div className="relative h-1 bg-neutral-800 rounded-full mb-4">
        <motion.div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-neutral-300 to-neutral-200 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Step labels */}
      <div className="flex justify-between text-xs">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          
          return (
            <div key={step.id} className={cn(
              "text-center flex-1",
              isCurrent ? "text-neutral-200" : isCompleted ? "text-slate-50" : "text-neutral-600"
            )}>
              <span className="font-medium">{index + 1}</span>
              <span className="hidden sm:inline ml-1">. {step.title}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Desktop Vertical Step Sidebar Component
function VerticalStepSidebar({ 
  steps, 
  currentStep,
  onStepClick 
}: { 
  steps: typeof SETUP_STEPS, 
  currentStep: SetupStep,
  onStepClick?: (stepId: SetupStep) => void
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)
  
  return (
    <div className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-8">
        {/* Steps */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-neutral-800" />
          <motion.div 
            className="absolute left-5 top-5 w-0.5 bg-gradient-to-b from-neutral-300 to-neutral-200"
            initial={{ height: '0%' }}
            animate={{ height: `${(currentIndex / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isPending = index > currentIndex
              const Icon = step.icon
              
              return (
                <button
                  key={step.id}
                  onClick={() => isCompleted && onStepClick?.(step.id)}
                  disabled={!isCompleted && !isCurrent}
                  className={cn(
                    "w-full flex items-start gap-4 p-3 rounded-xl transition-all text-left",
                    isCompleted && "hover:bg-white/5 cursor-pointer",
                    isCurrent && "bg-neutral-300/5",
                    isPending && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Icon/Number */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                    }}
                    className={cn(
                      "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300",
                      isCompleted && "bg-neutral-300 text-neutral-950",
                      isCurrent && "bg-neutral-300 text-neutral-950 shadow-lg shadow-neutral-300/30",
                      isPending && "bg-neutral-800 text-neutral-500 border border-neutral-700"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </motion.div>
                  
                  {/* Text */}
                  <div className="flex-1 pt-1">
                    <p className={cn(
                      "font-medium text-sm",
                      isCompleted || isCurrent ? "text-slate-50" : "text-neutral-500"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Status indicator */}
                  {isCurrent && (
                    <motion.div
                      layoutId="active-indicator"
                      className="w-1.5 h-1.5 rounded-full bg-neutral-200 mt-4"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Security Note */}
        <div className="mt-8 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-400">
              <span className="text-emerald-400 font-medium">Non-custodial.</span> Sentinel can only pause. 
              You keep full control of your funds.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Code block component
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-white/5">
        <span className="text-xs text-neutral-500">Solidity</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-slate-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}

// Info card component
function InfoCard({ icon: Icon, title, children, variant = 'default' }: { 
  icon: any, 
  title: string, 
  children: React.ReactNode,
  variant?: 'default' | 'warning' | 'success' | 'info'
}) {
  const variants = {
    default: 'bg-neutral-900/50 border-white/10',
    warning: 'bg-neutral-300/5 border-neutral-300/20',
    success: 'bg-emerald-500/5 border-emerald-500/20',
    info: 'bg-blue-500/5 border-blue-500/20',
  }
  
  const iconColors = {
    default: 'text-neutral-200 bg-neutral-300/10',
    warning: 'text-neutral-200 bg-neutral-300/10',
    success: 'text-emerald-400 bg-emerald-500/10',
    info: 'text-blue-400 bg-blue-500/10',
  }
  
  return (
    <div className={cn("rounded-2xl border p-5", variants[variant])}>
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconColors[variant])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-slate-50 mb-1">{title}</h4>
          <div className="text-sm text-neutral-400">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Vulnerability Card Component
function VulnerabilityCard({ vuln, index }: { vuln: any, index: number }) {
  const severityColors = {
    CRITICAL: 'bg-red-500/10 border-red-500/20',
    HIGH: 'bg-neutral-500/10 border-neutral-500/20',
    MEDIUM: 'bg-yellow-500/10 border-yellow-500/20',
    LOW: 'bg-blue-500/10 border-blue-500/20',
  }
  
  const severityText = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-neutral-400',
    MEDIUM: 'text-yellow-400',
    LOW: 'text-blue-400',
  }
  
  return (
    <div className={cn("p-4 rounded-xl border", severityColors[vuln.severity as keyof typeof severityColors] || 'bg-neutral-800/50 border-white/5')}>      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-slate-200">{vuln.type}</h4>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-white/5", severityText[vuln.severity as keyof typeof severityText] || 'text-neutral-400')}>
          {vuln.severity}
        </span>
      </div>
      <p className="text-sm text-neutral-400 mb-2">{vuln.description}</p>
      {vuln.recommendation && (
        <p className="text-xs text-emerald-400/80">
          <span className="font-medium">Fix:</span> {vuln.recommendation}
        </p>
      )}
    </div>
  )
}

export default function Protect() {
  const { address: connectedAddress, isConnected } = useAccount()
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const addresses = getAddresses(chain?.id)
  
  // Hooks
  const { isScanning, status, result, scanContract, setResult, setStatus } = useScannerCRE()
  const { register, getProtectedContracts } = useRegistry()
  const { GUARDIAN_ADDRESS } = useGuardian()
  
  // State
  const [currentStep, setCurrentStep] = useState<SetupStep>('address')
  const [contractAddress, setContractAddress] = useState('')
  const [contractName, setContractName] = useState('')
  const [stakeAmount, setStakeAmount] = useState('0.01')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isGranting, setIsGranting] = useState(false)
  const [hasGrantedPermission, setHasGrantedPermission] = useState(false)
  const [registrationTx, setRegistrationTx] = useState('')
  const [registeredContracts, setRegisteredContracts] = useState<string[]>([])
  
  // Load registered contracts
  useEffect(() => {
    if (isConnected && publicClient) {
      loadRegisteredContracts()
    }
  }, [isConnected, publicClient])
  
  const loadRegisteredContracts = async () => {
    try {
      const contracts = await getProtectedContracts(0, 50)
      setRegisteredContracts(contracts.map(c => c.toLowerCase()))
    } catch (e) {
      console.error('Failed to load contracts:', e)
    }
  }
  
  const isValidAddress = (addr: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(addr)
  const isAlreadyRegistered = (addr: string): boolean => registeredContracts.includes(addr.toLowerCase())
  
  // Scan result state (local to ensure it's available immediately)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  // Step 1: Start scan
  const handleStartScan = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }
    
    if (!isValidAddress(contractAddress)) {
      toast.error('Please enter a valid contract address')
      return
    }
    
    if (!contractName.trim()) {
      toast.error('Please enter a contract name')
      return
    }
    
    if (isAlreadyRegistered(contractAddress)) {
      toast.error('This contract is already registered')
      return
    }
    
    setCurrentStep('scan')
    setResult(null)
    setScanResult(null)
    setStatus({ step: 'fetching', message: 'Initializing security scan...' })
    
    try {
      const result = await scanContract(contractAddress, chain?.id || 11155111)
      console.log('Scan result:', result)
      if (result) {
        setScanResult(result)
      }
      setCurrentStep('register')
    } catch (error: any) {
      console.error('Scan error:', error)
      if (error?.message?.includes('not verified')) {
        const notVerifiedResult = {
          severity: 'SAFE' as const,
          category: 'Not Verified',
          vector: 'Contract source code not available',
          lines: [],
          confidence: 0,
          recommendation: 'You can still register for runtime monitoring without source analysis.'
        }
        setResult(notVerifiedResult)
        setScanResult(notVerifiedResult as ScanResult)
        toast('Contract not verified - continuing with registration', { icon: '⚠️' })
      }
      setCurrentStep('register')
    }
  }
  
  // Use local scan result if available, otherwise use hook result
  const displayResult = scanResult || result
  
  // Step 2: Register
  const handleRegister = async () => {
    if (!walletClient || !connectedAddress) return
    
    setIsRegistering(true)
    
    try {
      const txHash = await register(contractAddress, contractName, stakeAmount)
      setRegistrationTx(txHash)
      
      await publicClient?.waitForTransactionReceipt({ hash: txHash })
      
      toast.success('Contract registered successfully!')
      
      if (result) {
        localStorage.setItem(`scan-${contractAddress}`, JSON.stringify({ ...result, timestamp: Date.now() }))
      }
      
      await loadRegisteredContracts()
      setCurrentStep('permission')
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to register')
    } finally {
      setIsRegistering(false)
    }
  }
  
  // Step 3: Grant permission
  const handleGrantPermission = async () => {
    if (!walletClient || !connectedAddress) return
    
    setIsGranting(true)
    
    try {
      const pauserRole = await publicClient?.readContract({
        address: contractAddress as Address,
        abi: PAUSABLE_ABI,
        functionName: 'PAUSER_ROLE'
      })
      
      const txHash = await walletClient.writeContract({
        address: contractAddress as Address,
        abi: PAUSABLE_ABI,
        functionName: 'grantRole',
        args: [pauserRole as `0x${string}`, GUARDIAN_ADDRESS as Address]
      })
      
      await publicClient?.waitForTransactionReceipt({ hash: txHash })
      
      setHasGrantedPermission(true)
      toast.success('Permission granted! Your contract is now protected.')
      setCurrentStep('complete')
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant permission')
    } finally {
      setIsGranting(false)
    }
  }
  
  const checkPermission = async () => {
    if (!publicClient || !isValidAddress(contractAddress)) return
    
    try {
      const pauserRole = await publicClient.readContract({
        address: contractAddress as Address,
        abi: PAUSABLE_ABI,
        functionName: 'PAUSER_ROLE'
      })
      
      const hasRole = await publicClient.readContract({
        address: contractAddress as Address,
        abi: PAUSABLE_ABI,
        functionName: 'hasRole',
        args: [pauserRole as `0x${string}`, GUARDIAN_ADDRESS as Address]
      })
      
      setHasGrantedPermission(hasRole as boolean)
      if (hasRole) toast.success('Permission already granted!')
    } catch (e) {
      console.error('Failed to check permission:', e)
    }
  }
  
  const handleReset = () => {
    setCurrentStep('address')
    setContractAddress('')
    setContractName('')
    setStakeAmount('0.01')
    setResult(null)
    setRegistrationTx('')
    setHasGrantedPermission(false)
    setStatus({ step: 'idle', message: 'Ready to scan' })
  }
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'address':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className=" mx-auto"
          >
            {/* Form Card */}
            <div className="">
              
              <div className="space-y-5">
                {/* Contract Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contract Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-neutral-500 font-mono text-sm">0x</span>
                    </div>
                    <input
                      type="text"
                      placeholder="4803e41148cd42629aeecb174f9fedfddcccd3c3"
                      value={contractAddress.replace(/^0x/, '')}
                      onChange={(e) => setContractAddress(e.target.value.startsWith('0x') ? e.target.value : '0x' + e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-12 py-3.5 bg-neutral-950 border rounded-xl text-slate-50 placeholder-neutral-600 focus:outline-none focus:ring-2 font-mono text-sm transition-all",
                        isAlreadyRegistered(contractAddress) 
                          ? "border-red-500/50 focus:ring-red-500/20 focus:border-red-500/50" 
                          : "border-white/10 focus:border-neutral-300/50 focus:ring-neutral-300/20 group-hover:border-white/20"
                      )}
                    />
                    {isValidAddress(contractAddress) && !isAlreadyRegistered(contractAddress) && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  {isAlreadyRegistered(contractAddress) && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm mt-2 flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                      </div>
                      This contract is already registered
                    </motion.p>
                  )}
                </div>
                
                {/* Contract Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contract Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="My DeFi Vault"
                      value={contractName}
                      onChange={(e) => setContractName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 placeholder-neutral-600 focus:border-neutral-300/50 focus:outline-none focus:ring-2 focus:ring-neutral-300/20 transition-all hover:border-white/20"
                    />
                  </div>
                </div>
                
                {/* Stake Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Stake Amount
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full px-4 py-3.5 bg-neutral-950 border border-white/10 rounded-xl text-slate-50 focus:border-neutral-300/50 focus:outline-none focus:ring-2 focus:ring-neutral-300/20 transition-all pr-20 hover:border-white/20"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
                      <span className="text-neutral-400 font-medium">ETH</span>
                      <div className="w-5 h-5 rounded-full bg-neutral-300/20 flex items-center justify-center">
                        <span className="text-xs text-neutral-200">♦</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Minimum 0.01 ETH required. Fully refundable.
                  </p>
                </div>
                
                {/* Submit Button */}
                <motion.button
                  onClick={handleStartScan}
                  disabled={!isValidAddress(contractAddress) || !contractName.trim() || isAlreadyRegistered(contractAddress)}
                  whileHover={{ scale: isValidAddress(contractAddress) && contractName.trim() && !isAlreadyRegistered(contractAddress) ? 1.02 : 1 }}
                  whileTap={{ scale: isValidAddress(contractAddress) && contractName.trim() && !isAlreadyRegistered(contractAddress) ? 0.98 : 1 }}
                  className="w-full py-4 bg-gradient-to-r from-neutral-300 to-neutral-500 hover:from-neutral-200 hover:to-neutral-400 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-neutral-950 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed shadow-lg shadow-neutral-300/20 disabled:shadow-none"
                >
                  <Scan className="w-5 h-5" />
                  Start Security Scan
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            
            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: Shield, label: 'AI Scan', desc: 'xAI Grok' },
                { icon: Lock, label: 'Non-Custodial', desc: 'You control' },
                { icon: Zap, label: 'Instant', desc: '< 2s pause' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                  <item.icon className="w-5 h-5 text-neutral-200/80 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-300">{item.label}</p>
                  <p className="text-[10px] text-neutral-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )
        
      case 'scan':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center"
          >
            <ScanningAnimation />
            
            <p className="text-neutral-400 mb-6">Scanning via Chainlink CRE with xAI Grok...</p>
            
            <div className="flex items-center justify-center gap-2 text-neutral-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{status.message}</span>
            </div>
            
            <div className="mt-8 flex justify-center gap-2">
              {['Fetching', 'Analyzing', 'Scoring'].map((step, i) => (
                <div 
                  key={step}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    status.step === 'fetching' && i === 0 ? "bg-neutral-200" :
                    status.step === 'analyzing' && i <= 1 ? "bg-neutral-200" :
                    status.step === 'complete' ? "bg-neutral-200" :
                    "bg-neutral-700"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )
        
      case 'register':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className=""
          >
            {/* Scan Results */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-50">Security Analysis</h3>
                <SeverityBadge severity={displayResult?.riskLevel || displayResult?.severity} category={displayResult?.category} />
              </div>
              
              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
                {displayResult?.category === 'Not Verified' ? (
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-neutral-200 mt-0.5" />
                    <div>
                      <p className="text-slate-200 font-medium">Contract Not Verified</p>
                      <p className="text-sm text-neutral-400 mt-1">
                        This contract is not verified on Etherscan. AI vulnerability analysis is unavailable, 
                        but you can still register for runtime monitoring and heuristics-based protection.
                      </p>
                    </div>
                  </div>
                ) : displayResult ? (
                  <div className="space-y-4">
                    {/* Risk Score */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4 rounded-xl bg-neutral-800/50">
                      <div className="flex items-center gap-4 sm:block">
                        <span className="text-xs text-neutral-500 uppercase sm:hidden">Risk Score</span>
                        <div className="flex items-baseline gap-2">
                          <span className={cn(
                            "text-3xl sm:text-4xl font-bold",
                            displayResult.overallScore && displayResult.overallScore >= 80 ? "text-emerald-400" :
                            displayResult.overallScore && displayResult.overallScore >= 60 ? "text-yellow-400" :
                            displayResult.overallScore && displayResult.overallScore >= 40 ? "text-neutral-400" :
                            "text-red-400"
                          )}>
                            {displayResult.overallScore ?? 'N/A'}
                          </span>
                          <span className="text-neutral-500">/ 100</span>
                        </div>
                        <span className="text-xs text-neutral-500 uppercase hidden sm:block mt-1">Risk Score</span>
                      </div>
                      <div className="hidden sm:block h-12 w-px bg-white/10" />
                      <div className="flex items-center justify-between sm:block">
                        <span className="text-xs text-neutral-500 uppercase sm:hidden">Issues Found</span>
                        <p className="text-xl sm:text-2xl font-bold text-slate-200">
                          {displayResult.vulnerabilities?.length || 0}
                        </p>
                        <span className="text-xs text-neutral-500 uppercase hidden sm:block mt-1">Issues Found</span>
                      </div>
                      <div className="hidden sm:block h-12 w-px bg-white/10" />
                      <div className="flex items-center justify-between sm:block">
                        <span className="text-xs text-neutral-500 uppercase sm:hidden">Contract</span>
                        <p className="text-sm text-slate-200">{displayResult.contractName || 'Unknown'}</p>
                        <span className="text-xs text-neutral-500 uppercase hidden sm:block mt-1">Contract</span>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    {displayResult.summary && (
                      <div className="p-4 rounded-xl bg-neutral-800/30">
                        <span className="text-xs text-neutral-500 uppercase">Summary</span>
                        <p className="text-sm text-slate-300 mt-1">{displayResult.summary}</p>
                      </div>
                    )}
                    
                    {/* Vulnerabilities List */}
                    {displayResult.vulnerabilities && displayResult.vulnerabilities.length > 0 && (
                      <div>
                        <span className="text-xs text-neutral-500 uppercase mb-3 block">Detected Issues</span>
                        <div className="space-y-3">
                          {displayResult.vulnerabilities.map((vuln, idx) => (
                            <VulnerabilityCard key={idx} vuln={vuln} index={idx} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-center py-4">No scan results available</p>
                )}
              </div>
            </div>
            
            {/* Registration Summary */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 mb-6">
              <h3 className="font-semibold text-slate-50 mb-4">Registration Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-neutral-400">Contract</span>
                  <span className="text-slate-200 font-medium">{contractName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-neutral-400">Address</span>
                  <code className="text-slate-200">{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</code>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-neutral-400">Stake</span>
                  <span className="text-neutral-200 font-medium">{stakeAmount} ETH</span>
                </div>
              </div>
              
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-300">
                  <strong className="text-emerald-400">You stay in control.</strong> Sentinel can only PAUSE your contract. 
                  We cannot withdraw, transfer, or access your funds. Only you can unpause.
                </p>
              </div>
            </div>
            
            {/* Critical Warning */}
            {(result?.riskLevel === 'CRITICAL' || result?.severity === 'CRITICAL') && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-400">Critical Risk Detected</h4>
                  <p className="text-sm text-red-300/80 mt-1">
                    This contract has critical vulnerabilities. Consider fixing them before registering.
                  </p>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('address')}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-slate-50 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="flex-1 py-3 bg-neutral-300 hover:bg-neutral-200 disabled:bg-neutral-800 text-neutral-950 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Register Contract
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )
        
      case 'permission':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className=""
          >
            {/* Permission Info */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <InfoCard icon={CheckCircle} title="Sentinel CAN" variant="success">
                <ul className="space-y-2 mt-2">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Pause your contract instantly
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Trigger on fraud score ≥ 85
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Protect funds during attacks
                  </li>
                </ul>
              </InfoCard>
              
              <InfoCard icon={Lock} title="Sentinel CANNOT" variant="warning">
                <ul className="space-y-2 mt-2">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Withdraw or transfer funds
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Unpause your contract
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Modify contract state
                  </li>
                </ul>
              </InfoCard>
            </div>
            
            {/* Auto Grant Button */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 mb-6">
              <h3 className="font-semibold text-slate-50 mb-4">Grant Permission</h3>
              
              <button
                onClick={handleGrantPermission}
                disabled={isGranting}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-neutral-950 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mb-4"
              >
                {isGranting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Granting...
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-5 h-5" />
                    Grant PAUSER_ROLE to Sentinel
                  </>
                )}
              </button>
              
              <button
                onClick={checkPermission}
                className="w-full py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Check if already granted
              </button>
            </div>
            
            {/* Manual Option */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
              <h3 className="font-semibold text-slate-50 mb-3">Or Grant Manually</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Call this function on your contract as the owner:
              </p>
              <CodeBlock code={`grantRole(
  PAUSER_ROLE,
  ${GUARDIAN_ADDRESS}
)`} />
            </div>
          </motion.div>
        )
        
      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-emerald-500/20 border-4 border-emerald-500/40 flex items-center justify-center mx-auto mb-6"
            >
              <Shield className="w-10 h-10 text-emerald-400" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-slate-50 mb-2">You're Protected!</h2>
            <p className="text-neutral-400 mb-8 text-sm">
              Your contract is now monitored 24/7. We'll instantly pause it if threats are detected.
            </p>
            
            {/* Summary */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400 text-sm">Contract</span>
                  <span className="text-slate-200 font-medium">{contractName}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400 text-sm">Address</span>
                  <a 
                    href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-200 hover:text-neutral-300 flex items-center gap-1 text-sm"
                  >
                    {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-400 text-sm">Stake</span>
                  <span className="text-neutral-200">{stakeAmount} ETH</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-400 text-sm">Status</span>
                  <span className="text-emerald-400 flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Protected
                  </span>
                </div>
              </div>
            </div>
            
            {/* What's Next */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6 text-left">
              <h3 className="font-semibold text-emerald-400 mb-3 text-sm">What's Next?</h3>
              <ul className="space-y-2 text-xs text-neutral-300">
                {[
                  '24/7 monitoring is now active',
                  "You'll receive alerts if threats are detected",
                  'Contract auto-pauses on fraud score ≥ 85',
                  'You can unpause anytime after fixing issues'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-xs text-emerald-400">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-50 rounded-xl font-medium transition-colors inline-flex items-center gap-2 text-sm"
            >
              <Shield className="w-4 h-4" />
              Protect Another Contract
            </button>
          </motion.div>
        )
        
      default:
        return null
    }
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8">
      {/* Fancy Centered Header */}
      <div className="text-center mb-10 lg:mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neutral-300/20 to-neutral-500/20 border border-neutral-300/30 mb-4"
        >
          <Shield className="w-5 h-5 text-neutral-200" />
          <span className="text-sm font-medium text-neutral-300">Sentinel Protection</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-5xl font-bold text-slate-50 mb-3"
        >
          <span className="bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-300 bg-clip-text text-transparent">
            Protect Your Contract
          </span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-neutral-400 max-w-lg mx-auto text-lg"
        >
          AI-powered security scanning with instant emergency pause protection
        </motion.p>
      </div>
      
      <div className="flex flex-col lg:flex-row lg:gap-8">
        {/* Left Sidebar - Steps (Desktop) */}
        <VerticalStepSidebar 
          steps={SETUP_STEPS} 
          currentStep={currentStep}
          onStepClick={(stepId) => {
            const currentIndex = SETUP_STEPS.findIndex(s => s.id === currentStep)
            const targetIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
            if (targetIndex < currentIndex) {
              setCurrentStep(stepId)
            }
          }}
        />
        
        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile Step Indicator */}
          <MobileStepIndicator steps={SETUP_STEPS} currentStep={currentStep} />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl lg:rounded-3xl border border-white/10 bg-neutral-900/30 backdrop-blur-sm p-5 lg:p-8 min-h-[400px] lg:min-h-[500px]"
          >
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
          </motion.div>
          
          {/* Mobile Security Note */}
          <div className="lg:hidden mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-400">
                <span className="text-emerald-400 font-medium">Non-custodial.</span> Sentinel can only pause. 
                You keep full control of your funds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
