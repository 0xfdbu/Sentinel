import React from 'react'

export function PauseWithDonDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 700" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
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
          Investigation-based: Sentinel scores → Workflow investigates → xAI decides
        </text>

        {/* === STEP 0: SENTINEL NODE (SCORING) === */}
        <rect x="60" y="70" width="140" height="22" rx="11" fill="#171717" stroke="#3b82f6" strokeWidth="1" />
        <text x="130" y="85" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Sentinel Node</text>

        <rect x="60" y="100" width="140" height="60" rx="4" fill="#0a0a0a" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
        <text x="130" y="120" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🔍 Monitors Chain</text>
        <text x="130" y="138" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Heuristic scoring</text>
        <text x="130" y="150" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">Triggers if ≥70</text>

        <line x1="200" y1="130" x2="220" y2="130" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        {/* === STEP 1: HTTP TRIGGER === */}
        <rect x="220" y="100" width="140" height="60" rx="4" fill="#171717" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="290" y="120" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">HTTP Trigger</text>
        <text x="290" y="138" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">fraudScore, tx data</text>
        <text x="290" y="150" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">from, to, value</text>

        <line x1="360" y1="130" x2="380" y2="130" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="400" y="100" width="130" height="60" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="465" y="120" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 CRE TEE</text>
        <text x="465" y="138" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">⚠️ Regular HTTP</text>
        <text x="465" y="150" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">secrets.yaml (not vault)</text>

        {/* Clarification: Sentinel does scoring */}
        <rect x="560" y="100" width="200" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="660" y="118" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">Sentinel Node = Scoring</text>
        <text x="660" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Flash loan detection</text>
        <text x="660" y="148" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Pattern matching</text>

        <line x1="465" y1="160" x2="465" y2="175" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* === STEP 1.5: GOPLUS INVESTIGATION === */}
        <rect x="60" y="185" width="160" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="140" y="200" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">GoPlus Investigation</text>

        <rect x="60" y="215" width="150" height="65" rx="4" fill="#171717" stroke="#ec4899" strokeWidth="1.5" />
        <text x="135" y="238" textAnchor="middle" fill="#f472b6" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🔍 GoPlus Labs</text>
        <text x="135" y="258" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Token security API</text>
        <text x="135" y="273" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">api.gopluslabs.io (no key)</text>

        <line x1="210" y1="247" x2="240" y2="247" stroke="#ec4899" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="240" y="215" width="160" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="320" y="238" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Evidence Gathering</text>
        <text x="320" y="258" textAnchor="middle" fill="#f472b6" fontSize="8" fontFamily="ui-monospace, monospace">from/to addresses</text>
        <text x="320" y="273" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Data for xAI (NOT scoring)</text>

        {/* GoPlus indicators */}
        <rect x="430" y="215" width="200" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="530" y="235" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Evidence: honeypot, blacklist</text>
        <text x="530" y="250" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">mintable, proxy, holders</text>
        <text x="530" y="265" textAnchor="middle" fill="#ec4899" fontSize="8" fontFamily="ui-monospace, monospace">Pure investigation → xAI</text>

        <line x1="320" y1="280" x2="320" y2="295" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* === STEP 2: PROOF OF RESERVE === */}
        <rect x="60" y="310" width="150" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="135" y="325" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Proof of Reserve</text>

        <rect x="60" y="340" width="150" height="65" rx="4" fill="#171717" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="135" y="363" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🏦 Bank API</text>
        <text x="135" y="383" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Reserve balance check</text>
        <text x="135" y="398" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">api.firstplaidypusbank.plaid.com</text>

        <line x1="210" y1="372" x2="240" y2="372" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="240" y="340" width="160" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="320" y="363" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Reserve Validation</text>
        <text x="320" y="383" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Reserves ≥ $1M</text>
        <text x="320" y="398" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="ui-monospace, monospace">⚠ Auto-pause if &lt;$1M</text>

        {/* PoR Failsafe note */}
        <rect x="430" y="340" width="200" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="530" y="363" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Failsafe: Auto-pause if &lt;$1M</text>
        <text x="530" y="378" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">reserves below threshold</text>
        <text x="530" y="393" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Emergency condition</text>

        <line x1="320" y1="405" x2="320" y2="420" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* === STEP 3: xAI DECISION === */}
        <rect x="60" y="435" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="130" y="450" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">xAI Decision</text>

        <rect x="60" y="465" width="150" height="65" rx="4" fill="#171717" stroke="#a855f7" strokeWidth="1.5" />
        <text x="135" y="488" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 xAI Grok</text>
        <text x="135" y="508" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Analyzes ALL evidence</text>
        <text x="135" y="523" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">api.x.ai/v1/chat/completions</text>

        <line x1="210" y1="497" x2="240" y2="497" stroke="#a855f7" strokeWidth="1.5" markerEnd="url(#arr-sg)" />

        <rect x="240" y="465" width="160" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="320" y="488" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">AI Decision</text>
        <text x="320" y="508" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">🛑 PAUSE</text>
        <text x="320" y="523" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">👁️ MONITOR</text>

        {/* xAI note */}
        <rect x="430" y="465" width="200" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="530" y="488" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="ui-monospace, monospace">xAI DECIDES (not scores)</text>
        <text x="530" y="503" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Based on: Sentinel + GoPlus + PoR</text>
        <text x="530" y="518" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Conservative: pause &gt; risk</text>

        <line x1="320" y1="530" x2="320" y2="545" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sg-step)" />

        {/* === STEP 4: DON REPORT + BROADCAST === */}
        <rect x="60" y="560" width="160" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="140" y="575" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">DON + Broadcast</text>

        <rect x="60" y="590" width="150" height="65" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1.5" />
        <text x="135" y="613" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Generate Report</text>
        <text x="135" y="633" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">DON attestation</text>
        <text x="135" y="648" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Auto broadcast enabled</text>

        <line x1="210" y1="622" x2="240" y2="622" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-sg-ok)" />

        <rect x="240" y="590" width="160" height="65" rx="4" fill="#171717" stroke="#f97316" strokeWidth="1.5" />
        <text x="320" y="613" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">EmergencyGuardianDON</text>
        <text x="320" y="633" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">writeReport()</text>
        <text x="320" y="648" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">0x7774...a7d4</text>

        <line x1="400" y1="622" x2="430" y2="622" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-sg-ok)" />

        <rect x="430" y="590" width="130" height="65" rx="4" fill="#171717" stroke="#ef4444" strokeWidth="1.5" />
        <text x="495" y="618" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="500" fontFamily="ui-monospace, monospace">⏸️ PAUSED</text>
        <text x="495" y="638" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">USDA secured</text>
        <text x="495" y="648" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Before hack completes</text>

        {/* Monitor path */}
        <rect x="600" y="590" width="120" height="65" rx="4" fill="#0a0a0a" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.4" />
        <text x="660" y="618" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">👁️ MONITOR</text>
        <text x="660" y="638" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Low risk</text>
        <text x="660" y="648" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Continue watching</text>

        <path d="M 320 530 L 660 530 L 660 590" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,3" fill="none" markerEnd="url(#arr-sg)" />
        <text x="520" y="555" textAnchor="middle" fill="#3b82f6" fontSize="7" fontFamily="ui-monospace, monospace">Decision: MONITOR</text>

        {/* Bottom warning */}
        <text x="500" y="685" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">
          ⚠️ Regular HTTP + secrets.yaml • NO Confidential HTTP used
        </text>
      </svg>
    </div>
  );
}
