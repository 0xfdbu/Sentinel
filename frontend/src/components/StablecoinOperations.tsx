/**
 * Stablecoin Operations Component
 * 
 * Modern UI for Mint and Burn operations using CRE Workflow API
 * Includes CCIP cross-chain bridging
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins,
  Flame,
  ArrowRightLeft,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Wallet,
  ArrowDown,
  Sparkles,
  Globe,
  Clock,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/cn'
import { useStablecoinAPI } from '../hooks/useStablecoinAPI'
import { CCIPBridge } from './CCIPBridge'

interface StablecoinOperationsProps {
  usdaAddress: string;
  usdaBalance: bigint | null;
  onSuccess?: () => void;
}

type OperationTab = 'mint' | 'burn' | 'bridge';

export function StablecoinOperations({ usdaAddress, usdaBalance, onSuccess }: StablecoinOperationsProps) {
  const { address } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { mint, burn, ccipTransfer, isLoading, lastResponse } = useStablecoinAPI();
  
  const [activeTab, setActiveTab] = useState<OperationTab>('mint');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [destinationChain, setDestinationChain] = useState('arbitrum-sepolia');
  const [showSuccess, setShowSuccess] = useState(false);

  // Format USDA balance (6 decimals)
  const formatUsda = (value: bigint | null) => {
    if (!value) return '0.00';
    return (Number(value) / 1e6).toFixed(2);
  };

  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const result = await mint({
      usdAmount: amount,
    });

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        onSuccess?.();
      }, 3000);
    }
  };

  const handleBurn = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const burnAmount = parseFloat(amount);
    const balance = usdaBalance ? Number(usdaBalance) / 1e6 : 0;
    
    if (burnAmount > balance) {
      toast.error(`Insufficient balance. You have ${balance.toFixed(2)} USDA`);
      return;
    }

    const result = await burn({
      usdAmount: amount,
    });

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        onSuccess?.();
      }, 3000);
    }
  };

  const handleCCIP = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!recipient) {
      toast.error('Please enter a recipient address');
      return;
    }

    const result = await ccipTransfer({
      amount,
      recipient,
      destinationChain,
    });

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        setRecipient('');
        onSuccess?.();
      }, 5000);
    }
  };

  const tabs = [
    { id: 'mint' as const, label: 'Mint', icon: Coins, color: 'emerald' },
    { id: 'burn' as const, label: 'Burn', icon: Flame, color: 'orange' },
    { id: 'bridge' as const, label: 'Bridge', icon: ArrowRightLeft, color: 'blue' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Selection */}
      <div className="flex gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all",
              activeTab === tab.id
                ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && lastResponse?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowSuccess(false)}
          >
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {activeTab === 'mint' && 'Mint Initiated!'}
                {activeTab === 'burn' && 'Burn Initiated!'}
                {activeTab === 'bridge' && 'Bridge Initiated!'}
              </h3>
              <p className="text-neutral-400 mb-6">
                {lastResponse.data?.txHash 
                  ? 'Your transaction has been submitted to the network.'
                  : 'Your request is being processed.'}
              </p>
              
              {lastResponse.data?.txHash && (
                <div className="space-y-2">
                  <a
                    href={lastResponse.data.etherscan || lastResponse.data.sourceExplorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Transaction
                  </a>
                  {lastResponse.data.ccipExplorer && (
                    <a
                      href={lastResponse.data.ccipExplorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      Track on CCIP Explorer
                    </a>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setShowSuccess(false)}
                className="mt-4 text-neutral-500 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'mint' && (
          <motion.div
            key="mint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Mint USDA</h3>
                <p className="text-sm text-neutral-500">Create new USDA tokens backed by bank reserves</p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-neutral-400 mb-2">Amount to Mint</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white text-2xl font-mono focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-neutral-500">USDA</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Bank reserves: $1,400.21 USD available
              </p>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 mb-6">
              <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div className="text-sm text-neutral-400">
                <p className="text-white font-medium mb-1">ACE Policy Protection</p>
                <p>Your address will be checked against the blacklist before minting.</p>
              </div>
            </div>

            {/* Mint Button */}
            <button
              onClick={handleMint}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <><Coins className="w-5 h-5" /> Mint USDA</>
              )}
            </button>
          </motion.div>
        )}

        {activeTab === 'burn' && (
          <motion.div
            key="burn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Burn USDA</h3>
                <p className="text-sm text-neutral-500">Redeem USDA tokens for bank reserves</p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-neutral-400 mb-2">Amount to Burn</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className="w-full px-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white text-2xl font-mono focus:border-orange-500/50 focus:outline-none disabled:opacity-50"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    onClick={() => setAmount(formatUsda(usdaBalance))}
                    className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded bg-orange-500/10"
                  >
                    MAX
                  </button>
                  <span className="text-neutral-500">USDA</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Your balance: {formatUsda(usdaBalance)} USDA
              </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-6">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
              <div className="text-sm text-neutral-400">
                <p className="text-white font-medium mb-1">Warning</p>
                <p>Burning is irreversible. You will receive bank reserves in exchange for your USDA.</p>
              </div>
            </div>

            {/* Burn Button */}
            <button
              onClick={handleBurn}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-400 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <><Flame className="w-5 h-5" /> Burn USDA</>
              )}
            </button>
          </motion.div>
        )}

        {activeTab === 'bridge' && (
          <motion.div
            key="bridge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Use existing CCIPBridge component */}
            <CCIPBridge 
              stablecoinAddress={usdaAddress}
              tokenSymbol="USDA"
              tokenDecimals={6}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Transaction */}
      {lastResponse && !showSuccess && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-400">Last Transaction</span>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              lastResponse.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}>
              {lastResponse.success ? 'Success' : 'Failed'}
            </span>
          </div>
          {lastResponse.data?.txHash && (
            <a
              href={lastResponse.data.etherscan || lastResponse.data.sourceExplorer}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="w-4 h-4" />
              {lastResponse.data.txHash.slice(0, 20)}...{lastResponse.data.txHash.slice(-6)}
            </a>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default StablecoinOperations;
