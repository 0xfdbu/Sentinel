import React from 'react'

export function BlacklistManagerDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 540" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-blk" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
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

        {/* ScamSniffer - ACTIVE */}
        <rect x="60" y="100" width="110" height="50" rx="4" fill="#171717" stroke="#a855f7" strokeWidth="1" />
        <text x="115" y="118" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">ScamSniffer</text>
        <text x="115" y="133" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">2,530 addresses</text>
        <text x="115" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">GitHub Database</text>

        {/* Sentinel Sanctions - ACTIVE */}
        <rect x="190" y="100" width="130" height="50" rx="4" fill="#171717" stroke="#ef4444" strokeWidth="1" />
        <text x="255" y="118" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Sentinel Sanctions</text>
        <text x="255" y="133" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">27 addresses</text>
        <text x="255" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Lazarus, Tornado Cash</text>

        {/* SmartContract ACE */}
        <rect x="340" y="100" width="110" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.5" />
        <text x="395" y="118" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">SmartContract ACE</text>
        <text x="395" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">2 addresses</text>
        <text x="395" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Custom blacklist</text>

        {/* GoPlus API - SKIPPED */}
        <rect x="470" y="100" width="100" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="520" y="118" textAnchor="middle" fill="#525252" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">GoPlus API</text>
        <text x="520" y="133" textAnchor="middle" fill="#404040" fontSize="8" fontFamily="ui-monospace, monospace">SlowMist+BlockSec</text>
        <text x="520" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">(skipped in demo)</text>

        <line x1="170" y1="125" x2="185" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk)" />
        <line x1="320" y1="125" x2="335" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk)" />
        <line x1="450" y1="125" x2="465" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk)" />

        <rect x="590" y="100" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="645" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 CRE TEE</text>
        <text x="645" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Combined sources</text>
        <text x="645" y="143" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">~2,559</text>

        <line x1="570" y1="125" x2="585" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk)" />
        <line x1="640" y1="150" x2="640" y2="165" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-blk-step)" />

        {/* Clarification */}
        <rect x="720" y="100" width="250" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="845" y="118" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">3 Active Sources (GoPlus skipped)</text>
        <text x="845" y="135" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">⚠️ NO Confidential HTTP used</text>
        <text x="845" y="150" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Regular HTTP with secrets.yaml</text>
        <text x="845" y="158" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">Demo: 10/batch • Full: 2,559 addresses</text>

        {/* === STEP 2: PROCESS === */}
        <rect x="60" y="175" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="190" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Process Data</text>

        <rect x="60" y="205" width="150" height="45" rx="4" fill="#171717" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.5" />
        <text x="135" y="222" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Merge & Deduplicate</text>
        <text x="135" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Normalize, sort, unique</text>

        <line x1="210" y1="227" x2="230" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-blk)" />

        <rect x="230" y="205" width="140" height="45" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="300" y="222" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">📊 Demo Sync Limit</text>
        <text x="300" y="237" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">10 Per Batch</text>

        <line x1="370" y1="227" x2="390" y2="227" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-blk-merge)" />

        <rect x="390" y="205" width="140" height="45" rx="4" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1.5" />
        <text x="460" y="222" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Unified Blacklist</text>
        <text x="460" y="237" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">10 addresses</text>

        <line x1="530" y1="227" x2="550" y2="227" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-blk-merge)" />

        <rect x="550" y="205" width="130" height="45" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="615" y="222" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">🔒 DON Sign</text>
        <text x="615" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Merkle root</text>

        <line x1="615" y1="250" x2="615" y2="265" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-blk-step)" />

        {/* Clarification */}
        <rect x="700" y="205" width="270" height="45" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="222" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Merkle tree for gas efficiency</text>
        <text x="835" y="238" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">Demo mode: 10 addresses per batch</text>

        {/* === STEP 3: ON-CHAIN UPDATE === */}
        <rect x="60" y="275" width="130" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="125" y="290" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">On-Chain Update</text>

        <rect x="60" y="305" width="160" height="55" rx="4" fill="#171717" stroke="#f97316" strokeWidth="1.5" />
        <text x="140" y="325" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">PolicyEngine</text>
        <text x="140" y="342" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">0x62CC...6B16</text>
        <text x="140" y="355" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">batchUpdateBlacklist()</text>

        <line x1="220" y1="332" x2="240" y2="332" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-blk-ok)" />

        <rect x="240" y="305" width="140" height="55" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="310" y="325" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">ACE Policies</text>
        <text x="310" y="342" textAnchor="middle" fill="#4ade80" fontSize="9" fontFamily="ui-monospace, monospace">10 active</text>
        <text x="310" y="355" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Per execution</text>

        <line x1="380" y1="332" x2="400" y2="332" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-blk-ok)" />

        <rect x="400" y="305" width="140" height="55" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="470" y="325" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">MintingConsumer</text>
        <text x="470" y="342" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Checks on mint</text>
        <text x="470" y="355" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">Blocks bad actors</text>

        <line x1="540" y1="332" x2="560" y2="332" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-blk-ok)" />

        <rect x="560" y="305" width="120" height="55" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="620" y="332" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ Protected</text>

        <line x1="620" y1="360" x2="620" y2="375" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-blk-step)" />

        {/* Clarification */}
        <rect x="700" y="305" width="270" height="55" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="325" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">DON-signed broadcast to contract</text>
        <text x="835" y="340" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">All mints checked against blacklist</text>
        <text x="835" y="355" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">Full batch: 2,559 addresses</text>

        {/* === STEP 4: COMPLETION === */}
        <rect x="60" y="375" width="100" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="110" y="390" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Sync Status</text>

        <rect x="60" y="405" width="130" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="125" y="425" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">✓ Synced</text>
        <text x="125" y="442" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Daily at 00:00 UTC</text>

        <rect x="210" y="405" width="200" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="310" y="425" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Last Update</text>
        <text x="310" y="442" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Merkle: 0xe2ea...c243</text>

        {/* Trigger */}
        <rect x="850" y="405" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="910" y="425" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">TRIGGER</text>
        <text x="910" y="442" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Daily / HTTP</text>

        {/* Bottom info */}
        <text x="500" y="505" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">
          ✅ 3 Sources → Merge → Demo Limit (10) → Merkle → DON Sign → Broadcast → ACE
        </text>
        <text x="500" y="520" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">
          ⚠️ NO Confidential HTTP • Regular HTTP + secrets.yaml • GoPlus skipped in demo
        </text>

        {/* Legend */}
        <rect x="60" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#a855f7" strokeWidth="1" />
        <text x="78" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">ScamSniffer</text>

        <rect x="145" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#ef4444" strokeWidth="1" />
        <text x="163" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sanctions</text>

        <rect x="230" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.5" />
        <text x="248" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sentinel ACE</text>

        <rect x="330" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="348" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">GoPlus (skipped)</text>

        <rect x="450" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1" />
        <text x="468" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Demo Limit</text>
      </svg>
    </div>
  );
}
