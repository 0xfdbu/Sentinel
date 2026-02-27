export function ArchitectureStatic() {
  return (
    <div className="w-full">
      <div className="relative bg-neutral-950/50 rounded-xl border border-white/10 p-4 md:p-6 overflow-x-auto">
        <svg viewBox="0 0 1100 650" className="w-full min-w-[900px] h-auto">
          <defs>
            <marker id="arr-solid" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
            <marker id="arr-threat" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
            <marker id="arr-decision" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
            <marker id="arr-register" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
            
            <linearGradient id="grad-tee" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="grad-llm" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b0764" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="grad-ace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x="550" y="25" textAnchor="middle" fill="#e5e5e5" fontSize="14" fontWeight="bold" fontFamily="ui-monospace, monospace">
            Sentinel: Detection → Analysis → Decision → Action
          </text>

          {/* ==================== REGISTRATION FLOW ==================== */}
          <text x="550" y="50" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">REGISTRATION (One-time per contract)</text>
          
          {/* Registration box */}
          <rect x="10" y="60" width="1070" height="50" rx="3" fill="#0a0a0a" stroke="#1e40af" strokeWidth="1" strokeDasharray="4,2" />
          
          {/* Step 1: Register on Contract */}
          <rect x="20" y="70" width="175" height="32" rx="2" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
          <text x="107" y="83" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">SentinelRegistry</text>
          <text x="107" y="96" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="ui-monospace, monospace">registerContract() + 0.01 ETH</text>
          
          <line x1="195" y1="86" x2="210" y2="86" stroke="#3b82f6" strokeWidth="1" markerEnd="url(#arr-register)" />
          
          {/* Step 2: API Scan Trigger */}
          <rect x="210" y="70" width="155" height="32" rx="2" fill="#1e3a5f" stroke="#7c3aed" strokeWidth="1" />
          <text x="287" y="83" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">POST /api/scan</text>
          <text x="287" y="96" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="ui-monospace, monospace">Triggers CRE workflow</text>
          
          <line x1="365" y1="86" x2="380" y2="86" stroke="#3b82f6" strokeWidth="1" markerEnd="url(#arr-register)" />
          
          {/* Step 3: Initial CRE Scan */}
          <rect x="380" y="70" width="165" height="32" rx="2" fill="#1e3a5f" stroke="#7c3aed" strokeWidth="1" />
          <text x="462" y="83" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">CRE Initial Scan</text>
          <text x="462" y="96" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="ui-monospace, monospace">LLM vulnerability check</text>
          
          <line x1="545" y1="86" x2="560" y2="86" stroke="#3b82f6" strokeWidth="1" markerEnd="url(#arr-register)" />
          
          {/* Step 4: Grant Role */}
          <rect x="560" y="70" width="165" height="32" rx="2" fill="#052e16" stroke="#22c55e" strokeWidth="1" />
          <text x="642" y="83" textAnchor="middle" fill="#86efac" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Grant PAUSER_ROLE</text>
          <text x="642" y="96" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="ui-monospace, monospace">Owner → SentinelGuardian</text>
          
          <line x1="725" y1="86" x2="740" y2="86" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr-solid)" />
          
          {/* Step 5: Pre-fetch */}
          <rect x="740" y="70" width="145" height="32" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="812" y="83" textAnchor="middle" fill="#d4d4d4" fontSize="8" fontFamily="ui-monospace, monospace">Pre-fetch Source</text>
          <text x="812" y="96" textAnchor="middle" fill="#a3a3a3" fontSize="7" fontFamily="ui-monospace, monospace">Etherscan API</text>
          
          <line x1="885" y1="86" x2="900" y2="86" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-decision)" />
          
          {/* Step 6: Active */}
          <rect x="900" y="70" width="170" height="32" rx="2" fill="#14532d" stroke="#16a34a" strokeWidth="1.5" />
          <text x="985" y="88" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">✓ ACTIVE (Monitoring)</text>

          {/* ==================== MAIN FLOW ==================== */}
          <text x="80" y="140" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">BLOCKCHAIN</text>
          
          {/* Ethereum */}
          <rect x="10" y="150" width="140" height="55" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
          <text x="80" y="170" textAnchor="middle" fill="#d4d4d4" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Ethereum</text>
          <text x="80" y="185" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Sepolia Testnet</text>
          <text x="80" y="197" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Block 6,284,291</text>

          {/* Arrow to Sentinel */}
          <line x1="150" y1="177" x2="190" y2="177" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arr-solid)" />
          <text x="170" y="170" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">TX</text>

          {/* Sentinel Node */}
          <text x="335" y="140" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">SENTINEL NODE</text>
          
          <rect x="190" y="150" width="290" height="170" rx="3" fill="#0a0a0a" stroke="#404040" strokeWidth="1" strokeDasharray="4,2" />
          <text x="335" y="167" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Sentinel Node</text>

          {/* Block Monitor */}
          <rect x="205" y="180" width="115" height="40" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="262" y="197" textAnchor="middle" fill="#d4d4d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Block Monitor</text>
          <text x="262" y="212" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Polls every 2s</text>

          {/* Threat Detector */}
          <rect x="350" y="180" width="115" height="40" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="407" y="197" textAnchor="middle" fill="#d4d4d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Threat Detector</text>
          <text x="407" y="212" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Heuristics</text>

          {/* ACE */}
          <rect x="205" y="235" width="260" height="75" rx="3" fill="url(#grad-ace)" stroke="#9a3412" strokeWidth="1.5" />
          <text x="335" y="255" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">🛡️ ACE Policy Engine</text>
          <text x="335" y="275" textAnchor="middle" fill="#fdba74" fontSize="8" fontFamily="ui-monospace, monospace">Blacklist • Volume • Function Sigs</text>
          <text x="335" y="295" textAnchor="middle" fill="#fdba74" fontSize="8" fontFamily="ui-monospace, monospace">Risk Score: 0-100</text>

          {/* Arrow: Sentinel → CRE */}
          <line x1="480" y1="210" x2="540" y2="210" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arr-threat)" />
          <rect x="495" y="197" width="35" height="14" rx="2" fill="#ef4444" />
          <text x="512" y="206" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="ui-monospace, monospace">THREAT</text>

          {/* Chainlink CRE */}
          <text x="645" y="140" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">ANALYSIS (TEE)</text>
          
          <rect x="540" y="150" width="210" height="170" rx="3" fill="#0a0a0a" stroke="#1e40af" strokeWidth="1.5" />
          <text x="645" y="170" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Chainlink CRE</text>

          {/* TEE Box */}
          <rect x="555" y="185" width="180" height="125" rx="2" fill="url(#grad-tee)" stroke="#1e3a5f" strokeWidth="1" />
          <text x="645" y="205" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">🔒 TEE Secure Enclave</text>

          {/* Confidential HTTP */}
          <rect x="570" y="220" width="150" height="30" rx="2" fill="#0f172a" stroke="#1e40af" strokeWidth="1" />
          <text x="645" y="233" textAnchor="middle" fill="#93c5fd" fontSize="8" fontFamily="ui-monospace, monospace">Confidential HTTP</text>
          <text x="645" y="245" textAnchor="middle" fill="#60a5fa" fontSize="6" fontFamily="ui-monospace, monospace">API keys protected</text>

          {/* xAI LLM */}
          <rect x="570" y="260" width="150" height="42" rx="2" fill="url(#grad-llm)" stroke="#7c3aed" strokeWidth="2" />
          <text x="645" y="280" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">🧠 xAI Grok LLM</text>
          <text x="645" y="295" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">Security Analysis</text>

          {/* Arrow: CRE → Decision */}
          <line x1="750" y1="235" x2="790" y2="235" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-decision)" />

          {/* Decision Engine */}
          <text x="875" y="140" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">DECISION</text>
          
          <rect x="790" y="150" width="170" height="120" rx="3" fill="#0a0a0a" stroke="#16a34a" strokeWidth="2" />
          <text x="875" y="170" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Decision Engine</text>
          <text x="875" y="187" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">LLM + ACE Scoring</text>

          {/* Decision Logic */}
          <rect x="805" y="200" width="140" height="60" rx="2" fill="#052e16" stroke="#166534" strokeWidth="1" />
          <text x="875" y="217" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="ui-monospace, monospace">if (LLM.risk == CRITICAL)</text>
          <text x="875" y="233" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="ui-monospace, monospace">   → PAUSE</text>
          <text x="875" y="249" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="ui-monospace, monospace">if (ACE.score ≥ 80) → PAUSE</text>

          {/* Arrow: Decision → Guardian */}
          <line x1="875" y1="270" x2="875" y2="340" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-decision)" />
          <rect x="855" y="290" width="42" height="14" rx="2" fill="#22c55e" />
          <text x="876" y="300" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="ui-monospace, monospace">EXEC</text>

          {/* ==================== ON-CHAIN CONTRACTS ==================== */}
          <text x="550" y="355" textAnchor="middle" fill="#525252" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">━ ON-CHAIN CONTRACTS ━</text>

          {/* SentinelRegistry */}
          <rect x="40" y="375" width="150" height="60" rx="3" fill="#0a0a0a" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="115" y="393" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">SentinelRegistry</text>
          <text x="115" y="410" textAnchor="middle" fill="#93c5fd" fontSize="8" fontFamily="ui-monospace, monospace">registerContract()</text>
          <text x="115" y="425" textAnchor="middle" fill="#3b82f6" fontSize="7" fontFamily="ui-monospace, monospace">0.01 ETH stake</text>

          {/* Arrow: Registry → Guardian (setup) */}
          <line x1="190" y1="405" x2="330" y2="405" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-register)" />

          {/* SentinelGuardian */}
          <rect x="330" y="375" width="160" height="60" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
          <text x="410" y="393" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">SentinelGuardian</text>
          <text x="410" y="410" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">emergencyPause()</text>
          <text x="410" y="425" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Only Sentinel Node</text>

          {/* Arrow: Guardian → Protected */}
          <line x1="490" y1="405" x2="570" y2="405" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arr-solid)" />
          <text x="530" y="400" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">pause()</text>

          {/* Protected Contract */}
          <rect x="570" y="375" width="160" height="60" rx="3" fill="#0a0a0a" stroke="#16a34a" strokeWidth="1.5" />
          <text x="650" y="393" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">ProtectedContract</text>
          <text x="650" y="410" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="ui-monospace, monospace">OpenZeppelin Pausable</text>
          <text x="650" y="425" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">✓ Funds Secured</text>

          {/* Arrow: Owner grants role */}
          <path d="M 650 375 L 650 360 L 410 360 L 410 375" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-decision)" />
          <text x="530" y="357" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">Owner grants PAUSER_ROLE</text>

          {/* ==================== SIDE PANELS ==================== */}
          {/* External Services */}
          <rect x="750" y="360" width="160" height="95" rx="3" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
          <text x="830" y="393" textAnchor="middle" fill="#e5e5e5" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">External Services</text>
          <line x1="765" y1="403" x2="895" y2="403" stroke="#262626" strokeWidth="1" />
          <text x="770" y="423" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">• Etherscan API</text>
          <text x="770" y="440" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">• xAI Grok API</text>
          <text x="770" y="457" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Confidential HTTP only</text>

          {/* Response Time */}
          <rect x="930" y="375" width="150" height="85" rx="3" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
          <text x="1005" y="393" textAnchor="middle" fill="#e5e5e5" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Response Time</text>
          <line x1="945" y1="403" x2="1065" y2="403" stroke="#262626" strokeWidth="1" />
          <text x="950" y="423" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Detection: ~2s</text>
          <text x="950" y="440" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">LLM Analysis: ~3s</text>
          <text x="950" y="457" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Total: ~5-6s</text>

          {/* ==================== HOW IT WORKS (COMPACT) ==================== */}
          <rect x="10" y="500" width="700" height="125" rx="3" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
          <text x="360" y="525" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">How It Works</text>
          <line x1="25" y1="538" x2="695" y2="538" stroke="#262626" strokeWidth="1" />

          <text x="25" y="560" fill="#3b82f6" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">REGISTRATION:</text>
          <text x="25" y="580" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Owner calls SentinelRegistry.registerContract() with 0.01 ETH stake</text>
          <text x="25" y="598" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">POST /api/scan triggers CRE initial scan → Grant PAUSER_ROLE → Active</text>

          <text x="380" y="560" fill="#22c55e" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">RUNTIME:</text>
          <text x="380" y="580" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Monitor → ACE checks → CRE (TEE + LLM) → Decision → auto-pause</text>

          {/* Legend key */}
          <text x="25" y="620" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">
            TEE: Trusted Execution Environment | ACE: Autonomous Compliance Engine | LLM: xAI Grok
          </text>

          {/* ==================== LEGEND BOX (RIGHT SIDE) ==================== */}
          <rect x="720" y="500" width="380" height="125" rx="3" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
          <text x="900" y="525" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">Component Legend</text>
          <line x1="735" y1="538" x2="1065" y2="538" stroke="#262626" strokeWidth="1" />

          {/* Legend items - Column 1 */}
          <rect x="745" y="555" width="10" height="10" rx="2" fill="url(#grad-tee)" stroke="#1e40af" strokeWidth="1" />
          <text x="762" y="563" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">TEE: Trusted Execution Environment</text>

          <rect x="745" y="575" width="10" height="10" rx="2" fill="url(#grad-llm)" stroke="#7c3aed" strokeWidth="1" />
          <text x="762" y="583" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">LLM: Large Language Model (xAI Grok)</text>

          <rect x="745" y="595" width="10" height="10" rx="2" fill="url(#grad-ace)" stroke="#9a3412" strokeWidth="1" />
          <text x="762" y="603" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">ACE: Autonomous Compliance Engine</text>

          {/* Legend items - Column 2 */}
          <rect x="990" y="555" width="10" height="10" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="1007" y="563" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Off-chain Service</text>

          <rect x="990" y="575" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#525252" strokeWidth="1" />
          <text x="1007" y="583" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">On-chain Contract</text>
        </svg>
      </div>
    </div>
  );
}
