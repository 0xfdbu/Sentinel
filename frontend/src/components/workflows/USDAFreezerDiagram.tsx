import React from 'react'

export function USDAFreezerDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 540" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-fz" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-fz-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-fz-warn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
          </marker>
          <marker id="arr-fz-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
          <marker id="arr-fz-ai" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          AML & Scam Freeze Sentinel
        </text>
        <text x="500" y="50" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          workflows/usda-freeze-sentinel
        </text>

        {/* === STEP 1: TRIGGER === */}
        <rect x="60" y="70" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="85" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">EVM Trigger</text>

        <rect x="60" y="100" width="150" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="135" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">USDA Transfer</text>
        <text x="135" y="133" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">0.5 USDA</text>
        <text x="135" y="145" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">0x1234... → 0xabcd...</text>

        <line x1="135" y1="150" x2="135" y2="165" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-fz-step)" />

        {/* Clarification */}
        <rect x="230" y="100" width="240" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="350" y="118" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Monitors all Transfer events</text>
        <text x="350" y="132" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Triggered by EVM Log on Sepolia</text>
        <text x="350" y="145" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Real-time detection</text>

        {/* === STEP 2: SECURITY CHECKS === */}
        <rect x="60" y="175" width="130" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="125" y="190" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Security Checks</text>

        <rect x="60" y="205" width="130" height="50" rx="4" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="125" y="222" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">GoPlus API</text>
        <text x="125" y="237" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Clean</text>
        <text x="125" y="247" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">SlowMist+ScamSniffer</text>

        <rect x="210" y="205" width="130" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="275" y="222" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">ScamSniffer DB</text>
        <text x="275" y="237" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Not Listed</text>
        <text x="275" y="247" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">2,847 addresses</text>

        <rect x="360" y="205" width="130" height="50" rx="4" fill="#171717" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
        <text x="425" y="222" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Sanction Source</text>
        <text x="425" y="237" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Clean</text>
        <text x="425" y="247" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">github.com/0xfdbu</text>

        <line x1="190" y1="230" x2="205" y2="230" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-fz)" />
        <line x1="340" y1="230" x2="355" y2="230" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-fz)" />

        <rect x="510" y="205" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1" />
        <text x="565" y="222" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Risk Score</text>
        <text x="565" y="237" textAnchor="middle" fill="#fbbf24" fontSize="13" fontWeight="500" fontFamily="ui-monospace, monospace">15/100</text>
        <text x="565" y="248" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Low Risk</text>

        <line x1="490" y1="230" x2="505" y2="230" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-fz)" />
        <line x1="565" y1="255" x2="565" y2="270" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-fz-step)" />

        {/* Clarification */}
        <rect x="650" y="205" width="290" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="795" y="222" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">3-source security verification</text>
        <text x="795" y="238" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">⚠️ Regular HTTP (secrets.yaml)</text>
        <text x="795" y="253" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">No Confidential HTTP used</text>
        <text x="795" y="265" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Risk &lt; 20 skips AI review</text>

        {/* === STEP 3: AI DECISION === */}
        <rect x="60" y="280" width="120" height="22" rx="11" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="120" y="295" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 AI Review</text>

        <rect x="60" y="310" width="280" height="60" rx="4" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1.5" />
        <text x="200" y="330" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 xAI Grok Analysis</text>
        <text x="200" y="348" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">Low risk detected - no freeze needed</text>
        <text x="200" y="362" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Confidence: 87%</text>

        <line x1="340" y1="340" x2="360" y2="340" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arr-fz-ai)" />

        <rect x="360" y="310" width="120" height="60" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="420" y="335" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ SKIP</text>
        <text x="420" y="353" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Below threshold</text>
        <text x="420" y="368" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Risk: 15/100</text>

        <line x1="480" y1="340" x2="500" y2="340" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-fz-ok)" />

        <line x1="420" y1="370" x2="420" y2="385" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-fz-step)" />

        {/* Alternative: FREEZE path (shown as example) */}
        <rect x="560" y="310" width="120" height="60" rx="4" fill="#0a0a0a" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
        <text x="620" y="335" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">❄️ FREEZE</text>
        <text x="620" y="353" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">If Risk &gt; 50</text>
        <text x="620" y="368" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Sanctioned/Scam</text>

        {/* Clarification */}
        <rect x="700" y="310" width="240" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="820" y="330" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI reviews high-risk transfers</text>
        <text x="820" y="346" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Can override if anomalies detected</text>
        <text x="820" y="362" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Conservative freeze policy</text>

        {/* === STEP 4: EXECUTION (if freeze) === */}
        <rect x="60" y="400" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="415" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Freeze Action</text>

        <rect x="60" y="430" width="140" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="130" y="448" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 DON Sign</text>
        <text x="130" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">ECDSA Report</text>
        <text x="130" y="473" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">writeReport()</text>

        <line x1="200" y1="455" x2="220" y2="455" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-fz)" />

        <rect x="220" y="430" width="140" height="50" rx="4" fill="#171717" stroke="#ef4444" strokeWidth="1.5" />
        <text x="290" y="448" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">USDAFreezer</text>
        <text x="290" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">onReport()</text>
        <text x="290" y="473" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">0x2F1A...2023</text>

        <line x1="360" y1="455" x2="380" y2="455" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arr-fz-warn)" />

        <rect x="380" y="430" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" />
        <text x="440" y="450" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">❄️ FROZEN</text>
        <text x="440" y="470" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">7 days</text>

        {/* USDA Token (unaffected) */}
        <rect x="540" y="430" width="120" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.5" />
        <text x="600" y="450" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">🪙 USDA</text>
        <text x="600" y="470" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Still Operational</text>

        {/* Trigger */}
        <rect x="850" y="430" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="910" y="448" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">TRIGGER</text>
        <text x="910" y="465" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">EVM Log</text>

        {/* Bottom info */}
        <text x="500" y="505" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">
          ✅ Real-time monitoring • 3-source check • AI decision • DON-signed freeze • Non-blocking
        </text>
        <text x="500" y="520" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">
          ⚠️ Regular HTTP + secrets.yaml • NO Confidential HTTP • 3 Security APIs + xAI + DON
        </text>

        {/* Legend */}
        <rect x="60" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="78" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Security API</text>

        <rect x="150" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
        <text x="168" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sanction Source</text>

        <rect x="255" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1" />
        <text x="273" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI</text>

        <rect x="295" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="313" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Safe</text>

        <rect x="345" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.4" />
        <text x="363" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Freeze</text>

        <rect x="410" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="428" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Info</text>
      </svg>
    </div>
  );
}
