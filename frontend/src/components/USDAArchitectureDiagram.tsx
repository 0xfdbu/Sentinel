/**
 * USDA Architecture Diagram Component
 * 
 * Displays the 4-layer security architecture for USDA stablecoin minting:
 * 1. Sentinel Security (fraud/hack detection)
 * 2. ACE Compliance (blacklists, volume limits)
 * 3. Price Validation (3-source ETH/USD)
 * 4. Proof of Reserves (bank verification)
 */

export function USDAArchitectureDiagram() {
  return (
    <div className="relative overflow-x-auto">
      <svg viewBox="0 0 900 480" className="w-full min-w-[700px] h-auto">
        <defs>
          <marker id="arr-solid" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
          <marker id="arr-policy" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
          </marker>
          <marker id="arr-tee" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
          </marker>
          <marker id="arr-price" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#375bd2" />
          </marker>
        </defs>

        {/* Title */}
        <text x="450" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="ui-monospace, monospace">
          USDA STABLECOIN: 4-LAYER SECURITY ARCHITECTURE
        </text>
        
        {/* Subtitle */}
        <text x="450" y="42" textAnchor="middle" fill="#9ca3af" fontSize="7" fontFamily="ui-monospace, monospace">
          Sentinel (Security) → ACE (Compliance) → Price Validation → Proof of Reserves
        </text>

        {/* Layer Labels */}
        <text x="20" y="95" fill="#dc2626" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 20 95)">
          SENTINEL SECURITY
        </text>
        <text x="20" y="185" fill="#f97316" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 20 185)">
          ACE COMPLIANCE +
        </text>
        <text x="20" y="295" fill="#375bd2" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 20 295)">
          PRICE VALIDATION
        </text>
        <text x="20" y="425" fill="#06b6d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace" transform="rotate(-90 20 425)">
          PROOF OF RESERVES
        </text>

        {/* LAYER 1: Sentinel Security (Top) */}
        <rect x="35" y="60" width="830" height="70" rx="3" fill="#450a0a" stroke="#dc2626" strokeWidth="1" fillOpacity="0.15" />

        {/* User Deposit */}
        <rect x="50" y="80" width="100" height="40" rx="3" fill="#0a0a0a" stroke="#525252" strokeWidth="1.5" />
        <text x="100" y="97" textAnchor="middle" fill="#d4d4d4" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">User Deposit</text>
        <text x="100" y="110" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">0.01 ETH</text>
        
        {/* Arrow to Sentinel */}
        <line x1="150" y1="100" x2="180" y2="100" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#arr-solid)" />
        
        {/* Sentinel Security */}
        <rect x="185" y="70" width="160" height="50" rx="3" fill="#0a0a0a" stroke="#dc2626" strokeWidth="2" />
        <text x="265" y="88" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">🛡️ Sentinel Security</text>
        <text x="265" y="103" textAnchor="middle" fill="#fca5a5" fontSize="7" fontFamily="ui-monospace, monospace">Hack/Fraud Detection</text>
        <text x="265" y="113" textAnchor="middle" fill="#fca5a5" fontSize="7" fontFamily="ui-monospace, monospace">Manipulation Monitoring</text>
        
        {/* Arrow to ACE */}
        <line x1="345" y1="95" x2="375" y2="95" stroke="#f97316" strokeWidth="1.5" markerEnd="url(#arr-policy)" />
        
        {/* ACE Compliance */}
        <rect x="380" y="70" width="140" height="50" rx="3" fill="#0a0a0a" stroke="#f97316" strokeWidth="2" />
        <text x="450" y="88" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">⚖️ ACE Compliance</text>
        <text x="450" y="103" textAnchor="middle" fill="#fdba74" fontSize="7" fontFamily="ui-monospace, monospace">Blacklist / Volume Limits</text>
        <text x="450" y="113" textAnchor="middle" fill="#fdba74" fontSize="7" fontFamily="ui-monospace, monospace">Regulatory Check</text>
        
        {/* Arrow to Vault */}
        <line x1="520" y1="95" x2="550" y2="95" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-solid)" />
        
        {/* Sentinel Bank Vault */}
        <rect x="555" y="65" width="160" height="60" rx="3" fill="#0a0a0a" stroke="#06b6d4" strokeWidth="2" />
        <text x="635" y="85" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">Sentinel Bank Vault</text>
        <text x="635" y="100" textAnchor="middle" fill="#06b6d4" fontSize="8" fontFamily="ui-monospace, monospace">ETH Locked Pending PoR</text>
        <rect x="570" y="108" width="130" height="12" rx="2" fill="#083344" stroke="#06b6d4" strokeWidth="1" />
        <text x="635" y="117" textAnchor="middle" fill="#22d3ee" fontSize="7" fontFamily="ui-monospace, monospace">Status: AWAITING VERIFICATION</text>

        {/* LAYER 3: Multi-Source Price Validation */}
        <rect x="35" y="140" width="830" height="120" rx="3" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,2" fillOpacity="0.1" />
        
        <text x="450" y="160" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">
          LAYER 3: MULTI-SOURCE PRICE VALIDATION (3 Sources)
        </text>
        
        {/* Price Sources */}
        <rect x="120" y="175" width="90" height="60" rx="3" fill="#0a0a0a" stroke="#375bd2" strokeWidth="1.5" />
        <text x="165" y="195" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Coinbase</text>
        <text x="165" y="210" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="ui-monospace, monospace">Exchange</text>
        <text x="165" y="225" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ $1,915.27</text>
        
        <rect x="230" y="175" width="90" height="60" rx="3" fill="#0a0a0a" stroke="#375bd2" strokeWidth="1.5" />
        <text x="275" y="195" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Binance</text>
        <text x="275" y="210" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="ui-monospace, monospace">Exchange</text>
        <text x="275" y="225" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ $1,915.22</text>
        
        <rect x="340" y="175" width="90" height="60" rx="3" fill="#0a0a0a" stroke="#375bd2" strokeWidth="1.5" />
        <text x="385" y="195" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold" fontFamily="ui-monospace, monospace">Kraken</text>
        <text x="385" y="210" textAnchor="middle" fill="#93c5fd" fontSize="7" fontFamily="ui-monospace, monospace">Exchange</text>
        <text x="385" y="225" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ $1,915.38</text>
        
        {/* Consensus Box */}
        <rect x="480" y="170" width="140" height="70" rx="3" fill="#0a0a0a" stroke="#22c55e" strokeWidth="2" />
        <text x="550" y="190" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">Price Consensus</text>
        <text x="550" y="207" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="ui-monospace, monospace">Median: $1,915.27</text>
        <text x="550" y="222" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="ui-monospace, monospace">Deviation: 0.01%</text>
        
        {/* Arrow to result */}
        <line x1="620" y1="205" x2="660" y2="205" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-solid)" />
        
        {/* Result */}
        <rect x="665" y="185" width="110" height="50" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
        <text x="720" y="205" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="ui-monospace, monospace">✓ VALIDATED</text>
        <text x="720" y="223" textAnchor="middle" fill="#6ee7b7" fontSize="7" fontFamily="ui-monospace, monospace">All Sources OK</text>

        {/* LAYER 4: Proof of Reserves (Bottom) */}
        <rect x="35" y="270" width="830" height="200" rx="3" fill="#164e63" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,2" fillOpacity="0.1" />
        
        <text x="450" y="290" textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">
          LAYER 4: PROOF OF RESERVES - CONFIDENTIAL HTTP VERIFICATION
        </text>
        
        {/* PoR Verifier */}
        <rect x="80" y="310" width="180" height="130" rx="3" fill="#0a0a0a" stroke="#06b6d4" strokeWidth="2" />
        <text x="170" y="333" textAnchor="middle" fill="#22d3ee" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">PoR Verifier</text>
        <text x="170" y="348" textAnchor="middle" fill="#06b6d4" fontSize="7" fontFamily="ui-monospace, monospace">CRE Workflow with --broadcast</text>
        
        <rect x="95" y="360" width="150" height="65" rx="2" fill="#083344" stroke="#06b6d4" strokeWidth="1" />
        <text x="170" y="377" textAnchor="middle" fill="#22d3ee" fontSize="7" fontFamily="ui-monospace, monospace">🔐 TEE Protected</text>
        <text x="170" y="393" textAnchor="middle" fill="#22d3ee" fontSize="7" fontFamily="ui-monospace, monospace">Confidential HTTP</text>
        <text x="170" y="407" textAnchor="middle" fill="#22d3ee" fontSize="7" fontFamily="ui-monospace, monospace">API Key Never Exposed</text>
        <text x="170" y="420" textAnchor="middle" fill="#9ca3af" fontSize="6" fontFamily="ui-monospace, monospace">Calls: First Plaidypus Bank API</text>
        
        {/* Arrow to Bank API */}
        <line x1="260" y1="375" x2="300" y2="375" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arr-tee)" strokeDasharray="5,3" />
        <text x="280" y="365" textAnchor="middle" fill="#06b6d4" fontSize="7" fontFamily="ui-monospace, monospace">Verify</text>
        
        {/* Bank API */}
        <rect x="310" y="325" width="150" height="100" rx="3" fill="#0a0a0a" stroke="#10b981" strokeWidth="2" />
        <text x="385" y="350" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">🏦 First Plaidypus Bank</text>
        <text x="385" y="367" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="ui-monospace, monospace">Main Checking (****5820)</text>
        <rect x="325" y="380" width="120" height="35" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
        <text x="385" y="395" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="ui-monospace, monospace">$1,400.21</text>
        <text x="385" y="408" textAnchor="middle" fill="#6ee7b7" fontSize="7" fontFamily="ui-monospace, monospace">Available Balance</text>
        
        {/* Arrow back with result */}
        <line x1="385" y1="325" x2="385" y2="295" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-solid)" />
        <text x="405" y="310" textAnchor="start" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">✓ Sufficient Reserves (7011%)</text>
        
        {/* Final Decision */}
        <rect x="520" y="325" width="140" height="100" rx="3" fill="#0a0a0a" stroke="#f97316" strokeWidth="2" />
        <text x="590" y="350" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, monospace">Final Decision</text>
        <rect x="535" y="360" width="55" height="55" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
        <text x="562" y="385" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="bold" fontFamily="ui-monospace, monospace">✓</text>
        <text x="562" y="405" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontFamily="ui-monospace, monospace">MINT</text>
        
        <rect x="590" y="360" width="55" height="55" rx="2" fill="#450a0a" stroke="#dc2626" strokeWidth="1" />
        <text x="617" y="385" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold" fontFamily="ui-monospace, monospace">✕</text>
        <text x="617" y="405" textAnchor="middle" fill="#fca5a5" fontSize="8" fontFamily="ui-monospace, monospace">REFUND</text>
        
        {/* Arrow to USDA */}
        <line x1="660" y1="375" x2="700" y2="375" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-solid)" />
        
        {/* USDA Output */}
        <rect x="710" y="335" width="120" height="90" rx="3" fill="#0a0a0a" stroke="#22c55e" strokeWidth="2" />
        <text x="770" y="360" textAnchor="middle" fill="#86efac" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, monospace">USDA Minted</text>
        <text x="770" y="380" textAnchor="middle" fill="#4ade80" fontSize="10" fontFamily="ui-monospace, monospace">19.97 USDA</text>
        <text x="770" y="395" textAnchor="middle" fill="#4ade80" fontSize="8" fontFamily="ui-monospace, monospace">$19.97 Backed</text>
        <text x="770" y="410" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">by Bank Reserves</text>
      </svg>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500" />
          <span className="text-neutral-400">Sentinel Security <span className="text-red-400">(Fraud/Hack Detection)</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500" />
          <span className="text-neutral-400">ACE Compliance <span className="text-orange-400">(Blacklist/Volumes)</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
          <span className="text-neutral-400">Price Validation <span className="text-blue-400">(3 Sources)</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500" />
          <span className="text-neutral-400">PoR Verification <span className="text-cyan-400">(Bank Reserves)</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" />
          <span className="text-neutral-400">Success</span>
        </div>
      </div>
      
      {/* Architecture Note */}
      <div className="mt-4 p-3 rounded-lg bg-neutral-800/50 border border-white/10">
        <p className="text-xs text-neutral-400 text-center">
          <span className="text-white font-medium">4-Layer Defense in Depth:</span> Sentinel monitors for attacks, ACE enforces compliance, 
          Price Validation prevents oracle manipulation, PoR ensures 1:1 backing. 
          <span className="text-cyan-400">Each layer is essential - no single point of failure.</span>
        </p>
      </div>
    </div>
  );
}
