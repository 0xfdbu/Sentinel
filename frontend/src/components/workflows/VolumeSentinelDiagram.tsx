import React from 'react'

export function VolumeSentinelDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 540" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
        <defs>
          <marker id="arr-vol-min" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#525252" />
          </marker>
          <marker id="arr-vol-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
          </marker>
          <marker id="arr-vol-step" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#404040" />
          </marker>
          <marker id="arr-vol-llm" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          Volume Sentinel
        </text>
        <text x="500" y="50" textAnchor="middle" fill="#525252" fontSize="11" fontFamily="ui-monospace, monospace">
          workflows/volume-sentinel
        </text>

        {/* === STEP 1: NEWS DATA === */}
        <rect x="60" y="70" width="100" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="110" y="85" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Market News</text>

        <rect x="60" y="100" width="200" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="160" y="118" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Finnhub News API</text>
        <text x="160" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">finnhub.io/api/news</text>
        <text x="160" y="143" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">Crypto headlines feed</text>

        <line x1="260" y1="125" x2="280" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        <rect x="280" y="100" width="200" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" />
        <text x="380" y="118" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">Sentiment Extract</text>
        <text x="380" y="133" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">🟢 ETF inflows | 🔴 Exploits</text>

        <line x1="480" y1="125" x2="500" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        {/* Fear & Greed */}
        <rect x="500" y="100" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
        <text x="560" y="118" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">Fear & Greed</text>
        <text x="560" y="135" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="500" fontFamily="ui-monospace, monospace">38/100</text>
        <text x="560" y="145" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">FEAR</text>

        <line x1="620" y1="125" x2="640" y2="125" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        <rect x="640" y="100" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="700" y="118" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">Indicator Score</text>
        <text x="700" y="135" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">-0.42</text>
        <text x="700" y="145" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Bearish</text>

        <line x1="760" y1="125" x2="760" y2="165" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* Clarification */}
        <rect x="720" y="100" width="230" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="118" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">News sentiment analysis</text>
        <text x="835" y="132" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Fear & Greed index</text>
        <text x="835" y="145" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">15 min scheduled</text>

        {/* === STEP 2: COINGECKO DATA === */}
        <rect x="60" y="175" width="130" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="125" y="190" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">CoinGecko Data</text>

        <rect x="60" y="205" width="150" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="135" y="222" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔥 Trending</text>
        <text x="135" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">15 coins tracked</text>

        <rect x="230" y="205" width="150" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="305" y="222" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">📊 Global Metrics</text>
        <text x="305" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$2.41T market cap</text>

        <rect x="400" y="205" width="150" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="475" y="222" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">📈 Dominance</text>
        <text x="475" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">BTC 56.7% | ETH 9.9%</text>

        <line x1="210" y1="227" x2="225" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />
        <line x1="380" y1="227" x2="395" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        <rect x="570" y="205" width="120" height="45" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="630" y="222" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 TEE</text>
        <text x="630" y="237" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Aggregate data</text>

        <line x1="550" y1="227" x2="565" y2="227" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />
        <line x1="630" y1="250" x2="630" y2="265" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* Clarification */}
        <rect x="720" y="205" width="230" height="45" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="835" y="222" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">3 CoinGecko endpoints</text>
        <text x="835" y="238" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Vol/Mcap ratio, BTC dom</text>

        {/* === STEP 3: LLM ANALYSIS === */}
        <rect x="60" y="275" width="140" height="22" rx="11" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="130" y="290" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 AI Analysis</text>

        <rect x="60" y="305" width="320" height="65" rx="4" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1.5" />
        <text x="220" y="325" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">xAI Grok Analysis</text>
        <text x="220" y="342" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">api.x.ai/v1/chat/completions</text>
        <text x="220" y="358" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">News + Market data → Recommendation</text>

        <line x1="380" y1="337" x2="400" y2="337" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-vol-llm)" />

        {/* AI Decision */}
        <rect x="400" y="305" width="140" height="65" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
        <text x="470" y="330" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">DECREASE</text>
        <text x="470" y="348" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Limit: $1,000→$700</text>
        <text x="470" y="362" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Confidence: 88%</text>

        <line x1="540" y1="337" x2="560" y2="337" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arr-vol-llm)" />

        <rect x="560" y="305" width="100" height="65" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="610" y="330" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 DON</text>
        <text x="610" y="348" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sign</text>
        <text x="610" y="362" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">ECDSA</text>

        <line x1="470" y1="370" x2="470" y2="385" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* Clarification box for LLM */}
        <rect x="680" y="305" width="270" height="65" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="815" y="325" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">AI provides recommendation</text>
        <text x="815" y="340" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Confidence score & reasoning</text>
        <text x="815" y="355" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Bullish→Increase, Fear→Decrease</text>

        {/* === STEP 4: LIMIT UPDATE === */}
        <rect x="60" y="400" width="120" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="120" y="415" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Limit Update</text>

        <rect x="60" y="430" width="140" height="45" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="130" y="448" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">VolumePolicyDON</text>
        <text x="130" y="463" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">$1,000 → $700</text>

        <rect x="220" y="430" width="100" height="45" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="270" y="448" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">USDA</text>
        <text x="270" y="463" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Limits set</text>

        <line x1="200" y1="452" x2="215" y2="452" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-vol-ok)" />

        {/* Trigger */}
        <rect x="850" y="430" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="905" y="448" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">TRIGGER</text>
        <text x="905" y="462" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Every 15 min</text>
        <text x="905" y="474" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Cron schedule</text>

        <line x1="850" y1="455" x2="380" y2="337" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-vol-min)" />

        {/* Bottom info */}
        <text x="500" y="510" textAnchor="middle" fill="#404040" fontSize="9" fontFamily="ui-monospace, monospace">
          5 APIs • ~6s • News + Market → AI → Limit Update
        </text>

        {/* Legend */}
        <rect x="60" y="520" width="10" height="10" rx="2" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="78" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Public API</text>

        <rect x="140" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1" />
        <text x="158" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">LLM</text>

        <rect x="190" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="208" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Success</text>

        <rect x="250" y="520" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="268" y="529" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Info</text>
      </svg>
    </div>
  );
}
