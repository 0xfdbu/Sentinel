import { motion } from 'framer-motion';
import { 
  Shield, 
  Coins, 
  Activity,
  Ban,
  Cpu,
  Lock,
  Globe,
  Database,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { 
  EthPorUnifiedDiagram,
  VolumeSentinelDiagram,
  SentinelSecurityDiagram,
  BlacklistManagerDiagram
} from './workflows';

interface Workflow {
  id: string;
  name: string;
  path: string;
  icon: any;
  color: string;
  description: string;
  trigger: string;
  apis: string[];
  features: string[];
  diagram: React.ComponentType;
}

const workflows: Workflow[] = [
  {
    id: 'eth-por-unified',
    name: 'ETH + PoR Unified Mint',
    path: 'workflows/eth-por-unified',
    icon: Coins,
    color: 'cyan',
    description: 'Mint USDA stablecoins with AI-powered final approval. User deposits ETH to SentinelVault → emits ETHDeposited event. In production, this auto-triggers on the Chainlink DON. For simulation, we built a custom Event Listener that watches blockchain events and automatically executes the CRE CLI, giving users a seamless frontend experience identical to production. Workflow fetches 3-source ETH prices, runs compliance checks, and mints USDA via MintingConsumer.',
    trigger: 'EVM Log Trigger on ETHDeposited event (SentinelVault) → Custom Event Listener (auto-triggers CLI to simulate production DON)',
    apis: ['Coinbase', 'Kraken', 'Binance (Public)', 'ScamSniffer (Public)', 'First PlaidyPus Bank (Confidential)', 'xAI Grok (Confidential)'],
    features: ['3-source price consensus', 'Scam database check', 'Confidential HTTP (vault secrets)', 'xAI Grok final decision', 'DON-signed mint', 'On-chain ACE (PolicyProtected)', '6-decimal USDA conversion'],
    diagram: EthPorUnifiedDiagram
  },
  {
    id: 'volume-sentinel',
    name: 'Volume Sentinel',
    path: 'workflows/volume-sentinel',
    icon: Activity,
    color: 'purple',
    description: 'AI-powered volume limit adjustments with Confidential HTTP. Analyzes crypto news from Finnhub, CoinGecko trending coins and global market metrics, then uses xAI Grok via Confidential HTTP to recommend USDA transaction limit changes based on market sentiment.',
    trigger: 'Cron Trigger - Every 15 minutes (0 */15 * * * *)',
    apis: ['Finnhub News (Public)', 'CoinGecko Trending (Public)', 'CoinGecko Global (Public)', 'xAI Grok (Confidential)'],
    features: ['Market sentiment analysis', 'Fear & Greed index', 'Confidential HTTP for xAI', 'AI limit recommendations', 'Auto volume adjustment'],
    diagram: VolumeSentinelDiagram
  },
  {
    id: 'sentinel-security',
    name: 'Sentinel Security Scanner',
    path: 'workflows/sentinel-security',
    icon: Shield,
    color: 'emerald',
    description: 'Real-time threat detection with Confidential HTTP. Monitors mempool for suspicious transactions, fetches contract source via Etherscan, performs AI security analysis with xAI Grok via Confidential HTTP, and auto-pauses vulnerable contracts when risk ≥ MEDIUM.',
    trigger: 'HTTP POST on threat detection (on-demand security scan)',
    apis: ['Etherscan (Public)', 'xAI Grok (Confidential)'],
    features: ['Mempool monitoring', 'Contract source fetch', 'Confidential HTTP for xAI', 'AI vulnerability scan', 'Auto-pause protection', 'DON attestation'],
    diagram: SentinelSecurityDiagram
  },
  {
    id: 'blacklist-manager',
    name: 'Blacklist Manager',
    path: 'workflows/blacklist-manager',
    icon: Ban,
    color: 'red',
    description: 'Decentralized blacklist synchronization for ACE compliance. Fetches OFAC sanctions lists, Sentinel custom blacklists, and Chainalysis data, merges and deduplicates in TEE, computes Merkle root, then updates on-chain PolicyEngine to block bad actors.',
    trigger: 'Cron Trigger - Daily at 00:00 UTC (0 0 * * *)',
    apis: ['OFAC Treasury (Public)', 'Sentinel Database (Public)', 'Chainalysis (Public)'],
    features: ['OFAC compliance', 'Multi-source merge', 'Merkle root optimization', 'TEE processing', 'Batch on-chain updates', 'ACE integration'],
    diagram: BlacklistManagerDiagram
  }
];

export function WorkflowsSection() {
  const [activeWorkflow, setActiveWorkflow] = useState<string>(workflows[0].id);
  const selected = workflows.find(w => w.id === activeWorkflow)!;
  const SelectedIcon = selected.icon;
  const SelectedDiagram = selected.diagram;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-white mb-4">
          CRE Workflow Engine
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto">
          Chainlink Runtime Environment (CRE) workflows execute in Trusted Execution Environments (TEE).
          Each workflow fetches real-world data via Confidential HTTP, performs AI analysis, and generates 
          DON-signed reports for verified on-chain execution.
        </p>
      </motion.div>

      {/* Workflow Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          const isActive = activeWorkflow === workflow.id;
          
          return (
            <motion.button
              key={workflow.id}
              onClick={() => setActiveWorkflow(workflow.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-4 rounded-xl border text-left transition-all",
                isActive 
                  ? `bg-${workflow.color}-950/30 border-${workflow.color}-500/50` 
                  : "bg-neutral-900/50 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isActive ? `bg-${workflow.color}-500/20` : "bg-white/5"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? `text-${workflow.color}-400` : "text-neutral-400"
                  )} />
                </div>
              </div>
              <div className={cn(
                "text-sm font-medium",
                isActive ? "text-white" : "text-neutral-400"
              )}>
                {workflow.name}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1 font-mono truncate">
                {workflow.path}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Active Workflow Detail with Architecture Diagram */}
      <motion.div
        key={activeWorkflow}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-white/10 bg-neutral-900/50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
              `bg-${selected.color}-500/20`
            )}>
              <SelectedIcon className={cn("w-7 h-7", `text-${selected.color}-400`)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">{selected.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-neutral-400 font-mono">
                  {selected.path}
                </span>
              </div>
              <p className="text-neutral-400 text-sm">{selected.description}</p>
            </div>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="border-b border-white/10">
          <SelectedDiagram />
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-white/[0.02]">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Trigger */}
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Zap className="w-3 h-3 text-yellow-400" />
                TRIGGER
              </div>
              <div className="text-sm text-white">{selected.trigger}</div>
            </div>

            {/* APIs */}
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Globe className="w-3 h-3 text-blue-400" />
                EXTERNAL APIs ({selected.apis.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.apis.map((api) => (
                  <span key={api} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-neutral-300">
                    {api}
                  </span>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Database className="w-3 h-3 text-emerald-400" />
                KEY FEATURES
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.features.map((feature) => (
                  <span key={feature} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-neutral-300">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CRE Info Bar */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-6 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>TEE Confidential Execution</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-blue-400" />
              <span>DON-Signed Reports (ECDSA)</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-purple-400" />
              <span>Confidential HTTP (API keys protected)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* How CRE Works */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-8 p-4 rounded-xl border border-white/10 bg-white/[0.02]"
      >
        <div className="flex items-start gap-3">
          <Cpu className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">How CRE Workflows Work</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Workflows are TypeScript code that execute inside Chainlink's Trusted Execution Environment (TEE).
              API keys are injected via Confidential HTTP and never exposed in logs or responses. Each workflow 
              generates a cryptographically signed report (ECDSA) that is verified on-chain before execution.
              This provides cryptographic proof that the data and analysis were performed correctly inside the TEE.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
