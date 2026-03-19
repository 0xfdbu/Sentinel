import React from 'react'

export function EthPorUnifiedDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 620" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-min" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
          <marker id="arr-llm" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="25" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          USDA + PoR Unified Mint
        </text>
        <text x="500" y="42" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">
          ⚠️ Blacklist check: workflow-level only (not ACE smart contract)
        </text>

        {/* HTTP Budget Badge */}
        <rect x="850" y="15" width="120" height="28" rx="14" fill="#171717" stroke="#f59e0b" strokeWidth="1" />
        <text x="910" y="33" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">HTTP: 5/5 Used</text>

        {/* === STEP 1: PRICE FEEDS === */}
        <rect x="60" y="60" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="75" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Price Aggregation</text>

        <rect x="60" y="90" width="110" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="115" y="108" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Coinbase</text>
        <text x="115" y="123" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,973.28</text>
        <text x="115" y="133" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">HTTP #1 ✓</text>

        {/* Kraken - SKIPPED in sim */}
        <rect x="190" y="90" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="245" y="108" textAnchor="middle" fill="#525252" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Kraken</text>
        <text x="245" y="123" textAnchor="middle" fill="#404040" fontSize="8" fontFamily="ui-monospace, monospace">$1,974.22</text>
        <text x="245" y="133" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">(prod only)</text>

        <rect x="320" y="90" width="110" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="375" y="108" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Binance</text>
        <text x="375" y="123" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,973.98</text>
        <text x="375" y="133" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">HTTP #2 ✓</text>

        <rect x="450" y="90" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
        <text x="510" y="108" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">Median</text>
        <text x="510" y="125" textAnchor="middle" fill="#e5e5e5" fontSize="13" fontWeight="500" fontFamily="ui-monospace, monospace">$1,973.98</text>
        <text x="510" y="135" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">dev 7 bps</text>

        <rect x="590" y="90" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="650" y="108" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">0.001 ETH</text>
        <text x="650" y="125" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="500" fontFamily="ui-monospace, monospace">1.973 USDA</text>

        <line x1="170" y1="115" x2="185" y2="115" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="300" y1="115" x2="315" y2="115" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="430" y1="115" x2="445" y2="115" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="570" y1="115" x2="585" y2="115" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-ok)" />

        <line x1="650" y1="140" x2="650" y2="155" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-step)" />

        {/* Clarification */}
        <rect x="720" y="90" width="250" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="845" y="108" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">2 of 3 exchanges (sim limit)</text>
        <text x="845" y="122" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Deviation &lt; 100 bps</text>
        <text x="845" y="135" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">1:1 ETH-USDA mint ratio</text>

        {/* === STEP 2: SECURITY CHECKS === */}
        <rect x="60" y="165" width="160" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="140" y="180" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Security + Compliance (5 Sources)</text>

        {/* Row 1 of security checks */}
        {/* ScamSniffer - SKIPPED in sim */}
        <rect x="60" y="195" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="115" y="212" textAnchor="middle" fill="#525252" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">ScamSniffer</text>
        <text x="115" y="227" textAnchor="middle" fill="#404040" fontSize="8" fontFamily="ui-monospace, monospace">~2,500 addr</text>
        <text x="115" y="239" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">(prod only)</text>

        {/* GoPlus - ACTIVE in sim */}
        <rect x="190" y="195" width="130" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="255" y="212" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">GoPlus MultiSource</text>
        <text x="255" y="227" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Low Risk</text>
        <text x="255" y="239" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">HTTP #3 ✓</text>

        {/* Sanctions - SKIPPED in sim */}
        <rect x="340" y="195" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="400" y="212" textAnchor="middle" fill="#525252" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Sanctions</text>
        <text x="400" y="227" textAnchor="middle" fill="#404040" fontSize="8" fontFamily="ui-monospace, monospace">OFAC/Lazarus</text>
        <text x="400" y="239" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">(prod only)</text>

        {/* Row 2: PoR and TEE */}
        <rect x="60" y="255" width="200" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="160" y="272" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 Proof of Reserve</text>
        <text x="160" y="287" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ $1,800 &gt; $1.97</text>
        <text x="160" y="297" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">HTTP #4 ✓</text>

        <rect x="280" y="255" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="340" y="272" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 TEE</text>
        <text x="340" y="287" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">DON sign</text>

        <line x1="170" y1="220" x2="190" y2="220" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="320" y1="220" x2="340" y2="220" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="260" y1="280" x2="280" y2="280" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />

        <line x1="340" y1="305" x2="340" y2="320" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-step)" />

        {/* Clarification */}
        <rect x="500" y="195" width="280" height="110" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="640" y="212" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="500" fontFamily="ui-monospace, monospace">⚠️ Blacklist: workflow check only (GoPlus)</text>
        <text x="640" y="230" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">GoPlus: Multi-source (SlowMist + ScamSniffer)</text>
        <text x="640" y="245" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Bank API: Hardcoded in secrets.yaml</text>
        <text x="640" y="260" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">xAI LLM: Hardcoded API key</text>
        <text x="640" y="278" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">⚠ Simulation Limit: 5 HTTP calls max</text>
        <text x="640" y="293" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Skipped in sim: Kraken, ScamSniffer, Sanctions</text>

        {/* === STEP 3: LLM DECISION === */}
        <rect x="60" y="330" width="140" height="22" rx="11" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="130" y="345" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 LLM Final Review</text>

        <rect x="60" y="360" width="320" height="70" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1.5" />
        <text x="220" y="382" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 xAI Grok Analysis</text>
        <text x="220" y="402" textAnchor="middle" fill="#a3a3a3" fontSize="8" fontFamily="ui-monospace, monospace">Regular HTTP → api.x.ai</text>
        <text x="220" y="418" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">HTTP #5 ✓</text>
        <text x="220" y="430" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Hardcoded key • secrets.yaml • TEE</text>

        <line x1="380" y1="395" x2="400" y2="395" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-llm)" />

        {/* LLM Decision */}
        <rect x="400" y="360" width="140" height="70" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="470" y="388" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ APPROVED</text>
        <text x="470" y="408" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Risk: LOW</text>
        <text x="470" y="423" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Confidence: 94%</text>

        <line x1="540" y1="395" x2="560" y2="395" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-ok)" />

        <line x1="470" y1="430" x2="470" y2="448" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-step)" />

        {/* Clarification box for LLM */}
        <rect x="560" y="360" width="220" height="70" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="670" y="383" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Provides reasoning + confidence</text>
        <text x="670" y="400" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Reviews all checks holistically</text>
        <text x="670" y="417" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Can override if anomalies detected</text>

        {/* === STEP 4: MINT === */}
        <rect x="60" y="458" width="100" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="110" y="473" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Mint Execution</text>

        <rect x="60" y="488" width="130" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="125" y="505" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">SentinelVault</text>
        <text x="125" y="520" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">ETHDeposited()</text>
        <text x="125" y="530" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">→ Event Listener</text>

        <rect x="210" y="488" width="130" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="275" y="505" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Event Listener</text>
        <text x="275" y="520" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Auto CLI Trigger</text>
        <text x="275" y="530" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">→ CRE Workflow</text>

        <line x1="190" y1="513" x2="205" y2="513" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="340" y1="513" x2="355" y2="513" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-ok)" />

        {/* === STEP 5: ACE === */}
        <rect x="360" y="458" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="430" y="473" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">On-Chain ACE</text>

        <rect x="360" y="488" width="220" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" />
        <text x="470" y="508" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">PolicyProtected.check()</text>
        <text x="470" y="525" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">@chainlink-ace/policy-management/core/PolicyProtected.sol</text>

        <rect x="600" y="488" width="80" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="640" y="513" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ Pass</text>

        <line x1="580" y1="513" x2="595" y2="513" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-ok)" />

        {/* Bottom info */}
        <text x="500" y="565" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">
          ✅ Custom Event Listener watches Vault events → Auto-executes CLI (simulates production DON behavior)
        </text>
        <text x="500" y="582" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">
          ⚠️ Blacklist: workflow-level only (not on-chain ACE) • Regular HTTP + secrets.yaml • ~8s execution
        </text>
        <text x="500" y="598" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">
          2 Price Feeds + GoPlus + Bank API + xAI (5 HTTP) • Price + Security Checks (not enforced) + LLM + Mint
        </text>

        {/* Legend */}
        <rect x="60" y="598" width="10" height="10" rx="2" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="78" y="607" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Public API</text>

        <rect x="135" y="598" width="10" height="10" rx="2" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="153" y="607" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">Active (Sim)</text>

        <rect x="225" y="598" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="243" y="607" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Skipped (Sim)</text>

        <rect x="330" y="598" width="10" height="10" rx="2" fill="#171717" stroke="#f59e0b" strokeWidth="1" />
        <text x="348" y="607" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">Regular HTTP + secrets.yaml</text>

        <rect x="450" y="598" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1" />
        <text x="468" y="607" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">LLM</text>
      </svg>
    </div>
  );
}
