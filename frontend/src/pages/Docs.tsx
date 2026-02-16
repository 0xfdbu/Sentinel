import { useState } from 'react'
import { 
  Book, 
  Code, 
  Shield, 
  Lock, 
  Cpu, 
  ChevronRight,
  ExternalLink,
  Terminal,
  FileJson,
  Workflow
} from 'lucide-react'
import { cn } from '../utils/cn'

const sidebarItems = [
  {
    section: 'Getting Started',
    items: [
      { id: 'overview', label: 'Overview', icon: Book },
      { id: 'architecture', label: 'Architecture', icon: Workflow },
      { id: 'quickstart', label: 'Quick Start', icon: Terminal },
    ]
  },
  {
    section: 'CRE Integration',
    items: [
      { id: 'confidential-http', label: 'Confidential HTTP', icon: Lock },
      { id: 'llm-analysis', label: 'LLM Analysis', icon: Cpu },
      { id: 'confidential-compute', label: 'Confidential Compute', icon: Shield },
    ]
  },
  {
    section: 'Contracts',
    items: [
      { id: 'registry', label: 'SentinelRegistry', icon: FileJson },
      { id: 'guardian', label: 'EmergencyGuardian', icon: Shield },
      { id: 'audit-logger', label: 'AuditLogger', icon: Book },
    ]
  },
  {
    section: 'API Reference',
    items: [
      { id: 'workflow-api', label: 'Workflow API', icon: Code },
      { id: 'webhooks', label: 'Webhooks', icon: ExternalLink },
    ]
  }
]

const content: Record<string, { title: string; content: React.ReactNode }> = {
  overview: {
    title: 'Overview',
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Sentinel is an autonomous AI security oracle that continuously monitors smart contracts 
          for vulnerabilities and executes emergency responses before attackers can exploit them.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: 'Continuous Monitoring',
              description: '24/7 automated scanning of registered contracts using AI-powered analysis'
            },
            {
              title: 'Private Response',
              description: 'Emergency pauses executed via Confidential Compute, hidden from attackers'
            },
            {
              title: 'Transparent Audit',
              description: 'All scans logged on-chain with hashed vulnerability details'
            }
          ].map(feature => (
            <div key={feature.title} className="glass rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-sentinel-500/10 rounded-xl p-6 border border-sentinel-500/20">
          <h3 className="font-semibold text-sentinel-400 mb-3">Chainlink CRE Integration</h3>
          <p className="text-muted-foreground">
            Sentinel leverages all three pillars of Chainlink CRE: Confidential HTTP for 
            secure API calls, LLM for AI analysis, and Confidential Compute for private 
            on-chain responses. This makes it the first autonomous security layer with 
            fully private emergency capabilities.
          </p>
        </div>
      </div>
    )
  },
  architecture: {
    title: 'Architecture',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Sentinel consists of four main components working together to provide 
          end-to-end autonomous security.
        </p>

        <div className="space-y-4">
          {[
            {
              title: '1. CRE Workflow (sentinel-workflow.ts)',
              description: 'TypeScript workflow running on Chainlink CRE that orchestrates the entire security process',
              code: `sentinelWorkflow
  .step('fetch_source', { /* Confidential HTTP */ })
  .step('ai_analysis', { /* Gemini LLM */ })
  .step('confidential_pause', { /* TEE Compute */ })`
            },
            {
              title: '2. SentinelRegistry.sol',
              description: 'Smart contract registry where protocols opt-in to protection by staking ETH',
              code: `function register(address contractAddr) external payable {
    require(msg.value >= MIN_STAKE);
    registrations[contractAddr] = Registration({
        isActive: true,
        stakedAmount: msg.value,
        owner: msg.sender
    });
}`
            },
            {
              title: '3. EmergencyGuardian.sol',
              description: 'Executor contract with authority to pause vulnerable contracts via Confidential Compute',
              code: `function emergencyPause(address target, bytes32 vulnHash) 
    external 
    onlySentinel 
{
    require(registry.isRegistered(target));
    IPausable(target).pause();
    pauses[target] = PauseRecord({
        vulnerabilityHash: vulnHash,
        expiresAt: block.timestamp + 24 hours
    });
}`
            },
            {
              title: '4. AuditLogger.sol',
              description: 'Immutable log of all scan results for transparency without revealing vulnerability details',
              code: `function logScan(address target, bytes32 vulnHash, uint8 severity) 
    external 
    onlyScanner 
{
    scans.push(ScanRecord({
        targetContract: target,
        vulnerabilityHash: vulnHash,
        severity: Severity(severity),
        timestamp: block.timestamp
    }));
}`
            }
          ].map(component => (
            <div key={component.title} className="glass rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h3 className="font-semibold text-white">{component.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
              </div>
              <pre className="p-5 text-sm overflow-x-auto">
                <code className="text-muted-foreground">{component.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    )
  },
  quickstart: {
    title: 'Quick Start',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Get started with Sentinel in three simple steps.
        </p>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sentinel-500/20 text-sentinel-400 font-semibold">
                1
              </span>
              <h3 className="font-semibold text-white">Install CRE CLI</h3>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code className="text-muted-foreground">
                npm install -g @chainlink/cre-cli
              </code>
            </pre>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sentinel-500/20 text-sentinel-400 font-semibold">
                2
              </span>
              <h3 className="font-semibold text-white">Configure Secrets</h3>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code className="text-muted-foreground">
                {`cre secrets add etherscanApiKey <your_key>
cre secrets add geminiApiKey <your_key>
cre secrets add guardianPrivateKey <your_key>`}
              </code>
            </pre>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sentinel-500/20 text-sentinel-400 font-semibold">
                3
              </span>
              <h3 className="font-semibold text-white">Run Simulation</h3>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code className="text-muted-foreground">
                {`cre workflow simulate sentinel-workflow.ts \\
  --input '{"contractAddress": "0x...", "chainId": 11155111}'`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    )
  },
  'confidential-http': {
    title: 'Confidential HTTP',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Confidential HTTP ensures API keys are never exposed in logs, environment variables, 
          or the public mempool. This is critical for security as leaked API keys could allow 
          attackers to manipulate scan results.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-white">How It Works</h3>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`.step('fetch_source', {
  confidentialHttp: {
    url: 'https://api.etherscan.io/v2/api',
    query: {
      // API key is injected from secrets, never visible in code
      apikey: '{{secrets.etherscanApiKey}}',
      address: '{{input.contractAddress}}',
      module: 'contract',
      action: 'getsourcecode'
    },
    // Request and response are encrypted end-to-end
    allowedHosts: ['api.etherscan.io'],
    tls: { verify: true }
  }
})`}
            </code>
          </pre>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5">
            <h4 className="font-semibold text-white mb-2">Privacy Benefits</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• API keys not in git history</li>
              <li>• Keys not in container images</li>
              <li>• Keys not in workflow logs</li>
              <li>• Encrypted in transit and at rest</li>
            </ul>
          </div>
          <div className="glass rounded-xl p-5">
            <h4 className="font-semibold text-white mb-2">Security Properties</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• TLS 1.3 with certificate pinning</li>
              <li>• Host allowlist enforcement</li>
              <li>• Request signing and verification</li>
              <li>• Automatic secret rotation</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  'llm-analysis': {
    title: 'LLM Analysis',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Sentinel uses Google's Gemini 1.5 Pro for vulnerability detection. The LLM is 
          prompted with specific security patterns and outputs structured JSON for 
          programmatic processing.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-white">AI Security Analysis Step</h3>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`.step('ai_security_analysis', {
  llm: {
    provider: 'google',
    model: 'gemini-1.5-pro',
    apiKey: '{{secrets.geminiApiKey}}',
    prompt: \`Analyze the following Solidity code for:
1. Reentrancy attacks
2. Integer overflow/underflow  
3. Unchecked external calls
4. Access control issues

Output as JSON:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|SAFE",
  "category": "Reentrancy|Overflow|...",
  "vector": "description",
  "lines": [1, 2, 3],
  "confidence": 0.95
}\`,
    temperature: 0.1, // Deterministic for security
    maxTokens: 2048
  }
})`}
            </code>
          </pre>
        </div>

        <div className="bg-yellow-500/10 rounded-xl p-5 border border-yellow-500/20">
          <h4 className="font-semibold text-yellow-400 mb-2">Why Low Temperature?</h4>
          <p className="text-sm text-muted-foreground">
            Security analysis requires deterministic outputs. A temperature of 0.1 ensures 
            consistent vulnerability detection across multiple scans of the same contract.
          </p>
        </div>
      </div>
    )
  },
  'confidential-compute': {
    title: 'Confidential Compute',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Confidential Compute uses Trusted Execution Environments (TEEs) to execute 
          transactions without revealing details to the public mempool. This prevents 
          attackers from seeing and front-running emergency pauses.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-white">Private Emergency Response</h3>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`.step('confidential_pause', {
  confidentialCompute: {
    condition: '{{evaluate_risk.action}} === "PAUSE"',
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.guardianContractAddress}}',
      functionAbi: 'function emergencyPause(address,bytes32)',
      args: [
        '{{input.contractAddress}}',
        '0x{{evaluate_risk.vulnHash}}'
      ],
      // Hides transaction from mempool until execution
      privacy: 'full',
      gasLimit: 500000
    }
  }
})`}
            </code>
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-white">Privacy Levels</h3>
          <div className="grid gap-4">
            {[
              {
                level: 'none',
                desc: 'Standard transaction, fully visible in mempool',
                use: 'Non-sensitive operations'
              },
              {
                level: 'partial',
                desc: 'Calldata encrypted, target address visible',
                use: 'When target must be known'
              },
              {
                level: 'full',
                desc: 'Complete transaction privacy until inclusion',
                use: 'Emergency pauses (Sentinel default)'
              }
            ].map(p => (
              <div key={p.level} className="glass rounded-lg p-4 flex items-center gap-4">
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-mono uppercase',
                  p.level === 'full' ? 'bg-green-500/20 text-green-400' :
                  p.level === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                )}>
                  {p.level}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-white">{p.desc}</p>
                  <p className="text-xs text-muted-foreground">Use case: {p.use}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  registry: {
    title: 'SentinelRegistry',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          The SentinelRegistry is the entry point for protocols wanting protection. 
          Contracts register by staking ETH, which can be withdrawn when deregistering.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-white">Contract Interface</h3>
            <span className="text-xs text-muted-foreground font-mono">SentinelRegistry.sol</span>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SentinelRegistry {
    struct Registration {
        bool isActive;
        uint256 stakedAmount;
        uint256 registeredAt;
        address owner;
        string metadata;
    }
    
    uint256 public constant MIN_STAKE = 0.01 ether;
    
    mapping(address => Registration) public registrations;
    
    function register(address contractAddr, string calldata metadata) 
        external 
        payable 
    {
        require(msg.value >= MIN_STAKE, "Min stake 0.01 ETH");
        require(!registrations[contractAddr].isActive, "Already registered");
        // ...
    }
    
    function deregister(address contractAddr) external;
    function isRegistered(address contractAddr) external view returns (bool);
}`}
            </code>
          </pre>
        </div>
      </div>
    )
  },
  guardian: {
    title: 'EmergencyGuardian',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          The EmergencyGuardian has authority to pause registered contracts when 
          vulnerabilities are detected. Only authorized Sentinels can trigger pauses.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-white">Key Functions</h3>
            <span className="text-xs text-muted-foreground font-mono">EmergencyGuardian.sol</span>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`// Execute emergency pause (only Sentinels)
function emergencyPause(
    address target, 
    bytes32 vulnerabilityHash
) external onlySentinel {
    require(registry.isRegistered(target), "Not registered");
    require(!pauses[target].isActive, "Already paused");
    
    IPausable(target).pause();
    
    pauses[target] = PauseRecord({
        pausedContract: target,
        vulnerabilityHash: vulnerabilityHash,
        pausedAt: block.timestamp,
        expiresAt: block.timestamp + 24 hours,
        isActive: true,
        pausedBy: msg.sender
    });
}

// Lift pause (contract owner or after expiry)
function liftPause(address target) external {
    PauseRecord storage record = pauses[target];
    require(record.isActive, "Not paused");
    
    bool isOwner = registry.registrations(target).owner == msg.sender;
    bool isExpired = block.timestamp > record.expiresAt;
    require(isOwner || isExpired || msg.sender == owner(), "Unauthorized");
    
    IPausable(target).unpause();
    record.isActive = false;
}`}
            </code>
          </pre>
        </div>
      </div>
    )
  },
  'audit-logger': {
    title: 'AuditLogger',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          The AuditLogger maintains an immutable record of all scans for transparency. 
          Vulnerability details are hashed to maintain privacy while still providing 
          proof of the scan.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-white">Scan Record Structure</h3>
            <span className="text-xs text-muted-foreground font-mono">AuditLogger.sol</span>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`enum Severity { LOW, MEDIUM, HIGH, CRITICAL }

struct ScanRecord {
    address targetContract;
    bytes32 vulnerabilityHash; // SHA256 of details (private)
    Severity severity;
    uint256 timestamp;
    address scanner;
    uint256 blockNumber;
    string metadata;
}

ScanRecord[] public scans;

function logScan(
    address target,
    bytes32 vulnHash,
    uint8 severity,
    string calldata metadata
) external onlyScanner returns (uint256 scanId) {
    scanId = scans.length;
    scans.push(ScanRecord({
        targetContract: target,
        vulnerabilityHash: vulnHash,
        severity: Severity(severity),
        timestamp: block.timestamp,
        scanner: msg.sender,
        blockNumber: block.number,
        metadata: metadata
    }));
    
    emit ScanLogged(scanId, target, vulnHash, severity, block.timestamp);
}`}
            </code>
          </pre>
        </div>
      </div>
    )
  },
  'workflow-api': {
    title: 'Workflow API',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          The Sentinel workflow exposes an HTTP endpoint for triggering scans.
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-white">POST /scan</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Request Body</h4>
              <pre className="text-sm overflow-x-auto">
                <code className="text-muted-foreground">
                  {`{
  "contractAddress": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "chainId": 11155111,
  "alertWebhook": "https://your-app.com/webhook"
}`}
                </code>
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Response</h4>
              <pre className="text-sm overflow-x-auto">
                <code className="text-muted-foreground">
                  {`{
  "workflowId": "wf_1234567890",
  "status": "executing",
  "estimatedTime": "5s"
}`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  },
  webhooks: {
    title: 'Webhooks',
    content: (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Sentinel sends webhook notifications when scans complete. These include 
          the action taken but NOT vulnerability details (for security).
        </p>

        <div className="glass rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-white">Webhook Payload</h3>
          </div>
          <pre className="p-5 text-sm overflow-x-auto">
            <code className="text-muted-foreground">
              {`{
  "contract": "0x7a250d5630...",
  "chainId": 11155111,
  "action": "PAUSE", // PAUSE | ALERT | WARN | LOG
  "severity": "CRITICAL",
  "category": "Reentrancy",
  "confidence": 0.94,
  "timestamp": "2026-02-15T23:49:10Z",
  "scanId": "scan_abcdef123456"
  // Note: vulnerability details NOT included
}`}
            </code>
          </pre>
        </div>

        <div className="bg-yellow-500/10 rounded-xl p-5 border border-yellow-500/20">
          <h4 className="font-semibold text-yellow-400 mb-2">Security Note</h4>
          <p className="text-sm text-muted-foreground">
            Vulnerability details are intentionally omitted from webhooks to prevent 
            attackers from learning about exploits. Full details can be retrieved 
            through authenticated channels after verifying ownership.
          </p>
        </div>
      </div>
    )
  }
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState('overview')
  const activeContent = content[activeSection]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            {sidebarItems.map(section => (
              <div key={section.section}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {section.section}
                </h3>
                <ul className="space-y-1">
                  {section.items.map(item => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          activeSection === item.id
                            ? 'bg-sentinel-500/20 text-sentinel-400'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        {activeSection === item.id && (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="glass rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-white mb-6">{activeContent.title}</h1>
            {activeContent.content}
          </div>
        </main>
      </div>
    </div>
  )
}
