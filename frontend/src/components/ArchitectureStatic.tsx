export function ArchitectureStatic() {
  return (
    <div className="w-full">
      <div className="relative bg-neutral-950/50 overflow-x-auto">
        <svg viewBox="0 0 1100 1000" className="w-full min-w-[900px] h-auto">
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
            <marker id="arr-ace" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
            </marker>
            <marker id="arr-chainlink" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#375bd2" />
            </marker>
            <marker id="arr-por" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
            </marker>
            <marker id="arr-ccip" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
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
              <stop offset="0%" stopColor="#c2410c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="grad-guardian" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#14532d" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="grad-chainlink" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#172554" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="grad-por" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#164e63" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="grad-ccip" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* ==================== LAYER LABELS ==================== */}
          <text x="15" y="105" textAnchor="start" fill="#22c55e" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 15 105)">
            SECURITY LAYER
          </text>
          <text x="15" y="295" textAnchor="start" fill="#06b6d4" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 15 295)">
            PoR LAYER (USDA)
          </text>
          <text x="15" y="405" textAnchor="start" fill="#8b5cf6" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 15 405)">
            CCIP BRIDGE
          </text>
          <text x="15" y="550" textAnchor="start" fill="#f97316" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 15 550)">
            COMPLIANCE LAYER
          </text>

          {/* ==================== SECURITY LAYER (TOP) ==================== */}
          <rect x="35" y="10" width="1040" height="190" rx="3" fill="#052e16" stroke="#166534" strokeWidth="1" strokeDasharray="4,2" fillOpacity="0.1" />
          
          {/* Blockchain */}
          <rect x="50" y="35" width="130" height="50" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
          <text x="115" y="55" textAnchor="middle" fill="#d4d4d4" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">Ethereum</text>
          <text x="115" y="72" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Sepolia Testnet</text>

          {/* Arrow to Sentinel */}
          <line x1="180" y1="60" x2="205" y2="60" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arr-solid)" />
          <text x="192" y="55" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">TX</text>

          {/* Sentinel Node */}
          <rect x="205" y="25" width="275" height="160" rx="3" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" />
          <text x="342" y="45" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Sentinel Node</text>
          <text x="342" y="60" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">Security Layer (Reactive)</text>

          {/* Block Monitor */}
          <rect x="218" y="75" width="105" height="45" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="270" y="93" textAnchor="middle" fill="#d4d4d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Block Monitor</text>
          <text x="270" y="110" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Polls every 2s</text>

          {/* Threat Detector */}
          <rect x="345" y="75" width="120" height="45" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="405" y="93" textAnchor="middle" fill="#d4d4d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Threat Detector</text>
          <text x="405" y="110" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Heuristics/AI</text>

          {/* Guardian Decision Box */}
          <rect x="218" y="132" width="247" height="50" rx="3" fill="url(#grad-guardian)" stroke="#16a34a" strokeWidth="1.5" />
          <text x="341" y="152" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Guardian Decision Engine</text>
          <text x="341" y="172" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="ui-monospace, monospace">if (hack detected) → PAUSE()</text>

          {/* Arrow to CRE */}
          <line x1="480" y1="87" x2="530" y2="87" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arr-threat)" />
          <rect x="500" y="75" width="20" height="12" rx="2" fill="#ef4444" />
          <text x="510" y="83" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="ui-monospace, monospace">AI</text>

          {/* Chainlink CRE */}
          <rect x="530" y="25" width="190" height="160" rx="3" fill="#0a0a0a" stroke="#1e40af" strokeWidth="1.5" />
          <text x="625" y="45" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Chainlink CRE</text>
          <text x="625" y="60" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">TEE + xAI Analysis</text>

          {/* TEE Box */}
          <rect x="543" y="75" width="164" height="50" rx="2" fill="url(#grad-tee)" stroke="#1e3a5f" strokeWidth="1" />
          <text x="625" y="95" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">TEE Enclave</text>
          <text x="625" y="112" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="ui-monospace, monospace">Confidential HTTP</text>

          {/* xAI */}
          <rect x="543" y="132" width="164" height="45" rx="2" fill="url(#grad-llm)" stroke="#7c3aed" strokeWidth="1.5" />
          <text x="625" y="150" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">xAI Grok LLM</text>
          <text x="625" y="167" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">Security Analysis</text>

          {/* Arrow to Guardian */}
          <line x1="720" y1="105" x2="765" y2="105" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-decision)" />
          <rect x="738" y="93" width="18" height="14" rx="2" fill="#22c55e" />
          <text x="747" y="103" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="ui-monospace, monospace">GO</text>

          {/* SentinelGuardian Contract */}
          <rect x="765" y="35" width="155" height="150" rx="3" fill="#0a0a0a" stroke="#16a34a" strokeWidth="2" />
          <text x="842" y="58" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">SentinelGuardian</text>
          <text x="842" y="76" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">On-Chain Security</text>
          
          <rect x="778" y="90" width="129" height="40" rx="2" fill="#052e16" stroke="#166534" strokeWidth="1" />
          <text x="842" y="108" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="ui-monospace, monospace">emergencyPause()</text>
          <text x="842" y="122" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="ui-monospace, monospace">Only PAUSER_ROLE</text>

          <text x="842" y="155" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">No fund access</text>
          <text x="842" y="170" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Owner keeps control</text>

          {/* Arrow to Vault */}
          <line x1="920" y1="105" x2="945" y2="105" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-decision)" />

          {/* Standard Vault (Guardian-compatible) */}
          <rect x="945" y="35" width="115" height="150" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
          <text x="1002" y="65" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Standard</text>
          <text x="1002" y="82" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Vault</text>
          <text x="1002" y="105" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">OpenZeppelin</text>
          <text x="1002" y="120" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Pausable</text>
          
          <rect x="958" y="135" width="89" height="40" rx="2" fill="#14532d" stroke="#16a34a" strokeWidth="1" />
          <text x="1002" y="158" textAnchor="middle" fill="#4ade80" fontSize="14" fontWeight="bold" fontFamily="ui-monospace, monospace">✓</text>

          {/* ==================== PoR LAYER (MIDDLE) - NEW ==================== */}
          <rect x="35" y="210" width="1040" height="175" rx="3" fill="#164e63" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,2" fillOpacity="0.1" />
          
          <text x="555" y="230" textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">
            PROOF OF RESERVES (PoR) LAYER - Stablecoin Demo
          </text>

          {/* User Deposit */}
          <rect x="50" y="245" width="110" height="60" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
          <text x="105" y="268" textAnchor="middle" fill="#d4d4d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">User Deposit</text>
          <text x="105" y="285" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">0.01 ETH →</text>
          <text x="105" y="298" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">requestMint()</text>

          {/* Arrow to Bank Vault */}
          <line x1="160" y1="275" x2="185" y2="275" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arr-por)" />

          {/* Sentinel Bank Vault */}
          <rect x="185" y="245" width="200" height="125" rx="3" fill="#0a0a0a" stroke="#06b6d4" strokeWidth="2" />
          <text x="285" y="268" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Sentinel Bank Vault</text>
          <text x="285" y="285" textAnchor="middle" fill="#06b6d4" fontSize="8" fontFamily="ui-monospace, monospace">USDA Stablecoin + PoR</text>

          {/* Step 1: Price Feed */}
          <rect x="198" y="300" width="85" height="30" rx="2" fill="url(#grad-chainlink)" stroke="#1e40af" strokeWidth="1" />
          <text x="240" y="318" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="ui-monospace, monospace">Price Feed</text>

          {/* Step 2: ACE Check */}
          <rect x="288" y="300" width="85" height="30" rx="2" fill="url(#grad-ace)" stroke="#c2410c" strokeWidth="1" />
          <text x="330" y="318" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">ACE Check</text>

          {/* Step 3: Pending */}
          <rect x="198" y="335" width="175" height="28" rx="2" fill="#083344" stroke="#06b6d4" strokeWidth="1" />
          <text x="285" y="353" textAnchor="middle" fill="#22d3ee" fontSize="8" fontFamily="ui-monospace, monospace">ETH Locked → PENDING</text>

          {/* Arrow to CRE PoR */}
          <line x1="385" y1="308" x2="420" y2="308" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arr-por)" />

          {/* CRE PoR Verification */}
          <rect x="420" y="255" width="200" height="115" rx="3" fill="#0a0a0a" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="520" y="278" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">CRE PoR Verification</text>
          <text x="520" y="295" textAnchor="middle" fill="#06b6d4" fontSize="8" fontFamily="ui-monospace, monospace">Confidential HTTP</text>

          {/* TEE Confidential HTTP */}
          <rect x="433" y="308" width="174" height="50" rx="2" fill="url(#grad-tee)" stroke="#1e3a5f" strokeWidth="1" />
          <text x="520" y="328" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">🔐 TEE Enclave</text>
          <text x="520" y="345" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="ui-monospace, monospace">API Key Never Exposed</text>


          {/* Arrow from Bank API back */}
          <line x1="595" y1="447" x2="630" y2="400" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-decision)" />
          <text x="615" y="415" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">OK</text>

          {/* Arrow to fulfillPoR */}
          <line x1="620" y1="308" x2="655" y2="308" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arr-por)" />

          {/* fulfillPoR Callback */}
          <rect x="655" y="255" width="130" height="115" rx="3" fill="#0a0a0a" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="720" y="278" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">fulfillPoR()</text>
          <text x="720" y="295" textAnchor="middle" fill="#06b6d4" fontSize="8" fontFamily="ui-monospace, monospace">Callback</text>

          {/* Decision */}
          <rect x="665" y="308" width="50" height="55" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          <text x="690" y="335" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">✓</text>
          <text x="690" y="353" textAnchor="middle" fill="#6ee7b7" fontSize="7" fontFamily="ui-monospace, monospace">MINT</text>

          <rect x="725" y="308" width="50" height="55" rx="2" fill="#450a0a" stroke="#dc2626" strokeWidth="1" />
          <text x="750" y="335" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold" fontFamily="ui-monospace, monospace">✕</text>
          <text x="750" y="353" textAnchor="middle" fill="#fca5a5" fontSize="7" fontFamily="ui-monospace, monospace">REFUND</text>

          {/* Arrow to Result */}
          <line x1="785" y1="308" x2="810" y2="308" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arr-por)" />

          {/* Result */}
          <rect x="810" y="255" width="130" height="115" rx="3" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1.5" />
          <text x="875" y="285" textAnchor="middle" fill="#86efac" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">✓ Mint USDA</text>
          <text x="875" y="305" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="ui-monospace, monospace">User receives</text>
          <text x="875" y="320" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="ui-monospace, monospace">stablecoins</text>
          <text x="875" y="345" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">✕ Refund ETH</text>
          <text x="875" y="360" textAnchor="middle" fill="#fca5a5" fontSize="7" fontFamily="ui-monospace, monospace">Insuff. reserves</text>

          {/* Arrow back to user */}
          <line x1="810" y1="360" x2="160" y2="360" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-solid)" />
          <text x="485" y="353" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Async Result</text>

          {/* ==================== CCIP BRIDGE LAYER (MIDDLE) ==================== */}
          <rect x="35" y="395" width="1040" height="125" rx="3" fill="#4c1d95" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,2" fillOpacity="0.1" />
          
          <text x="555" y="415" textAnchor="middle" fill="#8b5cf6" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">
            CCIP CROSS-CHAIN BRIDGE
          </text>

          {/* Sepolia Chain */}
          <rect x="50" y="425" width="130" height="85" rx="3" fill="#0a0a0a" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="115" y="448" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Sepolia</text>
          <text x="115" y="468" textAnchor="middle" fill="#93c5fd" fontSize="8" fontFamily="ui-monospace, monospace">USDA Token</text>
          <text x="115" y="485" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Chain ID: 11155111</text>
          <text x="115" y="500" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="ui-monospace, monospace">~90 USDA</text>

          {/* Arrow to CCIP Router */}
          <line x1="180" y1="467" x2="220" y2="467" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arr-ccip)" />
          <text x="200" y="460" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="ui-monospace, monospace">burn()</text>

          {/* CCIP Router */}
          <rect x="220" y="435" width="200" height="75" rx="3" fill="#0a0a0a" stroke="#8b5cf6" strokeWidth="2" />
          <text x="320" y="458" textAnchor="middle" fill="#c4b5fd" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Chainlink CCIP</text>
          <text x="320" y="475" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">Cross-Chain Router</text>
          
          {/* CCIP Steps */}
          <rect x="233" y="490" width="85" height="15" rx="2" fill="url(#grad-ccip)" stroke="#7c3aed" strokeWidth="1" />
          <text x="275" y="500" textAnchor="middle" fill="#ddd6fe" fontSize="6" fontFamily="ui-monospace, monospace">Lock & Burn</text>
          
          <rect x="323" y="490" width="85" height="15" rx="2" fill="url(#grad-ccip)" stroke="#7c3aed" strokeWidth="1" />
          <text x="365" y="500" textAnchor="middle" fill="#ddd6fe" fontSize="6" fontFamily="ui-monospace, monospace">0.3% Fee</text>

          {/* Arrow through CCIP */}
          <line x1="420" y1="467" x2="480" y2="467" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arr-ccip)" />
          <text x="450" y="460" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="ui-monospace, monospace">message</text>

          {/* Oracle Network */}
          <rect x="480" y="435" width="140" height="75" rx="3" fill="#0a0a0a" stroke="#7c3aed" strokeWidth="1.5" />
          <text x="550" y="458" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Oracle Network</text>
          <text x="550" y="475" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">Merkle Proof</text>
          <text x="550" y="490" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">Consensus</text>
          <text x="550" y="505" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">10-30 min</text>

          {/* Arrow to Destination */}
          <line x1="620" y1="467" x2="680" y2="467" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arr-ccip)" />

          {/* Arbitrum Sepolia Chain */}
          <rect x="680" y="425" width="150" height="85" rx="3" fill="#0a0a0a" stroke="#6366f1" strokeWidth="1.5" />
          <text x="755" y="448" textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Arbitrum Sepolia</text>
          <text x="755" y="468" textAnchor="middle" fill="#a5b4fc" fontSize="8" fontFamily="ui-monospace, monospace">USDA Token</text>
          <text x="755" y="485" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Chain ID: 421614</text>
          <text x="755" y="500" textAnchor="middle" fill="#a78bfa" fontSize="7" fontFamily="ui-monospace, monospace">~90 USDA</text>

          {/* mint() arrow */}
          <line x1="755" y1="425" x2="755" y2="400" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-decision)" strokeDasharray="3,2" />
          <text x="775" y="415" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="ui-monospace, monospace">mint()</text>

          {/* Bidirectional note */}
          <rect x="850" y="440" width="200" height="55" rx="3" fill="#0a0a0a" stroke="#8b5cf6" strokeWidth="1" />
          <text x="950" y="463" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Bidirectional Bridge</text>
          <text x="950" y="483" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">Sepolia ⟷ Arbitrum</text>
          <text x="950" y="503" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Powered by Chainlink CCIP</text>

          {/* ==================== COMPLIANCE LAYER (BOTTOM) ==================== */}
          <rect x="35" y="530" width="1040" height="230" rx="3" fill="#7c2d12" stroke="#c2410c" strokeWidth="1" strokeDasharray="4,2" fillOpacity="0.05" />

          {/* User Transaction */}
          <rect x="50" y="555" width="120" height="50" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
          <text x="110" y="575" textAnchor="middle" fill="#d4d4d4" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">User Call</text>
          <text x="110" y="592" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">deposit()</text>

          {/* Arrow to ACE Vault */}
          <line x1="170" y1="580" x2="195" y2="580" stroke="#f97316" strokeWidth="1.5" markerEnd="url(#arr-ace)" />

          {/* ACE-Compliant Vault */}
          <rect x="195" y="545" width="180" height="200" rx="3" fill="#0a0a0a" stroke="#f97316" strokeWidth="2" />
          <text x="285" y="568" textAnchor="middle" fill="#fb923c" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">ACE-Compliant Vault</text>
          <text x="285" y="585" textAnchor="middle" fill="#f97316" fontSize="8" fontFamily="ui-monospace, monospace">Compliance Layer</text>

          {/* ACE Check */}
          <rect x="208" y="600" width="154" height="55" rx="3" fill="url(#grad-ace)" stroke="#c2410c" strokeWidth="1.5" />
          <text x="285" y="622" textAnchor="middle" fill="#fdba74" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">ACE Policy Check</text>
          <text x="285" y="640" textAnchor="middle" fill="#fb923c" fontSize="8" fontFamily="ui-monospace, monospace">Calls PolicyEngine</text>

          {/* Inheritance note */}
          <rect x="208" y="665" width="154" height="70" rx="3" fill="#451a03" stroke="#9a3412" strokeWidth="1" />
          <text x="285" y="688" textAnchor="middle" fill="#fdba74" fontSize="8" fontFamily="ui-monospace, monospace">Inherits: ACECompliant</text>
          <text x="285" y="705" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">Modifier: requireACECompliant</text>
          <text x="285" y="722" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="ui-monospace, monospace">Chainlink USD Support</text>

          {/* Arrow to PolicyEngine */}
          <line x1="375" y1="610" x2="410" y2="610" stroke="#f97316" strokeWidth="2" markerEnd="url(#arr-ace)" />

          {/* PolicyEngine - Main Container */}
          <rect x="410" y="555" width="220" height="190" rx="3" fill="#0a0a0a" stroke="#c2410c" strokeWidth="2" />
          <text x="520" y="578" textAnchor="middle" fill="#fb923c" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">PolicyEngine</text>
          <text x="520" y="595" textAnchor="middle" fill="#f97316" fontSize="8" fontFamily="ui-monospace, monospace">On-Chain Compliance Rules</text>

          {/* Policy Boxes - Row 1 */}
          <rect x="425" y="610" width="90" height="55" rx="2" fill="#451a03" stroke="#9a3412" strokeWidth="1" />
          <text x="470" y="630" textAnchor="middle" fill="#fdba74" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Volume</text>
          <text x="470" y="645" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">Min/Max ETH</text>
          <text x="470" y="658" textAnchor="middle" fill="#fdba74" fontSize="7" fontFamily="ui-monospace, monospace">Daily limits</text>

          <rect x="525" y="610" width="90" height="55" rx="2" fill="#451a03" stroke="#9a3412" strokeWidth="1" />
          <text x="570" y="630" textAnchor="middle" fill="#fdba74" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Blacklist</text>
          <text x="570" y="645" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">OFAC/Sanctions</text>
          <text x="570" y="658" textAnchor="middle" fill="#fdba74" fontSize="7" fontFamily="ui-monospace, monospace">Custom lists</text>

          {/* Policy Boxes - Row 2 */}
          <rect x="425" y="675" width="90" height="55" rx="2" fill="#451a03" stroke="#9a3412" strokeWidth="1" />
          <text x="470" y="695" textAnchor="middle" fill="#fdba74" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Function</text>
          <text x="470" y="710" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">Signature</text>
          <text x="470" y="723" textAnchor="middle" fill="#fdba74" fontSize="7" fontFamily="ui-monospace, monospace">Restrictions</text>

          <rect x="525" y="675" width="90" height="55" rx="2" fill="#451a03" stroke="#9a3412" strokeWidth="1" />
          <text x="570" y="695" textAnchor="middle" fill="#fdba74" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Custom</text>
          <text x="570" y="712" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">User-defined</text>
          <text x="570" y="725" textAnchor="middle" fill="#fb923c" fontSize="6" fontFamily="ui-monospace, monospace">rules</text>



          {/* Arrow from PolicyEngine to Decision */}
          <line x1="630" y1="650" x2="665" y2="650" stroke="#f97316" strokeWidth="2" markerEnd="url(#arr-ace)" />

          {/* Decision Box */}
          <rect x="665" y="595" width="130" height="110" rx="3" fill="#0a0a0a" stroke="#c2410c" strokeWidth="2" />
          <text x="730" y="618" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">Decision</text>
          
          <rect x="675" y="635" width="50" height="55" rx="2" fill="#14532d" stroke="#16a34a" strokeWidth="1" />
          <text x="700" y="660" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold" fontFamily="ui-monospace, monospace">✓</text>
          <text x="700" y="678" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="ui-monospace, monospace">ALLOW</text>

          <rect x="735" y="635" width="50" height="55" rx="2" fill="#450a0a" stroke="#dc2626" strokeWidth="1" />
          <text x="760" y="660" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold" fontFamily="ui-monospace, monospace">✕</text>
          <text x="760" y="678" textAnchor="middle" fill="#fca5a5" fontSize="8" fontFamily="ui-monospace, monospace">BLOCK</text>

          {/* Arrow from Decision to Execution */}
          <line x1="795" y1="650" x2="820" y2="650" stroke="#f97316" strokeWidth="2" markerEnd="url(#arr-ace)" />

          {/* Vault Execution */}
          <rect x="820" y="595" width="140" height="110" rx="3" fill="#0a0a0a" stroke="#f97316" strokeWidth="1.5" />
          <text x="890" y="620" textAnchor="middle" fill="#fb923c" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Vault Execution</text>
          <text x="890" y="645" textAnchor="middle" fill="#fdba74" fontSize="8" fontFamily="ui-monospace, monospace">✓ Proceed</text>
          <text x="890" y="665" textAnchor="middle" fill="#fca5a5" fontSize="8" fontFamily="ui-monospace, monospace">✕ Revert</text>
          <text x="890" y="685" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">ACE_BLOCKED</text>

          {/* Arrow back to User */}
          <line x1="820" y1="680" x2="170" y2="680" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-solid)" />
          <text x="495" y="673" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Result</text>

          {/* ==================== REGISTRATION FLOW (BOTTOM) ==================== */}
          <text x="550" y="775" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">REGISTRATION (One-time setup)</text>
          
          <rect x="35" y="780" width="520" height="65" rx="3" fill="#0a0a0a" stroke="#1e40af" strokeWidth="1" strokeDasharray="4,2" />
          
          {/* Registration steps */}
          <rect x="45" y="792" width="105" height="42" rx="2" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
          <text x="97" y="810" textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Registry</text>
          <text x="97" y="825" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="ui-monospace, monospace">+ 0.01 ETH</text>

          <line x1="150" y1="813" x2="165" y2="813" stroke="#3b82f6" strokeWidth="1" markerEnd="url(#arr-register)" />

          <rect x="165" y="792" width="105" height="42" rx="2" fill="#052e16" stroke="#22c55e" strokeWidth="1" />
          <text x="217" y="810" textAnchor="middle" fill="#86efac" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Grant Role</text>
          <text x="217" y="825" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="ui-monospace, monospace">PAUSER_ROLE</text>

          <line x1="270" y1="813" x2="285" y2="813" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-decision)" />

          <rect x="285" y="792" width="105" height="42" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="337" y="810" textAnchor="middle" fill="#d4d4d4" fontSize="8" fontFamily="ui-monospace, monospace">For Guardian</text>
          <text x="337" y="825" textAnchor="middle" fill="#a3a3a3" fontSize="7" fontFamily="ui-monospace, monospace">(existing contracts)</text>

          <line x1="390" y1="813" x2="405" y2="813" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr-solid)" />

          <rect x="405" y="792" width="140" height="42" rx="2" fill="#451a03" stroke="#f97316" strokeWidth="1" />
          <text x="475" y="810" textAnchor="middle" fill="#fdba74" fontSize="8" fontFamily="ui-monospace, monospace">Deploy ACE</text>
          <text x="475" y="825" textAnchor="middle" fill="#fb923c" fontSize="7" fontFamily="ui-monospace, monospace">(new contracts)</text>

          {/* ==================== LEGEND (BOTTOM RIGHT) ==================== */}
          <rect x="575" y="780" width="500" height="195" rx="3" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
          <text x="825" y="803" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">Component Legend</text>
          <line x1="590" y1="813" x2="1060" y2="813" stroke="#262626" strokeWidth="1" />

          {/* Legend items - Column 1 */}
          <rect x="595" y="828" width="12" height="12" rx="2" fill="#052e16" stroke="#16a34a" strokeWidth="1" />
          <text x="615" y="838" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Guardian: Security Layer (Reactive)</text>

          <rect x="595" y="848" width="12" height="12" rx="2" fill="#164e63" stroke="#06b6d4" strokeWidth="1" fillOpacity="0.3" />
          <text x="615" y="858" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">PoR: Proof of Reserves (Demo)</text>

          <rect x="595" y="868" width="12" height="12" rx="2" fill="#7c2d12" stroke="#c2410c" strokeWidth="1" fillOpacity="0.3" />
          <text x="615" y="878" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">ACE: Compliance Layer (Proactive)</text>

          <rect x="595" y="888" width="12" height="12" rx="2" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
          <text x="615" y="898" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Chainlink: Price Feed + CRE</text>

          <rect x="595" y="908" width="12" height="12" rx="2" fill="url(#grad-tee)" stroke="#1e40af" strokeWidth="1" />
          <text x="615" y="918" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">TEE: Trusted Execution Environment</text>

          <rect x="595" y="928" width="12" height="12" rx="2" fill="url(#grad-llm)" stroke="#7c3aed" strokeWidth="1" />
          <text x="615" y="938" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">LLM: xAI Grok Analysis</text>

          <rect x="595" y="948" width="12" height="12" rx="2" fill="url(#grad-ccip)" stroke="#8b5cf6" strokeWidth="1" />
          <text x="615" y="958" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">CCIP: Cross-Chain Bridge</text>

          {/* Legend items - Column 2 */}
          <rect x="830" y="828" width="12" height="12" rx="2" fill="#171717" stroke="#525252" strokeWidth="1" />
          <text x="850" y="838" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Off-chain Service</text>

          <rect x="830" y="848" width="12" height="12" rx="2" fill="#0a0a0a" stroke="#525252" strokeWidth="1" />
          <text x="850" y="858" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">On-chain Contract</text>

          {/* PoR Demo Note */}
          <text x="995" y="833" fill="#06b6d4" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">PoR Demo:</text>
          <text x="995" y="853" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">ETH → USDA</text>
          <text x="995" y="873" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">CRE verifies</text>
          <text x="995" y="893" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">bank reserves</text>
          <text x="995" y="913" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">via Conf.</text>
          <text x="995" y="933" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">HTTP</text>
        </svg>
      </div>
    </div>
  );
}
