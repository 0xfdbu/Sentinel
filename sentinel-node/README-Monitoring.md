# Sentinel Node - Fraud Detection & Auto-Pause

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SENTINEL NODE MONITORING                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    WebSocket RPC (Tenderly)                          │    │
│  │           wss://sepolia.gateway.tenderly.co/...                      │    │
│  └────────────────────────┬────────────────────────────────────────────┘    │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              TransactionMonitor (Polls every 1s)                     │    │
│  │                                                                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │    │
│  │  │ Large Tx    │  │ Suspicious  │  │ Rapid Tx    │  │ Blacklisted│ │    │
│  │  │ >100K USDA  │  │ Signatures  │  │ >5/min      │  │ Addresses  │ │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │    │
│  │         └─────────────────┴─────────────────┴───────────────┘       │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │              Fraud Score Calculator (0-100)                        │    │
│  │                           │                                         │    │
│  │           Fraud Score >= 70? ──Yes──▶ Trigger HTTP Workflow        │    │
│  └───────────────────────────┼─────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              CRE Workflow (TEE - Confidential Compute)               │    │
│  │                                                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │  Step 1: Receive threat data from Sentinel Node              │   │    │
│  │  │         - Fraud score, risk factors, tx hash                 │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │  Step 2: xAI Grok Analysis (Regular HTTP)                    │   │    │
│  │  │         - ⚠️ NO Confidential HTTP used (secrets.yaml)        │   │    │
│  │  │         - Review transaction patterns                        │   │    │
│  │  │         - Decision: PAUSE or MONITOR                         │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │  Step 3: Generate DON-Signed Report                          │   │    │
│  │  │         - ECDSA signatures from DON                          │   │    │
│  │  │         - Attestation of analysis                            │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  │                           │                                         │    │
│  │                           ▼                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │  Step 4: Broadcast to EmergencyGuardian                      │   │    │
│  │  │         - onReport(metadata, report)                         │   │    │
│  │  │         - Contract verifies DON signature                    │   │    │
│  │  │         - Executes pause()                                   │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      USDA V8 Contract                                │    │
│  │                                                                     │    │
│  │   Before:                    After:                                │    │
│  │   ┌──────────────┐          ┌──────────────┐                       │    │
│  │   │  ACTIVE      │          │   PAUSED ⏸️   │                       │    │
│  │   │  mint() ✓    │          │  mint() ✗    │                       │    │
│  │   │  transfer() ✓│          │  transfer() ✗│                       │    │
│  │   └──────────────┘          └──────────────┘                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Heuristic Analysis

| Heuristic | Weight | Description |
|-----------|--------|-------------|
| Large Transfer | 30 | >100K USDA in single tx |
| Suspicious Function | 40 | ownership transfer, upgrade calls |
| Rapid Transactions | 25 | >5 txs from same sender in 1 min |
| Contract Interaction | 15 | Calls to unknown contracts |
| High Gas Limit | 20 | >500k gas (complex attack) |
| Blacklisted Address | 50 | Known scammer address |

**Fraud Threshold: 70/100** - Triggers pause workflow

## Flow

1. **Sentinel Node** monitors USDA V8 via WebSocket
2. **Heuristic analysis** calculates fraud score for each tx
3. If score >= 70, **HTTP trigger** sent to CRE workflow
4. **xAI Grok** in TEE analyzes threat (confidential)
5. If AI confirms threat, **DON signs** pause report
6. **EmergencyGuardian** verifies signature, executes pause
7. **Contract paused** - all operations halted

## Files

- `src/services/TransactionMonitor.ts` - Monitoring service
- `../workflows/pause-with-don/index.ts` - Pause workflow with xAI

## Commands

```bash
# Start sentinel node with monitoring
npm run dev

# Test pause workflow directly
npm run test:pause
```
