export function BlacklistManagerDiagram() {
  return (
    <div className="w-full overflow-x-auto py-6" style={{ minHeight: '480px' }}>
      <svg viewBox="0 0 1000 540" className="w-full min-w-[900px]" style={{ height: 'auto', minHeight: '460px' }}>
        <defs>
          <marker id="arr-blk-min" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-blk-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-blk-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
          <marker id="arr-blk-merge" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          Blacklist Manager
        </text>
        <text x="500" y="50" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          workflows/blacklist-manager
        </text>

        {/* === STEP 1: FETCH SOURCES === */}
        <rect x="60" y="70" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="85" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Fetch Sources</text>

        <rect x="60" y="100" width="150" height="50" rx="4" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="135" y="118" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">OFAC Treasury</text>
        <text x="135" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">api.treasury.gov</text>
        <text x="135" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Sanctions list</text>

        <rect x="230" y="100" width="150" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="305" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Sentinel DB</text>
        <text x="305" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Custom blacklists</text>
        <text x="305" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Known scams</text>

        <rect x="400" y="100" width="150" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="475" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Chainalysis</text>
        <text x="475" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Additional sources</text>
        <text x="475" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Risk intel</text>

        <line x1="210" y1="125" x2="225" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk-min)" />
        <line x1="380" y1="125" x2="395" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk-min)" />

        <rect x="570" y="100" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="630" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 TEE</text>
        <text x="630" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Fetch & merge</text>
        <text x="630" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">~50K addresses</text>

        <line x1="550" y1="125" x2="565" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk-min)" />
        <line x1="630" y1="150" x2="630" y2="165" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-blk-step)" />

        {/* Clarification */}
        <rect x="720" y="100" width="230" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="118" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Multi-source blacklist fetch</text>
        <text x="835" y="132" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">OFAC + Custom + 3rd party</text>
        <text x="835" y="145" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Daily schedule</text>

        {/* === STEP 2: PROCESS === */}
        <rect x="60" y="175" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="190" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Process Data</text>

        <rect x="60" y="205" width="180" height="45" rx="4" fill="#171717" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.5" />
        <text x="150" y="222" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Merge & Deduplicate</text>
        <text x="150" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Normalize, sort, unique</text>

        <line x1="240" y1="227" x2="260" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk-min)" />

        <rect x="260" y="205" width="160" height="45" rx="4" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1.5" />
        <text x="340" y="222" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Unified Blacklist</text>
        <text x="340" y="237" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">42,847 addresses</text>

        <line x1="420" y1="227" x2="440" y2="227" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-blk-merge)" />

        <rect x="440" y="205" width="140" height="45" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="510" y="222" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 TEE Sign</text>
        <text x="510" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Merkle root</text>

        <line x1="510" y1="250" x2="510" y2="265" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-blk-step)" />

        {/* Clarification */}
        <rect x="720" y="205" width="230" height="45" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="222" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Merkle tree for gas efficiency</text>
        <text x="835" y="238" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">DON attestation</text>

        {/* === STEP 3: ON-CHAIN UPDATE === */}
        <rect x="60" y="275" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="130" y="290" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">On-Chain Update</text>

        <rect x="60" y="305" width="160" height="65" rx="4" fill="#171717" stroke="#f97316" strokeWidth="1.5" />
        <text x="140" y="325" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">PolicyEngine</text>
        <text x="140" y="342" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">0x62CC...6B16</text>
        <text x="140" y="358" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">batchUpdateBlacklist()</text>

        <line x1="220" y1="337" x2="240" y2="337" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-blk-ok)" />

        <rect x="240" y="305" width="160" height="65" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="320" y="325" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">ACE Policies</text>
        <text x="320" y="342" textAnchor="middle" fill="#4ade80" fontSize="9" fontFamily="ui-monospace, monospace">42,847 active</text>
        <text x="320" y="358" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Blacklist enforced</text>

        <line x1="400" y1="337" x2="420" y2="337" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-blk-ok)" />

        <rect x="420" y="305" width="160" height="65" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="500" y="325" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">MintingConsumer</text>
        <text x="500" y="342" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Checks on mint</text>
        <text x="500" y="358" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Blocks bad actors</text>

        <line x1="580" y1="337" x2="600" y2="337" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-blk-ok)" />

        <rect x="600" y="305" width="120" height="65" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="660" y="332" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ Protected</text>
        <text x="660" y="352" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">USDA transfers</text>
        <text x="660" y="365" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Secure</text>

        <line x1="510" y1="370" x2="510" y2="385" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-blk-step)" />

        {/* Clarification box */}
        <rect x="740" y="305" width="220" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="850" y="325" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Batch updates via Merkle root</text>
        <text x="850" y="340" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">All mints checked against blacklist</text>
        <text x="850" y="355" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Gas efficient verification</text>

        {/* === STEP 4: COMPLETION === */}
        <rect x="60" y="400" width="100" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="110" y="415" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Sync Status</text>

        <rect x="60" y="430" width="140" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="130" y="448" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">✓ Synced</text>
        <text x="130" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Daily at 00:00 UTC</text>

        <rect x="220" y="430" width="200" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="320" y="448" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Last Update</text>
        <text x="320" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Merkle: 0x7a3f...9e2d</text>

        {/* Trigger */}
        <rect x="850" y="430" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="905" y="448" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">TRIGGER</text>
        <text x="905" y="462" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Daily Schedule</text>
        <text x="905" y="474" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">or Admin API</text>

        <line x1="850" y1="455" x2="140" y2="350" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-blk-min)" />

        {/* Bottom info */}
        <text x="500" y="510" textAnchor="middle" fill="#404040" fontSize="9" fontFamily="ui-monospace, monospace">
          3 Sources → Merge → Merkle → On-Chain • Daily sync
        </text>

        {/* Legend */}
        <rect x="60" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="78" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Gov API</text>

        <rect x="130" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="148" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Public API</text>

        <rect x="210" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#a855f7" strokeWidth="1" />
        <text x="228" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Processing</text>

        <rect x="290" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#f97316" strokeWidth="1" />
        <text x="308" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">PolicyEngine</text>

        <rect x="380" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="398" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Success</text>

        <rect x="450" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="468" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Info</text>
      </svg>
    </div>
  );
}
