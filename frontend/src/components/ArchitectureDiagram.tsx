import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id: number;
  title: string;
  description: string;
  details: string[];
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Blockchain Monitoring',
    description: 'Sentinel Node polls Ethereum every second for new transactions to protected contracts.',
    details: [
      'Network: Ethereum Sepolia (Chain ID: 11155111)',
      'Polling Interval: 1000ms',
      'RPC Provider: Tenderly Gateway',
      'Monitored: DemoVault, SentinelRegistry'
    ]
  },
  {
    id: 2,
    title: 'Threat Detection',
    description: 'Heuristic analysis detects attack patterns, function signatures, and anomalous behavior.',
    details: [
      'Pattern Matching: attack(), withdraw(), upgradeTo()',
      'Value Thresholds: >0.0001 ETH flagged',
      'Known Exploit Signatures',
      'Gas Price Anomaly Detection'
    ]
  },
  {
    id: 3,
    title: 'ACE Policy Evaluation',
    description: 'ACE (Access Control & Compliance Engine) evaluates hard security rules.',
    details: [
      'Blacklist Compliance Check',
      'Max Transaction Value Limits',
      'Daily Volume Thresholds',
      'Risk Score Calculation: 0-100'
    ]
  },
  {
    id: 4,
    title: 'TEE + xAI Analysis',
    description: 'Chainlink CRE runs in Trusted Execution Environment with xAI Grok analysis.',
    details: [
      'TEE: Intel SGX / AMD SEV',
      'Confidential HTTP: API keys never exposed',
      'xAI Model: grok-4-1-fast-reasoning',
      'Source Code Analysis via Etherscan'
    ]
  },
  {
    id: 5,
    title: 'Auto-Pause Execution',
    description: 'SentinelGuardian contract executes emergency pause when threats confirmed.',
    details: [
      'Function: emergencyPause(address, bytes32)',
      'Target: Protected Contract (e.g., DemoVault)',
      'Only PAUSE_ROLE — no fund access',
      'Response Time: <25 seconds total'
    ]
  }
];

export function ArchitectureDiagram() {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="w-full bg-neutral-900 border border-neutral-700">
      {/* Header */}
      <div className="border-b border-neutral-700 p-6">
        <h3 className="text-lg font-bold text-neutral-100 font-mono">
          Sentinel Security Pipeline
        </h3>
        <p className="text-sm text-neutral-500 mt-1 font-mono">
          5-Layer protection architecture with Chainlink CRE
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Step Navigation */}
        <div className="border-r border-neutral-700">
          <div className="p-4 border-b border-neutral-700 bg-neutral-800/50">
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
              Pipeline Steps
            </span>
          </div>
          
          <div className="divide-y divide-neutral-700">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`w-full p-4 text-left transition-colors font-mono text-sm ${
                  activeStep === step.id
                    ? 'bg-neutral-800 border-l-4 border-neutral-400'
                    : 'hover:bg-neutral-800/50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${
                    activeStep === step.id
                      ? 'bg-neutral-600 text-neutral-100'
                      : 'bg-neutral-700 text-neutral-500'
                  }`}>
                    {step.id}
                  </span>
                  <span className={activeStep === step.id ? 'font-semibold text-neutral-200' : 'text-neutral-400'}>
                    {step.title}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Simple Diagram */}
          <div className="p-6 border-t border-neutral-700">
            <div className="text-xs font-mono text-neutral-500 mb-4 uppercase tracking-wider">
              Architecture Overview
            </div>
            <svg viewBox="0 0 300 200" className="w-full">
              {/* Boxes */}
              <rect x="10" y="10" width="80" height="30" fill="none" stroke="#6b7280" strokeWidth="1" />
              <text x="50" y="30" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="monospace">Blockchain</text>
              
              <line x1="90" y1="25" x2="110" y2="25" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr)" />
              
              <rect x="110" y="10" width="80" height="30" fill="none" stroke="#6b7280" strokeWidth="1" />
              <text x="150" y="30" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="monospace">Sentinel Node</text>
              
              <line x1="190" y1="25" x2="210" y2="25" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr)" />
              
              <rect x="210" y="10" width="80" height="30" fill="none" stroke="#6b7280" strokeWidth="1" />
              <text x="250" y="30" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="monospace">Chainlink CRE</text>
              
              <line x1="150" y1="40" x2="150" y2="70" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr)" />
              
              <rect x="110" y="70" width="80" height="30" fill="none" stroke="#6b7280" strokeWidth="1" />
              <text x="150" y="90" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="monospace">Decision</text>
              
              <line x1="150" y1="100" x2="150" y2="130" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr)" />
              
              <rect x="110" y="130" width="80" height="30" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
              <text x="150" y="150" textAnchor="middle" fill="#d4d4d4" fontSize="8" fontWeight="bold" fontFamily="monospace">Guardian</text>
              
              <line x1="110" y1="145" x2="50" y2="145" stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2" markerEnd="url(#arr)" />
              
              <rect x="10" y="130" width="80" height="30" fill="none" stroke="#6b7280" strokeWidth="1" />
              <text x="50" y="150" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="monospace">Vault</text>
              
              <defs>
                <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#6b7280" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right: Step Details */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-neutral-700 text-neutral-200 flex items-center justify-center font-mono text-sm font-bold">
                    {activeStep}
                  </span>
                  <h4 className="text-xl font-bold text-neutral-200 font-mono">
                    {steps[activeStep - 1].title}
                  </h4>
                </div>
                <p className="text-neutral-400 font-mono text-sm leading-relaxed">
                  {steps[activeStep - 1].description}
                </p>
              </div>

              <div className="border-t border-neutral-700 pt-4">
                <h5 className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-3">
                  Technical Details
                </h5>
                <ul className="space-y-2">
                  {steps[activeStep - 1].details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm font-mono text-neutral-400">
                      <span className="text-neutral-600 mt-1">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step Navigation */}
              <div className="flex justify-between mt-8 pt-4 border-t border-neutral-700">
                <button
                  onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                  disabled={activeStep === 1}
                  className="px-4 py-2 text-sm font-mono border border-neutral-600 text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm font-mono text-neutral-500 py-2">
                  Step {activeStep} of {steps.length}
                </span>
                <button
                  onClick={() => setActiveStep(Math.min(5, activeStep + 1))}
                  disabled={activeStep === 5}
                  className="px-4 py-2 text-sm font-mono bg-neutral-700 text-neutral-200 border border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-600 transition-colors"
                >
                  Next →
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-700 p-4 bg-neutral-800/30">
        <div className="flex flex-wrap justify-center gap-6 text-xs font-mono text-neutral-500">
          <span>Chainlink CRE</span>
          <span>•</span>
          <span>Confidential HTTP</span>
          <span>•</span>
          <span>TEE Protected</span>
          <span>•</span>
          <span>xAI Powered</span>
          <span>•</span>
          <span>&lt;25s Response</span>
        </div>
      </div>
    </div>
  );
}
