import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Coins, 
  Activity,
  Ban,
  Globe,
  Zap,
  Clock,
  ChevronDown,
  ExternalLink,
  GitBranch,
  Snowflake,
  CheckCircle2,
  PauseCircle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { 
  EthPorUnifiedDiagram,
  VolumeSentinelDiagram,
  BlacklistManagerDiagram,
  USDAFreezerDiagram,
  PauseWithDonDiagram
} from './workflows';

interface Workflow {
  id: string;
  name: string;
  shortName: string;
  path: string;
  icon: any;
  color: string;
  description: string;
  trigger: string;
  triggerType: 'cron' | 'event' | 'manual';
  apis: string[];
  features: string[];
  diagram: React.ComponentType;
  status: 'live' | 'beta' | 'dev';
  lastRun: string;
}

const workflows: Workflow[] = [
  {
    id: 'eth-por-unified',
    name: 'USDA + PoR Unified Mint',
    shortName: 'USDA Mint',
    path: 'workflows/eth-por-unified',
    icon: Coins,
    color: 'cyan',
    description: 'Mint USDA stablecoins with AI-powered final approval. User deposits ETH to SentinelVault → emits ETHDeposited event. In production, this auto-triggers on the Chainlink DON. For simulation, we built a custom Event Listener that watches blockchain events and automatically executes the CRE CLI.',
    trigger: 'EVM Log Trigger on ETHDeposited',
    triggerType: 'event',
    apis: ['Coinbase', 'Kraken', 'Binance', 'ScamSniffer', 'First PlaidyPus Bank', 'xAI Grok'],
    features: ['3-source price consensus', 'Scam database check', 'Confidential HTTP', 'xAI Grok decision', 'DON-signed mint'],
    diagram: EthPorUnifiedDiagram,
    status: 'live',
    lastRun: '2 min ago'
  },
  {
    id: 'volume-sentinel',
    name: 'Volume Sentinel',
    shortName: 'Volume Guard',
    path: 'workflows/volume-sentinel',
    icon: Activity,
    color: 'purple',
    description: 'AI-powered volume limit adjustments with Proof of Reserve validation. Fetches real bank reserves from First PlaidyPus Bank API, reads USDA total supply on-chain via EVM client, calculates reserve ratio, then analyzes with xAI Grok. Automatically decreases limits when reserve ratio drops below 2%.',
    trigger: 'Every 15 minutes',
    triggerType: 'cron',
    apis: ['Finnhub News', 'CoinGecko', 'First PlaidyPus Bank', 'xAI Grok', 'Sepolia EVM'],
    features: ['PoR validation', 'On-chain supply read', 'Reserve ratio calc', 'Auto-decrease on low reserves'],
    diagram: VolumeSentinelDiagram,
    status: 'live',
    lastRun: '12 min ago'
  },
  {
    id: 'blacklist-manager',
    name: 'Blacklist Manager',
    shortName: 'Blacklist Sync',
    path: 'workflows/blacklist-manager',
    icon: Ban,
    color: 'red',
    description: 'Decentralized blacklist synchronization for ACE compliance. Aggregates security data from GoPlus API (SlowMist, ScamSniffer aggregation), ScamSniffer GitHub database, and Sanction Source. All fetched inside CRE TEE, merged and deduplicated, computes Merkle root, then updates on-chain PolicyEngine.',
    trigger: 'Daily at 00:00 UTC',
    triggerType: 'cron',
    apis: ['GoPlus Security API', 'ScamSniffer Database', 'Sanction Source', 'Sepolia EVM'],
    features: ['Security-focused sources', 'Multi-source merge', 'Merkle root', 'TEE processing', 'Batch updates'],
    diagram: BlacklistManagerDiagram,
    status: 'live',
    lastRun: '6 hours ago'
  },
  {
    id: 'usda-freezer',
    name: 'Scam Freeze Sentinel',
    shortName: 'Scam Freeze',
    path: 'workflows/usda-freeze-sentinel',
    icon: Snowflake,
    color: 'blue',
    description: 'Real-time AI-powered freeze protection. Monitors all USDA transfers via EVM Log Trigger. Checks recipients against GoPlus API (SlowMist + ScamSniffer aggregation), ScamSniffer GitHub blacklist, and Sanction Source. Uses xAI Grok for final freeze decisions. Automatically freezes suspicious addresses via DON-signed reports.',
    trigger: 'EVM Log on Transfer',
    triggerType: 'event',
    apis: ['GoPlus Security API', 'ScamSniffer Database', 'Sanction Source', 'xAI Grok', 'Sepolia EVM'],
    features: ['Real-time transfer monitoring', 'Multi-source security check', 'AI-powered decisions', 'Auto-freeze via DON', 'Non-blocking pause'],
    diagram: USDAFreezerDiagram,
    status: 'live',
    lastRun: 'just now'
  },
  {
    id: 'pause-with-don',
    name: 'Sentinel Guard',
    shortName: 'Sentinel Guard',
    path: 'workflows/pause-with-don',
    icon: PauseCircle,
    color: 'orange',
    description: 'Autonomous security guard triggered by Sentinel Node via HTTP when threats are detected. Safeguards bank reserves and token vault security on-chain, acting before hacks complete. Uses Proof of Reserve validation, xAI threat analysis, and DON-signed execution to pause contracts instantly.',
    trigger: 'HTTP (Sentinel Node)',
    triggerType: 'manual',
    apis: ['Bank Reserve API', 'xAI Grok', 'DON Attestation', 'Sepolia EVM'],
    features: ['Proof of Reserve checks', 'Pre-hack intervention', 'xAI threat analysis', 'DON-signed execution', 'Vault protection'],
    diagram: PauseWithDonDiagram,
    status: 'live',
    lastRun: '1 hour ago'
  }
];

const getTriggerIcon = (type: string) => {
  switch (type) {
    case 'cron': return Clock;
    case 'event': return Zap;
    case 'manual': return null;
    default: return Clock;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'live': return 'bg-emerald-500';
    case 'beta': return 'bg-amber-500';
    case 'dev': return 'bg-blue-500';
    default: return 'bg-neutral-500';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'live': return 'text-emerald-400';
    case 'beta': return 'text-amber-400';
    case 'dev': return 'text-blue-400';
    default: return 'text-neutral-400';
  }
};

export function WorkflowsSection() {
  const [activeWorkflow, setActiveWorkflow] = useState<string>(workflows[0].id);
  const [showDetails, setShowDetails] = useState(true);
  const selected = workflows.find(w => w.id === activeWorkflow)!;
  const SelectedIcon = selected.icon;
  const SelectedDiagram = selected.diagram;
  const TriggerIcon = getTriggerIcon(selected.triggerType);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
          <GitBranch className="w-4 h-4" />
          Chainlink Runtime Environment
        </div>
        <h2 className="text-6xl font-bold text-white mb-3">
          SafeGuard Mechanism
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto">
          Fetch real-world data via Confidential HTTP, and generate DON-signed reports 
          for verified on-chain execution.
        </p>
      </motion.div>

      {/* Workflow Selector - Horizontal Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {workflows.map((workflow) => {
            const Icon = workflow.icon;
            const isActive = activeWorkflow === workflow.id;
            
            return (
              <motion.button
                key={workflow.id}
                onClick={() => setActiveWorkflow(workflow.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200",
                  isActive 
                    ? `bg-${workflow.color}-950/30 border-${workflow.color}-500/50 text-white` 
                    : "bg-neutral-900/40 border-white/5 text-neutral-400 hover:border-white/10 hover:bg-neutral-900/60 hover:text-neutral-200"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4",
                  isActive ? `text-${workflow.color}-400` : "text-neutral-500"
                )} />
                <span className="font-medium text-sm">{workflow.shortName}</span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getStatusColor(workflow.status),
                  isActive && "animate-pulse"
                )} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Content - Full Width Diagram */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeWorkflow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Info Bar */}
          <div className={cn(
            "rounded-t-xl border-x border-t p-4",
            `bg-${selected.color}-950/10 border-${selected.color}-500/20`
          )}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  `bg-${selected.color}-500/20 border border-${selected.color}-500/30`
                )}>
                  <SelectedIcon className={cn("w-5 h-5", `text-${selected.color}-400`)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                    <span className={cn(
                      "text-xs font-medium uppercase",
                      getStatusText(selected.status)
                    )}>
                      {selected.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    {TriggerIcon && (
                      <span className="flex items-center gap-1">
                        <TriggerIcon className="w-3 h-3" />
                        {selected.trigger}
                      </span>
                    )}
                    <span>•</span>
                    <span>{selected.apis.length} APIs</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Last run {selected.lastRun}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 transition-colors"
              >
                {showDetails ? 'Hide' : 'Details'}
                <ChevronDown className={cn("w-3 h-3 transition-transform", showDetails && "rotate-180")} />
              </button>
            </div>

            {/* Expandable Details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-neutral-400 mb-4">
                      {selected.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* APIs */}
                      <div>
                        <div className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          External APIs
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.apis.map((api) => (
                            <span 
                              key={api} 
                              className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-neutral-400"
                            >
                              {api}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Features */}
                      <div>
                        <div className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Key Features
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.features.map((feat) => (
                            <span 
                              key={feat} 
                              className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-neutral-400"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Architecture Diagram - Full Width */}
          <div className={cn(
            "border-x border-b rounded-b-xl bg-neutral-950/50",
            `border-${selected.color}-500/20`
          )}>
            <SelectedDiagram />
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Live on Sepolia
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                CRE TEE Protected
              </span>
            </div>
            <a 
              href="#" 
              className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
            >
              View Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
