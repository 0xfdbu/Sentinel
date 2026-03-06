export function EthPorUnifiedDiagram() {
  return (
    <div className="w-full overflow-x-auto py-6" style={{ minHeight: '480px' }}>
      <svg viewBox="0 0 1000 540" className="w-full min-w-[900px]" style={{ height: 'auto', minHeight: '460px' }}>
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
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          ETH + PoR Unified Mint
        </text>
        <text x="500" y="50" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          workflows/eth-por-unified
        </text>

        {/* === STEP 1: PRICE FEEDS === */}
        <rect x="60" y="70" width="110" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="115" y="85" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Price Aggregation</text>

        <rect x="60" y="100" width="110" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="115" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Coinbase</text>
        <text x="115" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,973.28</text>
        <text x="115" y="143" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">+0.12%</text>

        <rect x="190" y="100" width="110" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="245" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Kraken</text>
        <text x="245" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,974.22</text>
        <text x="245" y="143" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">+0.15%</text>

        <rect x="320" y="100" width="110" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="375" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Binance</text>
        <text x="375" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,973.98</text>
        <text x="375" y="143" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">+0.14%</text>

        <rect x="450" y="100" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#404040" strokeWidth="1" />
        <text x="510" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">Median</text>
        <text x="510" y="135" textAnchor="middle" fill="#e5e5e5" fontSize="13" fontWeight="500" fontFamily="ui-monospace, monospace">$1,973.98</text>
        <text x="510" y="145" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">dev 7 bps</text>

        <rect x="590" y="100" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="650" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">0.001 ETH</text>
        <text x="650" y="135" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="500" fontFamily="ui-monospace, monospace">1.973 USDA</text>

        <line x1="170" y1="125" x2="185" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="300" y1="125" x2="315" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="430" y1="125" x2="445" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="570" y1="125" x2="585" y2="125" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-ok)" />

        <line x1="650" y1="150" x2="650" y2="165" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-step)" />

        {/* Clarification */}
        <rect x="720" y="100" width="230" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="118" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">3 exchanges aggregated</text>
        <text x="835" y="132" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Deviation &lt; 100 bps</text>
        <text x="835" y="145" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">1:1 ETH-USDA</text>

        {/* === STEP 2: COMPLIANCE === */}
        <rect x="60" y="175" width="130" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="125" y="190" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Compliance Checks</text>

        <rect x="60" y="205" width="150" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="135" y="222" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">ScamSniffer</text>
        <text x="135" y="237" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ Clean (2,530)</text>

        <rect x="230" y="205" width="150" height="53" rx="4" fill="#171717" stroke="#f59e0b" strokeWidth="1" />
        <text x="305" y="222" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 Proof of Reserve</text>
        <text x="305" y="237" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">✓ $1,800 &gt; $1.97</text>
        <text x="305" y="250" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="ui-monospace, monospace">{'{{.porApiUrl}}'}</text>

        <rect x="400" y="205" width="120" height="45" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="460" y="222" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 TEE</text>
        <text x="460" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">DON sign</text>

        <line x1="210" y1="227" x2="225" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />
        <line x1="380" y1="227" x2="395" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-min)" />

        <line x1="460" y1="250" x2="460" y2="265" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-step)" />

        {/* Clarification */}
        <rect x="540" y="205" width="240" height="53" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="660" y="220" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">🔒 Confidential HTTP (vault secrets)</text>
        <text x="660" y="233" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">PoR: {'{{.porApiUrl}}'} + {'{{.porApiToken}}'}</text>
        <text x="660" y="246" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">LLM: {'{{.xaiApiKey}}'} + {'{{.xaiModel}}'}</text>

        {/* === STEP 3: LLM DECISION === */}
        <rect x="60" y="275" width="140" height="22" rx="11" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="130" y="290" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 LLM Final Review</text>

        <rect x="60" y="305" width="320" height="65" rx="4" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1.5" />
        <text x="220" y="325" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 xAI Grok Analysis</text>
        <text x="220" y="342" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">🔒 Confidential HTTP → api.x.ai</text>
        <text x="220" y="358" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">{'{{.xaiApiKey}}'} • {'{{.xaiModel}}'} • TEE</text>

        <line x1="380" y1="337" x2="400" y2="337" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-llm)" />

        {/* LLM Decision */}
        <rect x="400" y="305" width="140" height="65" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="470" y="330" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ APPROVED</text>
        <text x="470" y="348" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Risk: LOW</text>
        <text x="470" y="362" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Confidence: 94%</text>

        <line x1="540" y1="337" x2="560" y2="337" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-ok)" />

        <line x1="470" y1="370" x2="470" y2="385" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-step)" />

        {/* Clarification box for LLM */}
        <rect x="560" y="305" width="220" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="670" y="325" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Provides reasoning + confidence</text>
        <text x="670" y="340" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Reviews all checks holistically</text>
        <text x="670" y="355" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Can override if anomalies detected</text>

        {/* === STEP 4: MINT === */}
        <rect x="60" y="400" width="100" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="110" y="415" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Mint Execution</text>

        <rect x="60" y="430" width="120" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="120" y="448" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">MintingConsumer</text>
        <text x="120" y="463" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">writeReport()</text>

        <rect x="200" y="430" width="100" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="250" y="448" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">USDA</text>
        <text x="250" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">1.973 minted</text>

        <line x1="180" y1="452" x2="195" y2="452" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-ok)" />

        {/* === STEP 5: ACE === */}
        <rect x="330" y="400" width="140" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="400" y="415" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">On-Chain ACE</text>

        <rect x="330" y="430" width="240" height="45" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" />
        <text x="450" y="448" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">PolicyProtected.check()</text>
        <text x="450" y="463" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">@chainlink-ace/policy-management/core/PolicyProtected.sol</text>

        <rect x="590" y="430" width="80" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="630" y="455" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">✓ Pass</text>

        <line x1="570" y1="452" x2="585" y2="452" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-ok)" />

        {/* Bottom info */}
        <text x="500" y="510" textAnchor="middle" fill="#404040" fontSize="9" fontFamily="ui-monospace, monospace">
          4 Public APIs + 2 Confidential HTTP • ~8s • Price + Compliance + LLM + Mint + ACE
        </text>

        {/* Legend */}
        <rect x="60" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="78" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Public API</text>

        <rect x="130" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#f59e0b" strokeWidth="1" />
        <text x="148" y="529" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">Confidential HTTP</text>

        <rect x="250" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1" />
        <text x="268" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">LLM</text>

        <rect x="300" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="318" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Success</text>

        <rect x="360" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="378" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Info</text>
      </svg>
    </div>
  );
}
