# Sentinel Architecture

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Landing    │  │   Dashboard  │  │   Monitor    │  │   Contracts  │     │
│  │    (Home)    │  │   (Scanner)  │  │  (Runtime)   │  │ (Protection) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                              │
│  React 18 + Vite + Wagmi + RainbowKit + Framer Motion                       │
└────────────────────────┬────────────────────────────────────────────────────┘
                         │ WebSocket / HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SENTINEL NODE SERVICE                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │  Block Scanner   │  │ Threat Analyzer  │  │   WebSocket      │           │
│  │  (Web3 Provider) │  │ (Heuristics)     │  │   Server         │           │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘           │
│           │                     │                      │                     │
│           └─────────────────────┼──────────────────────┘                     │
│                                 ▼                                            │
│                    ┌─────────────────────┐                                   │
│                    │   Threat Detected   │                                   │
│                    │  Confidence ≥ 90%   │                                   │
│                    └──────────┬──────────┘                                   │
│                               │                                              │
│                    ┌──────────▼──────────┐                                   │
│                    │  CREConsumer.call() │                                   │
│                    └──────────┬──────────┘                                   │
└───────────────────────────────┼──────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────────┐
│                               ▼                                              │
│                      CHAINLINK FUNCTIONS (DON)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Confidential Execution                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Fetch Secrets│  │  HTTP POST   │  │  Encrypt     │               │   │
│  │  │  from DON    │  │ to Sentinel  │  │  Response    │               │   │
│  │  └──────────────┘  └──────┬───────┘  └──────────────┘               │   │
│  │                           │                                          │   │
│  │  JavaScript Source: pause-source.js                                  │   │
│  └───────────────────────────┼──────────────────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ HTTPS + API Key
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BLOCKCHAIN LAYER (Sepolia)                           │
│                                                                              │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐   │
│  │ SentinelRegistry │◄────►│ EmergencyGuardian│◄────►│   Vulnerable     │   │
│  │   (0x774B...)    │      │   (0xD196...)    │      │   Contracts      │   │
│  └──────────────────┘      └────────┬─────────┘      └──────────────────┘   │
│                                     │                                        │
│                              emergencyPause()                                │
│                                     │                                        │
│                              ┌──────▼──────┐                                 │
│                              │  PAUSED ⏸️  │                                 │
│                              └─────────────┘                                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         AuditLogger (0x12Df...)                      │   │
│  │                    Immutable record of all actions                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Exploit Detection to Pause

```
┌─────────────┐
│   Hacker    │
│  Attempts   │
│   Exploit   │
└──────┬──────┘
       │ Transaction
       ▼
┌──────────────────┐
│ VulnerableVault  │
│   (Target)       │
└────────┬─────────┘
         │ Event emitted
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Sentinel Node   │────►│  Threat Analysis │
│  Event Listener  │     │  - Flash loan?   │
└──────────────────┘     │  - Reentrancy?   │
         │               │  - Large value?  │
         │               └────────┬─────────┘
         │                        │
         │                    CRITICAL?
         │                        │
         │               ┌────────▼─────────┐
         │               │  YES → Trigger   │
         │               │     CRE Flow     │
         │               └────────┬─────────┘
         │                        │
         │               ┌────────▼─────────┐
         │               │  CREConsumer     │
         │               │  requestConfi... │
         │               └────────┬─────────┘
         │                        │
         │               ┌────────▼─────────┐
         │               │  Chainlink DON   │
         │               │  (Confidential)  │
         │               └────────┬─────────┘
         │                        │
         │               ┌────────▼─────────┐
         │               │  Sentinel API    │
         │               │  /emergency-pause│
         │               └────────┬─────────┘
         │                        │
         └──────────┐   ┌──────────┘
                    ▼   ▼
         ┌──────────────────┐
         │ EmergencyGuardian│
         │  emergencyPause  │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  ⏸️  PAUSED!     │
         │  Funds Safe      │
         └──────────────────┘
```

## Threat Detection Heuristics

| Pattern | Signature | Confidence | Action |
|---------|-----------|------------|--------|
| **Flash Loan** | Function sig: `0x6318967b` | 95% | CRE Pause |
| **Reentrancy** | >3 internal calls in 1 tx | 90% | CRE Pause |
| **Large Transfer** | Value > 100 ETH | 80% | Alert |
| **Drain Pattern** | >5 transfers in 1 tx | 85% | CRE Pause |
| **Gas Anomaly** | Gas > 5M | 70% | Log |

## Contract Interactions

```solidity
// 1. User registers their contract
SentinelRegistry.register{value: 0.01 ETH}(
    contractAddress,
    "My Protocol v1"
);

// 2. Sentinel Node detects threat
// (off-chain heuristic analysis)

// 3. Sentinel calls CREConsumer
CREConsumer.requestConfidentialPause(
    target = contractAddress,
    vulnHash = keccak256("EXPLOIT_ATTEMPT"),
    encryptedSecretsReference = donSecrets,
    source = pauseSourceCode
);

// 4. Chainlink DON executes confidential JS
// (fetches API key, calls Sentinel API)

// 5. Sentinel API executes on-chain pause
EmergencyGuardian.emergencyPause(
    target = contractAddress,
    vulnHash = keccak256("EXPLOIT_ATTEMPT")
);

// 6. Target is now paused!
VulnerableVault.isPaused() == true;
```

## Security Considerations

### Key Management
- `PRIVATE_KEY`: Stored only on Sentinel Node server
- `SENTINEL_API_KEY`: Encrypted in Chainlink DON secrets
- Never expose keys in frontend code!

### Authorization
```solidity
// Only authorized sentinels can trigger CRE
modifier onlySentinel() {
    require(authorizedSentinels[msg.sender], "Unauthorized");
    _;
}

// Guardian only accepts calls from Sentinel Node
modifier onlyAuthorized() {
    require(sentinelRegistry.isSentinel(msg.sender), "Not sentinel");
    _;
}
```

### Rate Limiting
- Maximum 1 pause per contract per hour
- Subscription LINK balance limits execution
- API key authentication on Sentinel API

## Deployment Checklist

- [ ] Deploy SentinelRegistry
- [ ] Deploy EmergencyGuardian
- [ ] Deploy AuditLogger
- [ ] Create Chainlink Functions subscription
- [ ] Deploy CREConsumer
- [ ] Add CREConsumer to subscription
- [ ] Fund subscription with LINK
- [ ] Setup Sentinel Node server
- [ ] Configure environment variables
- [ ] Test end-to-end flow
- [ ] Authorize Sentinel Node in Guardian
- [ ] Authorize Sentinel Node in CREConsumer

## Monitoring

```bash
# Check Sentinel Node status
curl http://localhost:3000/api/v1/status

# View Functions requests
open https://functions.chain.link/sepolia/YOUR_SUB_ID

# Monitor Guardian pauses
cast call GUARDIAN_ADDRESS "totalPausesExecuted()(uint256)"
```
