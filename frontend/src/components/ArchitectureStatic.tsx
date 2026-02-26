export function ArchitectureStatic() {
  return (
    <div className="w-full p-8 md:p-12">
      <svg viewBox="0 0 1000 500" className="w-full h-auto">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
          </marker>
          <marker id="arrowhead-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Title */}
        <text x="500" y="30" textAnchor="middle" fill="#e5e5e5" fontSize="16" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          Figure 1: Sentinel Security Architecture
        </text>

        {/* Row 1: Data Sources */}
        <rect x="50" y="70" width="140" height="50" rx="0" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="120" y="100" textAnchor="middle" fill="#d4d4d4" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Ethereum Blockchain</text>

        {/* Arrow */}
        <line x1="190" y1="95" x2="240" y2="95" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arrowhead)" />

        {/* Sentinel Node */}
        <rect x="240" y="60" width="180" height="70" rx="0" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="330" y="85" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Sentinel Node</text>
        <text x="330" y="105" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Threat Detection + ACE</text>
        <text x="330" y="120" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Policy Engine</text>

        {/* Arrow */}
        <line x1="420" y1="95" x2="470" y2="95" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arrowhead)" />

        {/* CRE Workflow */}
        <rect x="470" y="60" width="180" height="70" rx="0" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="560" y="85" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Chainlink CRE</text>
        <text x="560" y="105" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">TEE + xAI Analysis</text>
        <text x="560" y="120" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Confidential HTTP</text>

        {/* Arrow */}
        <line x1="650" y1="95" x2="700" y2="95" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arrowhead)" />

        {/* Decision Engine */}
        <rect x="700" y="70" width="120" height="50" rx="0" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="760" y="90" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Decision</text>
        <text x="760" y="108" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">ACE + xAI</text>

        {/* Arrow Down */}
        <line x1="760" y1="120" x2="760" y2="170" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arrowhead)" />

        {/* Guardian */}
        <rect x="680" y="170" width="160" height="50" rx="0" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="760" y="190" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">SentinelGuardian</text>
        <text x="760" y="208" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">emergencyPause()</text>

        {/* Arrow Left to Vault */}
        <line x1="680" y1="195" x2="550" y2="195" stroke="#6b7280" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#arrowhead-dashed)" />

        {/* Protected Contract */}
        <rect x="390" y="170" width="160" height="50" rx="0" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="470" y="190" textAnchor="middle" fill="#e5e5e5" fontSize="11" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">ProtectedContract</text>
        <text x="470" y="208" textAnchor="middle" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">DemoVault</text>

        {/* Data Sources Box */}
        <rect x="50" y="280" width="200" height="120" rx="0" fill="none" stroke="#525252" strokeWidth="1" />
        <text x="150" y="305" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">External Services</text>
        
        <line x1="70" y1="320" x2="230" y2="320" stroke="#404040" strokeWidth="1" />
        
        <text x="70" y="340" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">• Etherscan API</text>
        <text x="70" y="358" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">• xAI Grok API</text>
        <text x="70" y="376" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">• Tenderly Gateway</text>

        {/* Dotted line to CRE */}
        <line x1="250" y1="340" x2="560" y2="130" stroke="#525252" strokeWidth="1" strokeDasharray="3,3" />
        <text x="300" y="250" fill="#737373" fontSize="8" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Confidential HTTP</text>

        {/* Legend Box */}
        <rect x="700" y="280" width="250" height="120" rx="0" fill="none" stroke="#525252" strokeWidth="1" />
        <text x="825" y="305" textAnchor="middle" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Component Legend</text>
        
        <line x1="720" y1="320" x2="930" y2="320" stroke="#404040" strokeWidth="1" />
        
        <rect x="720" y="335" width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="1" />
        <text x="740" y="345" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">On-chain Contract</text>
        
        <rect x="720" y="355" width="12" height="12" fill="#262626" stroke="#9ca3af" strokeWidth="1" />
        <text x="740" y="365" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Off-chain Service</text>
        
        <line x1="720" y1="385" x2="750" y2="385" stroke="#9ca3af" strokeWidth="1" markerEnd="url(#arrowhead)" />
        <text x="760" y="388" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Direct Call</text>

        {/* Notes */}
        <text x="50" y="440" fill="#e5e5e5" fontSize="10" fontWeight="bold" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">Notes:</text>
        <text x="50" y="460" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">1. Sentinel Node polls blockchain every 1s for new transactions</text>
        <text x="50" y="478" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">2. ACE Policy Engine evaluates blacklist, volume limits, and threat scores</text>
        <text x="50" y="496" fill="#a3a3a3" fontSize="9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">3. Chainlink CRE runs in TEE with Confidential HTTP for API key protection</text>

        {/* Footer */}
        <text x="500" y="540" textAnchor="middle" fill="#525252" fontSize="8" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          Sentinel Protocol — Chainlink Convergence Hackathon 2026
        </text>
      </svg>
    </div>
  );
}
