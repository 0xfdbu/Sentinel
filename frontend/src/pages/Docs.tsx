import { useState } from 'react'
import { 
  Book, 
  Shield, 
  Lock, 
  Cpu, 
  ChevronRight,
  ExternalLink,
  Terminal,
  Play,
  Zap,
  Github,
  FileCode
} from 'lucide-react'
import { cn } from '../utils/cn'
import { SentinelProcessAnimation } from '../components/SentinelProcessAnimation'

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: Book },
  { id: 'how-it-works', label: 'How It Works', icon: Play },
  { id: 'pausable', label: 'OpenZeppelin Pausable', icon: Shield },
  { id: 'quickstart', label: 'Quick Start', icon: Terminal },
  { id: 'contracts', label: 'Contracts', icon: FileCode },
]

const contracts = [
  { name: 'SentinelRegistry', address: '0x774B96F8d892A1e4482B52b3d255Fa269136A0E9', desc: 'Registration & staking' },
  { name: 'EmergencyGuardian', address: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1', desc: 'Confidential pause executor' },
  { name: 'PausableVulnerableVault', address: '0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C', desc: 'Demo vulnerable contract' },
]

const content: Record<string, { title: string; content: React.ReactNode }> = {
  overview: {
    title: 'Sentinel',
    content: (
      <div className="space-y-8">
        <p className="text-lg text-neutral-400">
          Autonomous AI security oracle that monitors smart contracts and executes 
          <span className="text-neutral-200 font-medium"> instant emergency pauses</span> before 
          attackers can exploit vulnerabilities. You stay in control - Sentinel can only pause, 
          never withdraw or transfer your funds.
        </p>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '<500ms', label: 'Detection' },
            { value: '~2s', label: 'Pause Time' },
            { value: 'xAI', label: 'AI Analysis' },
            { value: '24/7', label: 'Monitoring' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-neutral-900/50 border border-white/10">
              <div className="text-2xl font-bold text-neutral-200">{stat.value}</div>
              <div className="text-xs text-neutral-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Core Features */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Real-time Monitoring', icon: Cpu, desc: 'Every transaction analyzed for exploit patterns via Sentinel Node' },
            { title: 'AI Security Scan', icon: Shield, desc: 'xAI Grok LLM analysis via Chainlink CRE with Confidential HTTP' },
            { title: 'Non-Custodial', icon: Lock, desc: 'Sentinel can only pause. You control unpausing and fund recovery.' },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
              <f.icon className="w-6 h-6 text-neutral-200 mb-3" />
              <h3 className="font-medium text-slate-50">{f.title}</h3>
              <p className="text-sm text-neutral-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* How It Protects */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="text-emerald-400 font-medium mb-2">Pause-Only Protection</h3>
          <p className="text-sm text-neutral-400">
            Unlike other security solutions that require granting fund transfer permissions, 
            Sentinel only needs PAUSER_ROLE from OpenZeppelin's Pausable contract. This means 
            your funds stay in your contract, and only YOU can unpause and withdraw them.
          </p>
        </div>
      </div>
    )
  },
  'how-it-works': {
    title: 'How It Works',
    content: (
      <div className="space-y-8">
        <SentinelProcessAnimation />

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-neutral-200 mb-3">Fraud Detection</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between text-neutral-300">
                <span>Flash Loan Pattern</span>
                <span className="text-neutral-400">+40 pts</span>
              </li>
              <li className="flex justify-between text-neutral-300">
                <span>Large Transfer (&gt;500 ETH)</span>
                <span className="text-red-400">+50 pts</span>
              </li>
              <li className="flex justify-between text-neutral-300">
                <span>Mass Transfer (10+)</span>
                <span className="text-red-400">+50 pts</span>
              </li>
              <li className="flex justify-between text-neutral-300">
                <span>Reentrancy Pattern</span>
                <span className="text-neutral-400">+30 pts</span>
              </li>
              <li className="flex justify-between border-t border-white/10 pt-2 mt-2">
                <span className="font-medium text-slate-50">Auto-Pause Threshold</span>
                <span className="text-red-400 font-bold">≥85 pts</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-emerald-400 mb-3">Pause Protection Flow</h3>
            <ol className="space-y-2 text-sm text-neutral-300">
              <li className="flex gap-2">
                <span className="text-emerald-400">1.</span>
                Sentinel Node monitors mempool
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">2.</span>
                Threat detected (score ≥85)
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">3.</span>
                Sentinel calls pause() on contract
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">4.</span>
                Contract frozen, funds secured
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">5.</span>
                You fix and unpause when ready
              </li>
            </ol>
          </div>
        </div>
      </div>
    )
  },
  pausable: {
    title: 'OpenZeppelin Pausable Requirement',
    content: (
      <div className="space-y-6">
        <p className="text-neutral-400">
          Your contract must implement OpenZeppelin's Pausable pattern. This is the industry 
          standard used by Uniswap V2, Aave, Compound, and thousands of protocols.
        </p>

        <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
          <h3 className="font-medium text-slate-50 mb-4">Required Implementation</h3>
          <pre className="text-sm bg-neutral-950 p-4 rounded-lg overflow-x-auto text-neutral-300">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyProtocol is Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Protected functions
    function withdraw() external whenNotPaused {
        // Only works when not paused
    }
}`}
          </pre>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-emerald-400 mb-3">Sentinel CAN</h3>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Call pause() function
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Freeze contract during attacks
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Protect funds via whenNotPaused
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-red-400 mb-3">Sentinel CANNOT</h3>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Withdraw or transfer funds
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Call unpause() - only YOU can
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Modify any contract state
              </li>
            </ul>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-neutral-300/20 bg-neutral-300/5">
          <h3 className="font-medium text-neutral-200 mb-2">Trusted By Industry Leaders</h3>
          <p className="text-sm text-neutral-400">
            OpenZeppelin's Pausable is used by Uniswap V2 ($100B+ volume), Aave ($10B+ TVL), 
            Compound, and thousands of other protocols. It's the gold standard for emergency 
            pause functionality in DeFi.
          </p>
        </div>
      </div>
    )
  },
  quickstart: {
    title: 'Quick Start',
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-slate-50 mb-3">1. Install & Configure</h3>
            <pre className="text-sm bg-neutral-950 p-4 rounded-lg overflow-x-auto">
              <code className="text-neutral-400">npm install
npm run setup</code>
            </pre>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-slate-50 mb-3">2. Start Sentinel Node</h3>
            <pre className="text-sm bg-neutral-950 p-4 rounded-lg overflow-x-auto">
              <code className="text-neutral-400">cd sentinel/monitor
npm run start</code>
            </pre>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/50 border border-white/10">
            <h3 className="font-medium text-slate-50 mb-3">3. Run Attack Simulation</h3>
            <pre className="text-sm bg-neutral-950 p-4 rounded-lg overflow-x-auto">
              <code className="text-neutral-400">cd sentinel/simulation
npm run simulate:reentrancy</code>
            </pre>
          </div>
        </div>

        <div className="flex gap-3">
          <a 
            href="https://github.com/your-repo/sentinel" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900/50 border border-white/10 text-neutral-300 hover:text-slate-50 transition-colors"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
          <a 
            href="/protect"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-300/10 border border-neutral-300/20 text-neutral-200 hover:bg-neutral-300/20 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Try Demo
          </a>
        </div>
      </div>
    )
  },
  contracts: {
    title: 'Deployed Contracts (Sepolia)',
    content: (
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden">
          {contracts.map((c) => (
            <div key={c.name} className="p-4 flex items-center justify-between border-b border-white/10 last:border-0 hover:bg-white/5">
              <div>
                <h4 className="font-medium text-slate-50">{c.name}</h4>
                <p className="text-xs text-neutral-500">{c.desc}</p>
              </div>
              <a 
                href={`https://sepolia.etherscan.io/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-mono text-neutral-200 bg-neutral-300/10 px-3 py-1.5 rounded-lg hover:bg-neutral-300/20 transition-colors"
              >
                {c.address.slice(0, 6)}...{c.address.slice(-4)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <h3 className="font-medium text-emerald-400 mb-2">Live Demo</h3>
          <p className="text-sm text-neutral-400 mb-3">
            The PausableVulnerableVault has an intentional reentrancy vulnerability. 
            Register it in Sentinel, then run the attack simulation to see confidential pause in action.
          </p>
          <a 
            href="/protect"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
          >
            Go to Protection Page →
          </a>
        </div>
      </div>
    )
  }
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState('overview')
  const activeContent = content[activeSection]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-56 flex-shrink-0">
          <div className="sticky top-24">
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                      activeSection === item.id
                        ? 'bg-neutral-300/10 text-neutral-200 border border-neutral-300/20'
                        : 'text-neutral-400 hover:text-slate-50 hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {activeSection === item.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-8">
            <h1 className="text-2xl font-bold text-slate-50 mb-6">{activeContent.title}</h1>
            {activeContent.content}
          </div>
        </main>
      </div>
    </div>
  )
}
