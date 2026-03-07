export function PauseWithDonDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 620" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-sg" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-sg-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-sg-warn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
          </marker>
          <marker id="arr-sg-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          Sentinel Guard
        </text>
        <text x="500" y="50" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          Autonomous security guard for reserve & vault protection
        </text>

        {/* === STEP 1: TRIGGER === */}
        <rect x="60" y="70" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="85" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">HTTP Trigger</text>

        <rect x="60" y="100" width="140" height="60" rx="4" fill="#171717" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="130" y="120" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Sentinel Node</text>
        <text x="130" y="138" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Threat detected</text>
        <text x="130" y="150" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">fraudScore ≥ 70</text>

        <line x1="200" y1="130" x2="220" y2="130" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="220" y="100" width="160" height="60" rx="4" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="300" y="120" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Threat Metadata</text>
        <text x="300" y="138" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">riskFactors[], suspiciousTx</text>
        <text x="300" y="150" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">from, to, value</text>

        <line x1="380" y1="130" x2="400" y2="130" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="400" y="100" width="130" height="60" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="465" y="120" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 CRE TEE</text>
        <text x="465" y="138" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Workflow starts</text>
        <text x="465" y="150" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Confidential compute</text>

        <line x1="465" y1="160" x2="465" y2="175" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* === STEP 2: PROOF OF RESERVE === */}
        <rect x="60" y="185" width="150" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="135" y="200" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Proof of Reserve</text>

        <rect x="60" y="215" width="150" height="65" rx="4" fill="#171717" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="135" y="238" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🏦 Bank API</text>
        <text x="135" y="258" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Reserve balance check</text>
        <text x="135" y="273" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">api.firstplaidypusbank.plaid.com</text>

        <line x1="210" y1="247" x2="240" y2="247" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="240" y="215" width="160" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="320" y="238" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Reserve Validation</text>
        <text x="320" y="258" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Reserves ≥ $1M</text>
        <text x="320" y="273" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="ui-monospace, monospace">⚠ Auto-pause if &lt;$1M</text>

        <line x1="320" y1="280" x2="320" y2="295" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* Clarification */}
        <rect x="430" y="215" width="200" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="530" y="238" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Failsafe: Auto-pause if &lt;$1M</text>
        <text x="530" y="253" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">reserves below threshold</text>
        <text x="530" y="268" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">to prevent undercollateralization</text>

        {/* === STEP 3: xAI ANALYSIS === */}
        <rect x="60" y="310" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="130" y="325" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">xAI Analysis</text>

        <rect x="60" y="340" width="150" height="65" rx="4" fill="#171717" stroke="#a855f7" strokeWidth="1.5" />
        <text x="135" y="363" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 xAI Grok</text>
        <text x="135" y="383" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Threat assessment</text>
        <text x="135" y="398" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">api.x.ai/v1/chat/completions</text>

        <line x1="210" y1="372" x2="240" y2="372" stroke="#a855f7" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="240" y="340" width="160" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="320" y="363" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">AI Decision</text>
        <text x="320" y="383" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">🛑 PAUSE (score ≥ 80)</text>
        <text x="320" y="398" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">👁️ MONITOR (score &lt; 80)</text>

        <line x1="320" y1="405" x2="320" y2="420" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* Clarification */}
        <rect x="430" y="340" width="200" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="530" y="363" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI analyzes threat metadata</text>
        <text x="530" y="378" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Fallback to heuristic scoring</text>
        <text x="530" y="393" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">if API unavailable</text>

        {/* === STEP 4: DON REPORT === */}
        <rect x="60" y="435" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="130" y="450" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">DON Report</text>

        <rect x="60" y="465" width="150" height="65" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1.5" />
        <text x="135" y="488" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Generate Report</text>
        <text x="135" y="508" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">keccak256(action+target)</text>
        <text x="135" y="523" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Encode + DON sign</text>

        <line x1="210" y1="497" x2="240" y2="497" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-sg-ok)" />

        <rect x="240" y="465" width="160" height="65" rx="4" fill="#171717" stroke="#f97316" strokeWidth="1.5" />
        <text x="320" y="488" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">EmergencyGuardian</text>
        <text x="320" y="508" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">onReport(metadata, report)</text>
        <text x="320" y="523" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">0xD196...5AE1</text>

        <line x1="400" y1="497" x2="430" y2="497" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-sg-ok)" />

        <rect x="430" y="465" width="130" height="65" rx="4" fill="#171717" stroke="#ef4444" strokeWidth="1.5" />
        <text x="495" y="493" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="500" fontFamily="ui-monospace, monospace">⏸️ PAUSED</text>
        <text x="495" y="513" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Vault secured</text>
        <text x="495" y="523" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Before hack completes</text>

        {/* Monitor path */}
        <rect x="600" y="465" width="120" height="65" rx="4" fill="#0a0a0a" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.4" />
        <text x="660" y="493" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">👁️ MONITOR</text>
        <text x="660" y="513" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Low risk</text>
        <text x="660" y="523" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Continue watching</text>

        <path d="M 320 405 L 660 405 L 660 465" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arr-sg)" />
        <text x="520" y="400" textAnchor="middle" fill="#3b82f6" fontSize="7" fontFamily="ui-monospace, monospace">Decision: MONITOR</text>

        {/* Bottom info */}
        <text x="500" y="575" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">
          ✅ Sentinel Node → PoR Check → xAI Analysis → DON Report → Emergency Pause
        </text>

        {/* Legend */}
        <rect x="60" y="595" width="10" height="10" rx="2" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="78" y="604" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Trigger</text>

        <rect x="130" y="595" width="10" height="10" rx="2" fill="#171717" stroke="#f59e0b" strokeWidth="1" />
        <text x="148" y="604" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Reserve</text>

        <rect x="195" y="595" width="10" height="10" rx="2" fill="#171717" stroke="#a855f7" strokeWidth="1" />
        <text x="213" y="604" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI</text>

        <rect x="235" y="595" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" />
        <text x="253" y="604" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Success</text>

        <rect x="295" y="595" width="10" height="10" rx="2" fill="#171717" stroke="#ef4444" strokeWidth="1" />
        <text x="313" y="604" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Pause</text>

        <rect x="350" y="595" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="368" y="604" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Info</text>
      </svg>
    </div>
  );
}
