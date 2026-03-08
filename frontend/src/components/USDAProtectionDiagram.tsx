import React from 'react'

export function USDAProtectionDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 700" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-usda" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-usda-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-usda-warn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
          </marker>
          <marker id="arr-usda-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="25" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          USDA Protection Network
        </text>
        <text x="500" y="42" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          5 Workflows → 1 Protected Stablecoin
        </text>

        {/* === WORKFLOW 1: PoR MINT (Top) === */}
        <rect x="60" y="60" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="130" y="75" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">1. PoR Mint</text>

        <rect x="60" y="90" width="140" height="70" rx="4" fill="#171717" stroke="#10b981" strokeWidth="1.5" />
        <text x="130" y="115" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🏦 Bank API</text>
        <text x="130" y="135" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,800,000 reserves</text>
        <text x="130" y="150" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Reserve ratio 1.8x</text>

        <line x1="200" y1="125" x2="380" y2="200" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arr-usda-ok)" />

        {/* Info box */}
        <rect x="220" y="95" width="160" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="300" y="115" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">No minting without</text>
        <text x="300" y="130" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">verified bank reserves</text>
        <text x="300" y="145" textAnchor="middle" fill="#10b981" fontSize="8" fontFamily="ui-monospace, monospace">Failsafe: Auto-pause if &lt;$1M</text>

        {/* === WORKFLOW 2: AML & SCAM FREEZE (Right) === */}
        <rect x="800" y="200" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="870" y="215" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">2. AML & Freeze</text>

        <rect x="800" y="230" width="140" height="70" rx="4" fill="#171717" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="870" y="255" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🧊 AI Freeze</text>
        <text x="870" y="275" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Real-time monitoring</text>
        <text x="870" y="290" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">🤖 xAI decides</text>

        <line x1="800" y1="265" x2="620" y2="300" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr-usda)" />

        {/* Info box */}
        <rect x="620" y="220" width="160" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="700" y="240" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">GoPlus + ScamSniffer</text>
        <text x="700" y="255" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">address screening</text>
        <text x="700" y="270" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">Auto-freeze suspicious</text>

        {/* === WORKFLOW 3: BLACKLIST (Bottom Right) === */}
        <rect x="700" y="480" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="770" y="495" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">3. Blacklist</text>

        <rect x="700" y="510" width="140" height="70" rx="4" fill="#171717" stroke="#a855f7" strokeWidth="1.5" />
        <text x="770" y="535" textAnchor="middle" fill="#c084fc" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🚫 Blocked</text>
        <text x="770" y="555" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">2,557 addresses</text>
        <text x="770" y="570" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="ui-monospace, monospace">Daily sync via DON</text>

        <line x1="700" y1="545" x2="560" y2="420" stroke="#a855f7" strokeWidth="1.5" markerEnd="url(#arr-usda)" />

        {/* Info box */}
        <rect x="850" y="520" width="130" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="915" y="540" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sources:</text>
        <text x="915" y="555" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">GoPlus, ScamSniffer</text>
        <text x="915" y="570" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sentinel Sanctions</text>

        {/* === WORKFLOW 4: VOLUME GUARD (Bottom Left) === */}
        <rect x="160" y="480" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="230" y="495" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">4. Volume Guard</text>

        <rect x="160" y="510" width="140" height="70" rx="4" fill="#171717" stroke="#f97316" strokeWidth="1.5" />
        <text x="230" y="535" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">📊 Dynamic Limits</text>
        <text x="230" y="555" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Current: 400 USDA/day</text>
        <text x="230" y="570" textAnchor="middle" fill="#f97316" fontSize="8" fontFamily="ui-monospace, monospace">Auto-adjusts by reserves</text>

        <line x1="300" y1="545" x2="440" y2="420" stroke="#f97316" strokeWidth="1.5" markerEnd="url(#arr-usda)" />

        {/* Info box */}
        <rect x="20" y="520" width="130" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="85" y="540" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Every 15 min:</text>
        <text x="85" y="555" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI analyzes market</text>
        <text x="85" y="570" textAnchor="middle" fill="#f97316" fontSize="8" fontFamily="ui-monospace, monospace">↓ limit if bearish</text>

        {/* === WORKFLOW 5: SENTINEL GUARD (Left) === */}
        <rect x="60" y="200" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="130" y="215" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">5. Sentinel Guard</text>

        <rect x="60" y="230" width="140" height="70" rx="4" fill="#171717" stroke="#ef4444" strokeWidth="1.5" />
        <text x="130" y="255" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🚨 Emergency</text>
        <text x="130" y="275" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Attack detection</text>
        <text x="130" y="290" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">⏸️ Instant pause</text>

        <line x1="200" y1="265" x2="380" y2="300" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arr-usda-warn)" />

        {/* Info box */}
        <rect x="20" y="320" width="130" height="60" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="85" y="340" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sentinel Node</text>
        <text x="85" y="355" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">monitors mempool</text>
        <text x="85" y="370" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="ui-monospace, monospace">Flash loan detection</text>

        {/* === CENTER: USDA TOKEN === */}
        <rect x="400" y="250" width="200" height="120" rx="8" fill="#0a0a0a" stroke="#10b981" strokeWidth="2" />
        <text x="500" y="290" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold" fontFamily="ui-monospace, monospace">USDA</text>
        <text x="500" y="315" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="ui-monospace, monospace">Protected Stablecoin</text>
        <text x="500" y="340" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="ui-monospace, monospace">✓ 5 Active Workflows</text>
        <text x="500" y="355" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">0xFA93...3F45</text>

        {/* Legend */}
        <rect x="60" y="620" width="10" height="10" rx="2" fill="#171717" stroke="#10b981" strokeWidth="1" />
        <text x="78" y="629" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">PoR</text>

        <rect x="120" y="620" width="10" height="10" rx="2" fill="#171717" stroke="#3b82f6" strokeWidth="1" />
        <text x="138" y="629" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AML</text>

        <rect x="180" y="620" width="10" height="10" rx="2" fill="#171717" stroke="#a855f7" strokeWidth="1" />
        <text x="198" y="629" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Blacklist</text>

        <rect x="260" y="620" width="10" height="10" rx="2" fill="#171717" stroke="#f97316" strokeWidth="1" />
        <text x="278" y="629" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Volume</text>

        <rect x="340" y="620" width="10" height="10" rx="2" fill="#171717" stroke="#ef4444" strokeWidth="1" />
        <text x="358" y="629" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Guard</text>

        <text x="500" y="670" textAnchor="middle" fill="#525252" fontSize="10" fontFamily="ui-monospace, monospace">
          All workflows run inside Chainlink CRE (TEE) with Confidential HTTP
        </text>
      </svg>
    </div>
  )
}
