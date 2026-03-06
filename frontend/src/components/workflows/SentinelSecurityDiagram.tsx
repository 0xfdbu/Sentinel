export function SentinelSecurityDiagram() {
  return (
    <div className="w-full overflow-x-auto py-6" style={{ minHeight: '480px' }}>
      <svg viewBox="0 0 1000 540" className="w-full min-w-[900px]" style={{ height: 'auto', minHeight: '460px' }}>
        <defs>
          <marker id="arr-sec-min" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-sec-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-sec-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
          <marker id="arr-sec-llm" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
          </marker>
          <marker id="arr-sec-alert" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          Sentinel Security Scanner
        </text>
        <text x="500" y="50" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          workflows/sentinel-security
        </text>

        {/* === STEP 1: THREAT DETECTION === */}
        <rect x="60" y="70" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="85" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Threat Detection</text>

        <rect x="60" y="100" width="140" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="130" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Mempool Monitor</text>
        <text x="130" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Poll every 2s</text>
        <text x="130" y="143" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">Pending txns</text>

        <line x1="200" y1="125" x2="220" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-sec-min)" />

        <rect x="220" y="100" width="140" height="50" rx="4" fill="#0a0a0a" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
        <text x="290" y="118" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">⚠️ Pattern Match</text>
        <text x="290" y="133" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">High-value tx</text>
        <text x="290" y="143" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Attack signature</text>

        <line x1="360" y1="125" x2="380" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-sec-min)" />

        <rect x="380" y="100" width="140" height="50" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
        <text x="450" y="118" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🚨 HIGH RISK</text>
        <text x="450" y="135" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">Trigger CRE</text>

        <line x1="520" y1="125" x2="540" y2="125" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arr-sec-alert)" />

        <rect x="540" y="100" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="600" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 TEE</text>
        <text x="600" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Confidential</text>
        <text x="600" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">execution</text>

        <line x1="660" y1="125" x2="660" y2="165" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sec-step)" />

        {/* Clarification */}
        <rect x="720" y="100" width="230" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="118" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Monitors mempool for</text>
        <text x="835" y="132" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">suspicious patterns</text>
        <text x="835" y="145" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Triggers on high-value txs</text>

        {/* === STEP 2: SOURCE FETCH === */}
        <rect x="60" y="175" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="190" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Source Analysis</text>

        <rect x="60" y="205" width="180" height="45" rx="4" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="150" y="222" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Etherscan API</text>
        <text x="150" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Fetch contract source</text>

        <line x1="240" y1="227" x2="260" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-sec-min)" />

        <rect x="260" y="205" width="180" height="45" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="350" y="222" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 TEE Analysis</text>
        <text x="350" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Code decompile</text>

        <line x1="440" y1="227" x2="460" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-sec-min)" />

        <rect x="460" y="205" width="140" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="530" y="222" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">Contract Info</text>
        <text x="530" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Source verified</text>

        <line x1="530" y1="250" x2="530" y2="265" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sec-step)" />

        {/* Clarification */}
        <rect x="720" y="205" width="230" height="45" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="222" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Fetches contract source</text>
        <text x="835" y="238" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Decompiles if needed</text>

        {/* === STEP 3: LLM ANALYSIS === */}
        <rect x="60" y="275" width="140" height="22" rx="11" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="130" y="290" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 AI Security Scan</text>

        <rect x="60" y="305" width="320" height="65" rx="4" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1.5" />
        <text x="220" y="325" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">xAI Grok Security Analysis</text>
        <text x="220" y="342" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">api.x.ai/v1/chat/completions</text>
        <text x="220" y="358" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Contract code → Vulnerability scan</text>

        <line x1="380" y1="337" x2="400" y2="337" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-sec-llm)" />

        {/* AI Decision */}
        <rect x="400" y="305" width="140" height="65" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
        <text x="470" y="330" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">CRITICAL</text>
        <text x="470" y="348" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">Reentrancy detected</text>
        <text x="470" y="362" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Confidence: 94%</text>

        <line x1="540" y1="337" x2="560" y2="337" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arr-sec-alert)" />

        <rect x="560" y="305" width="100" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="610" y="330" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 DON</text>
        <text x="610" y="348" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Attest</text>
        <text x="610" y="362" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">ECDSA</text>

        <line x1="470" y1="370" x2="470" y2="385" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-sec-step)" />

        {/* Clarification box for LLM */}
        <rect x="680" y="305" width="270" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="815" y="325" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI scans for vulnerabilities</text>
        <text x="815" y="340" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Risk: LOW/MEDIUM/HIGH/CRITICAL</text>
        <text x="815" y="355" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Auto-pause if risk ≥ MEDIUM</text>

        {/* === STEP 4: AUTO-PAUSE === */}
        <rect x="60" y="400" width="120" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="120" y="415" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Auto Protection</text>

        <rect x="60" y="430" width="140" height="45" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="130" y="448" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">SentinelGuardian</text>
        <text x="130" y="463" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">emergencyPause()</text>

        <line x1="200" y1="452" x2="220" y2="452" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arr-sec-alert)" />

        <rect x="220" y="430" width="140" height="45" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
        <text x="290" y="448" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">⏸️ PAUSED</text>
        <text x="290" y="463" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">Funds protected</text>

        <rect x="380" y="430" width="140" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="450" y="448" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">DON Report</text>
        <text x="450" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">On-chain verified</text>

        <line x1="360" y1="452" x2="375" y2="452" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-sec-ok)" />

        {/* Trigger */}
        <rect x="850" y="430" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="905" y="448" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">TRIGGER</text>
        <text x="905" y="462" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">HTTP POST</text>
        <text x="905" y="474" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">/api/security/scan</text>

        <line x1="850" y1="455" x2="460" y2="337" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-sec-min)" />

        {/* Bottom info */}
        <text x="500" y="510" textAnchor="middle" fill="#404040" fontSize="9" fontFamily="ui-monospace, monospace">
          2 APIs • Threat → Source → AI Scan → Auto-Pause
        </text>

        {/* Legend */}
        <rect x="60" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="78" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Public API</text>

        <rect x="140" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1" />
        <text x="158" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">LLM</text>

        <rect x="190" y="520" width="10" height="10" rx="2" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
        <text x="208" y="529" fill="#fca5a5" fontSize="8" fontFamily="ui-monospace, monospace">Alert</text>

        <rect x="240" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="258" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Guardian</text>

        <rect x="310" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="328" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Info</text>
      </svg>
    </div>
  );
}
