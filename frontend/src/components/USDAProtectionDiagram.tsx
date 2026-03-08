import React from 'react'

export function USDAProtectionDiagram() {
  return (
    <div className="w-full overflow-x-auto py-8">
      <svg viewBox="0 0 1000 600" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <linearGradient id="grad-por" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="grad-aml" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="grad-blacklist" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
          <linearGradient id="grad-volume" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="grad-guard" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="grad-usda" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background Grid */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#262626" strokeWidth="0.5" opacity="0.3"/>
        </pattern>
        <rect width="1000" height="600" fill="url(#grid)" />

        {/* Title */}
        <text x="500" y="35" textAnchor="middle" fill="#e5e5e5" fontSize="18" fontWeight="600" fontFamily="system-ui, sans-serif">
          USDA Protection Network
        </text>
        <text x="500" y="55" textAnchor="middle" fill="#737373" fontSize="12" fontFamily="system-ui, sans-serif">
          Five autonomous workflows safeguard every transaction
        </text>

        {/* === CENTER USDA TOKEN === */}
        <g transform="translate(425, 240)">
          {/* Glow effect */}
          <circle cx="75" cy="60" r="70" fill="url(#grad-usda)" opacity="0.15" filter="url(#glow)" />
          {/* Main circle */}
          <circle cx="75" cy="60" r="60" fill="#0a0a0a" stroke="url(#grad-usda)" strokeWidth="2" />
          <text x="75" y="55" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700" fontFamily="system-ui, sans-serif">USDA</text>
          <text x="75" y="75" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="system-ui, sans-serif">Protected</text>
        </g>

        {/* === WORKFLOW 1: PoR MINT (TOP) === */}
        <g transform="translate(400, 90)">
          <rect x="0" y="0" width="200" height="90" rx="12" fill="#0a0a0a" stroke="url(#grad-por)" strokeWidth="1.5" />
          {/* Icon circle */}
          <circle cx="30" cy="30" r="12" fill="#064e3b" />
          <text x="30" y="34" textAnchor="middle" fill="#34d399" fontSize="12">🏦</text>
          {/* Content */}
          <text x="100" y="28" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">Proof of Reserve Mint</text>
          <text x="100" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="system-ui, sans-serif">$1.8M bank reserves verified</text>
          <text x="100" y="65" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="system-ui, sans-serif">No mint without collateral</text>
          {/* Badge */}
          <rect x="160" y="8" width="32" height="16" rx="8" fill="#059669" />
          <text x="176" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">01</text>
        </g>
        {/* Connection line */}
        <line x1="500" y1="180" x2="500" y2="210" stroke="#059669" strokeWidth="2" strokeDasharray="4,2" />

        {/* === WORKFLOW 2: AML & FREEZE (RIGHT) === */}
        <g transform="translate(760, 215)">
          <rect x="0" y="0" width="200" height="90" rx="12" fill="#0a0a0a" stroke="url(#grad-aml)" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="12" fill="#1e3a8a" />
          <text x="30" y="34" textAnchor="middle" fill="#60a5fa" fontSize="12">🧊</text>
          <text x="100" y="28" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">AML & Scam Freeze</text>
          <text x="100" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="system-ui, sans-serif">AI-powered address screening</text>
          <text x="100" y="65" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="system-ui, sans-serif">Auto-freeze on threat detection</text>
          <rect x="8" y="8" width="32" height="16" rx="8" fill="#2563eb" />
          <text x="24" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">02</text>
        </g>
        <line x1="760" y1="260" x2="560" y2="285" stroke="#2563eb" strokeWidth="2" strokeDasharray="4,2" />

        {/* === WORKFLOW 3: BLACKLIST (BOTTOM RIGHT) === */}
        <g transform="translate(620, 420)">
          <rect x="0" y="0" width="200" height="90" rx="12" fill="#0a0a0a" stroke="url(#grad-blacklist)" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="12" fill="#581c87" />
          <text x="30" y="34" textAnchor="middle" fill="#c084fc" fontSize="12">🚫</text>
          <text x="100" y="28" textAnchor="middle" fill="#c084fc" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">Blacklist Manager</text>
          <text x="100" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="system-ui, sans-serif">2,557 scam addresses blocked</text>
          <text x="100" y="65" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="system-ui, sans-serif">Daily sync from 3 sources</text>
          <rect x="8" y="8" width="32" height="16" rx="8" fill="#7c3aed" />
          <text x="24" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">03</text>
        </g>
        <line x1="620" y1="440" x2="530" y2="340" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4,2" />

        {/* === WORKFLOW 4: VOLUME GUARD (BOTTOM LEFT) === */}
        <g transform="translate(180, 420)">
          <rect x="0" y="0" width="200" height="90" rx="12" fill="#0a0a0a" stroke="url(#grad-volume)" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="12" fill="#7c2d12" />
          <text x="30" y="34" textAnchor="middle" fill="#fdba74" fontSize="12">📊</text>
          <text x="100" y="28" textAnchor="middle" fill="#fdba74" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">Volume Guard</text>
          <text x="100" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="system-ui, sans-serif">Dynamic limits: 400 USDA/day</text>
          <text x="100" y="65" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="system-ui, sans-serif">Auto-adjusts by reserve ratio</text>
          <rect x="8" y="8" width="32" height="16" rx="8" fill="#ea580c" />
          <text x="24" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">04</text>
        </g>
        <line x1="380" y1="465" x2="470" y2="340" stroke="#ea580c" strokeWidth="2" strokeDasharray="4,2" />

        {/* === WORKFLOW 5: SENTINEL GUARD (LEFT) === */}
        <g transform="translate(40, 215)">
          <rect x="0" y="0" width="200" height="90" rx="12" fill="#0a0a0a" stroke="url(#grad-guard)" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="12" fill="#7f1d1d" />
          <text x="30" y="34" textAnchor="middle" fill="#fca5a5" fontSize="12">🛡️</text>
          <text x="100" y="28" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">Sentinel Guard</text>
          <text x="100" y="48" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="system-ui, sans-serif">Emergency pause on attacks</text>
          <text x="100" y="65" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="system-ui, sans-serif">Flash loan & exploit detection</text>
          <rect x="8" y="8" width="32" height="16" rx="8" fill="#dc2626" />
          <text x="24" y="19" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">05</text>
        </g>
        <line x1="240" y1="260" x2="440" y2="285" stroke="#dc2626" strokeWidth="2" strokeDasharray="4,2" />

        {/* Bottom Stats */}
        <g transform="translate(250, 540)">
          {[
            { label: 'Bank Reserves', value: '$1.8M', color: '#10b981' },
            { label: 'Blocked Scams', value: '2,557', color: '#8b5cf6' },
            { label: 'Uptime', value: '99.9%', color: '#3b82f6' },
          ].map((stat, i) => (
            <g key={stat.label} transform={`translate(${i * 170}, 0)`}>
              <text x="60" y="15" textAnchor="middle" fill={stat.color} fontSize="20" fontWeight="700" fontFamily="system-ui, sans-serif">{stat.value}</text>
              <text x="60" y="32" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="system-ui, sans-serif">{stat.label}</text>
            </g>
          ))}
        </g>

        {/* Footer */}
        <text x="500" y="585" textAnchor="middle" fill="#525252" fontSize="10" fontFamily="system-ui, sans-serif">
          All workflows execute inside Chainlink CRE Trusted Execution Environment
        </text>
      </svg>
    </div>
  )
}
