import React from 'react'

export function VolumeSentinelDiagram() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <svg viewBox="0 0 1000 620" className="w-full min-w-[900px]" style={{ height: 'auto' }}>
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
          <marker id="arr-vol-chain" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="25" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="500" fontFamily="ui-monospace, monospace">
          Volume Sentinel
        </text>
        <text x="500" y="42" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="ui-monospace, monospace">
          ⚠️ Limits stored on-chain but NOT enforced (ACE not wired)
        </text>

        {/* HTTP Budget Badge */}
        <rect x="850" y="15" width="120" height="28" rx="14" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="910" y="33" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">HTTP: 4/5 Used</text>

        {/* === STEP 0: ON-CHAIN READ (NEW) === */}
        <rect x="60" y="60" width="140" height="22" rx="11" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
        <text x="130" y="75" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">⛓ On-Chain Read</text>

        <rect x="60" y="90" width="200" height="50" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
        <text x="160" y="108" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">VolumePolicyDON</text>
        <text x="160" y="123" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">dailyVolumeLimit()</text>
        <text x="160" y="133" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">📊 Current: 800 USDA</text>

        <line x1="260" y1="115" x2="280" y2="115" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr-vol-chain)" />

        <rect x="280" y="90" width="140" height="50" rx="4" fill="#0a0a0a" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
        <text x="350" y="108" textAnchor="middle" fill="#3b82f1" fontSize="9" fontFamily="ui-monospace, monospace">USDA TotalSupply</text>
        <text x="350" y="123" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">totalSupply()</text>
        <text x="350" y="133" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">🪙 100,177 USDA</text>

        <line x1="420" y1="115" x2="440" y2="115" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr-vol-chain)" />

        <rect x="440" y="90" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="500" y="108" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">Reserve Ratio</text>
        <text x="500" y="125" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">1.79%</text>
        <text x="500" y="135" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">HIGH RISK</text>

        <line x1="560" y1="115" x2="760" y2="115" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arr-vol-chain)" />

        <line x1="760" y1="115" x2="760" y2="155" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* Clarification */}
        <rect x="600" y="90" width="370" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" strokeDasharray="3,3" />
        <text x="785" y="108" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">✨ NEW: Reads actual on-chain state before analysis</text>
        <text x="785" y="122" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Volume limit + Total supply + Calculates reserve ratio</text>
        <text x="785" y="135" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">evm.callContract() → VolumePolicyDON.dailyVolumeLimit()</text>

        {/* === STEP 1: NEWS DATA === */}
        <rect x="60" y="165" width="100" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="110" y="180" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Market News</text>

        <rect x="60" y="195" width="200" height="50" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="160" y="213" textAnchor="middle" fill="#a3a3a3" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">Finnhub News API</text>
        <text x="160" y="228" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">finnhub.io/api/news</text>
        <text x="160" y="238" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">HTTP #1 ✓</text>

        <line x1="260" y1="220" x2="280" y2="220" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        <rect x="280" y="195" width="200" height="50" rx="4" fill="#0a0a0a" stroke="#262626" strokeWidth="1" />
        <text x="380" y="213" textAnchor="middle" fill="#737373" fontSize="9" fontFamily="ui-monospace, monospace">Sentiment Extract</text>
        <text x="380" y="228" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">🟢 ETF inflows | 🔴 Exploits</text>
        <text x="380" y="238" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Local processing</text>

        <line x1="480" y1="220" x2="500" y2="220" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        {/* Fear & Greed */}
        <rect x="500" y="195" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
        <text x="560" y="213" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">Fear & Greed</text>
        <text x="560" y="230" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="500" fontFamily="ui-monospace, monospace">38/100</text>
        <text x="560" y="240" textAnchor="middle" fill="#737373" fontSize="7" fontFamily="ui-monospace, monospace">FEAR</text>

        <line x1="620" y1="220" x2="640" y2="220" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        <rect x="640" y="195" width="120" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.3" />
        <text x="700" y="213" textAnchor="middle" fill="#22c55e" fontSize="9" fontFamily="ui-monospace, monospace">Indicator Score</text>
        <text x="700" y="230" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">-0.42</text>
        <text x="700" y="240" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Bearish</text>

        <line x1="760" y1="220" x2="760" y2="260" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* === STEP 2: COINGECKO DATA === */}
        <rect x="60" y="270" width="150" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="135" y="285" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">CoinGecko + PoR</text>

        {/* Trending - SKIPPED in sim */}
        <rect x="60" y="300" width="130" height="55" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="125" y="317" textAnchor="middle" fill="#525252" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔥 Trending</text>
        <text x="125" y="332" textAnchor="middle" fill="#404040" fontSize="8" fontFamily="ui-monospace, monospace">15 coins tracked</text>
        <text x="125" y="347" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">(prod only)</text>

        {/* Global Metrics - ACTIVE */}
        <rect x="210" y="300" width="140" height="55" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="280" y="317" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">📊 Global Metrics</text>
        <text x="280" y="332" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$2.38T market cap</text>
        <text x="280" y="347" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">HTTP #2 ✓</text>

        {/* PoR - ACTIVE */}
        <rect x="370" y="300" width="140" height="55" rx="4" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="440" y="317" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Proof of Reserve</text>
        <text x="440" y="332" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">$1,800 reserves</text>
        <text x="440" y="347" textAnchor="middle" fill="#22c55e" fontSize="7" fontFamily="ui-monospace, monospace">HTTP #3 ✓</text>

        <line x1="350" y1="327" x2="365" y2="327" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />
        <line x1="510" y1="327" x2="525" y2="327" stroke="#404040" strokeWidth="1" markerEnd="url(#arr-vol-min)" />

        <rect x="525" y="300" width="100" height="55" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="575" y="317" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">CRE</text>
        <text x="575" y="332" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="ui-monospace, monospace">Regular HTTP</text>
        <text x="575" y="347" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">DON Sign</text>

        <line x1="575" y1="355" x2="575" y2="370" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* === STEP 3: LLM ANALYSIS === */}
        <rect x="60" y="380" width="140" height="22" rx="11" fill="#3b0764" stroke="#a855f7" strokeWidth="1" />
        <text x="130" y="395" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🤖 AI Analysis</text>

        <rect x="60" y="410" width="320" height="75" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1.5" />
        <text x="220" y="433" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">xAI Grok Analysis</text>
        <text x="220" y="453" textAnchor="middle" fill="#a78bfa" fontSize="8" fontFamily="ui-monospace, monospace">api.x.ai/v1/chat/completions</text>
        <text x="220" y="468" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">HTTP #4 ✓</text>
        <text x="220" y="483" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">On-chain data + Market + PoR → AI → Recommendation</text>

        <line x1="380" y1="447" x2="400" y2="447" stroke="#a855f7" strokeWidth="2" markerEnd="url(#arr-vol-llm)" />

        {/* AI Decision */}
        <rect x="400" y="410" width="140" height="75" rx="4" fill="#0a0a0a" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
        <text x="470" y="438" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="500" fontFamily="ui-monospace, monospace">DECREASE</text>
        <text x="470" y="458" textAnchor="middle" fill="#737373" fontSize="8" fontFamily="ui-monospace, monospace">Limit: $800→$400</text>
        <text x="470" y="473" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Reserve ratio &lt;2% = HIGH RISK</text>

        <line x1="540" y1="447" x2="560" y2="447" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arr-vol-llm)" />

        <rect x="560" y="410" width="100" height="75" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="610" y="438" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">🔒 DON</text>
        <text x="610" y="458" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Sign</text>
        <text x="610" y="473" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">ECDSA</text>

        <line x1="470" y1="485" x2="470" y2="500" stroke="#404040" strokeWidth="1.5" markerEnd="url(#arr-vol-step)" />

        {/* === STEP 4: LIMIT UPDATE === */}
        <rect x="60" y="515" width="120" height="22" rx="11" fill="#171717" stroke="#404040" strokeWidth="1" />
        <text x="120" y="530" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">Limit Update</text>

        <rect x="60" y="545" width="140" height="50" rx="4" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="130" y="563" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">VolumePolicyDON</text>
        <text x="130" y="578" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">$800 → $400</text>

        <rect x="220" y="545" width="100" height="50" rx="4" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.4" />
        <text x="270" y="563" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="500" fontFamily="ui-monospace, monospace">USDA</text>
        <text x="270" y="578" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Limits set</text>

        <line x1="200" y1="570" x2="215" y2="570" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arr-vol-ok)" />

        {/* Trigger */}
        <rect x="850" y="545" width="110" height="50" rx="4" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" />
        <text x="905" y="563" textAnchor="middle" fill="#737373" fontSize="9" fontWeight="500" fontFamily="ui-monospace, monospace">TRIGGER</text>
        <text x="905" y="577" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Every 15 min</text>
        <text x="905" y="589" textAnchor="middle" fill="#525252" fontSize="7" fontFamily="ui-monospace, monospace">Cron schedule</text>

        <line x1="850" y1="570" x2="380" y2="447" stroke="#525252" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arr-vol-min)" />

        {/* Bottom info */}
        <text x="500" y="610" textAnchor="middle" fill="#f59e0b" fontSize="9" fontFamily="ui-monospace, monospace">
          ⚠️ Limits synced to VolumePolicyDON but NOT enforced • runPolicy() is placeholder • ~6s
        </text>

        {/* Legend */}
        <rect x="60" y="600" width="10" height="10" rx="2" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
        <text x="78" y="609" fill="#3b82f6" fontSize="8" fontFamily="ui-monospace, monospace">On-Chain Read</text>

        <rect x="160" y="600" width="10" height="10" rx="2" fill="#171717" stroke="#262626" strokeWidth="1" />
        <text x="178" y="609" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Public API</text>

        <rect x="250" y="600" width="10" height="10" rx="2" fill="#171717" stroke="#22c55e" strokeWidth="1" />
        <text x="268" y="609" fill="#22c55e" fontSize="8" fontFamily="ui-monospace, monospace">Active (Sim)</text>

        <rect x="350" y="600" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="368" y="609" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">Skipped (Sim)</text>

        <rect x="465" y="600" width="10" height="10" rx="2" fill="#0a0a0a" stroke="#a855f7" strokeWidth="1" />
        <text x="483" y="609" fill="#525252" fontSize="8" fontFamily="ui-monospace, monospace">LLM</text>
      </svg>
    </div>
  );
}
