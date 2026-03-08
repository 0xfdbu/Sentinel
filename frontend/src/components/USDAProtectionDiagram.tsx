import React from 'react'

export function USDAProtectionDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 900 500" className="w-full min-w-[700px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-prot" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-prot-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <linearGradient id="usdaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* USDA Token - Center */}
        <circle cx="450" cy="250" r="80" fill="url(#usdaGrad)" stroke="#10b981" strokeWidth="2" />
        <text x="450" y="245" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="bold" fontFamily="ui-monospace, monospace">USDA</text>
        <text x="450" y="265" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="ui-monospace, monospace">Protected</text>

        {/* Workflow 1: PoR Mint - Top */}
        <g transform="translate(380, 50)">
          <rect x="0" y="0" width="140" height="70" rx="12" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
          <text x="70" y="25" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">PoR Mint</text>
          <text x="70" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">Bank reserves</text>
          <text x="70" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">verified</text>
        </g>
        <line x1="450" y1="170" x2="450" y2="120" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arr-prot-ok)" />

        {/* Workflow 2: AML & Scam Freeze - Right */}
        <g transform="translate(720, 180)">
          <rect x="0" y="0" width="150" height="70" rx="12" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="75" y="25" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">AML & Freeze</text>
          <text x="75" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">Suspicious</text>
          <text x="75" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">addresses frozen</text>
        </g>
        <line x1="570" y1="230" x2="720" y2="215" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr-prot)" />

        {/* Workflow 3: Blacklist - Bottom Right */}
        <g transform="translate(620, 380)">
          <rect x="0" y="0" width="140" height="70" rx="12" fill="#581c87" stroke="#a855f7" strokeWidth="1.5" />
          <text x="70" y="25" textAnchor="middle" fill="#c084fc" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">Blacklist</text>
          <text x="70" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">2,500+ scams</text>
          <text x="70" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">blocked</text>
        </g>
        <line x1="510" y1="310" x2="650" y2="380" stroke="#a855f7" strokeWidth="1.5" markerEnd="url(#arr-prot)" />

        {/* Workflow 4: Volume Guard - Bottom Left */}
        <g transform="translate(140, 380)">
          <rect x="0" y="0" width="140" height="70" rx="12" fill="#7c2d12" stroke="#f97316" strokeWidth="1.5" />
          <text x="70" y="25" textAnchor="middle" fill="#fdba74" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">Volume Guard</text>
          <text x="70" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">Dynamic limits</text>
          <text x="70" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">by reserves</text>
        </g>
        <line x1="390" y1="310" x2="250" y2="380" stroke="#f97316" strokeWidth="1.5" markerEnd="url(#arr-prot)" />

        {/* Workflow 5: Sentinel Guard - Left */}
        <g transform="translate(30, 180)">
          <rect x="0" y="0" width="140" height="70" rx="12" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
          <text x="70" y="25" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">Sentinel Guard</text>
          <text x="70" y="42" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">Emergency</text>
          <text x="70" y="55" textAnchor="middle" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace, monospace">pause on attack</text>
        </g>
        <line x1="330" y1="230" x2="170" y2="215" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arr-prot)" />

        {/* Legend */}
        <text x="450" y="480" textAnchor="middle" fill="#525252" fontSize="10" fontFamily="ui-monospace, monospace">
          5 Workflows → 1 Protected Stablecoin
        </text>
      </svg>
    </div>
  )
}
