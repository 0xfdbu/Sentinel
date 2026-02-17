# 🤖 AI Analysis Trigger Algorithm

## Overview

Multi-tier intelligent threat detection system that escalates from fast heuristics to AI analysis via Chainlink CRE.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TRANSACTION DETECTED                             │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 1: HEURISTIC PRE-FILTER (Local, <10ms)                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                             │
│                                                                         │
│  ⚡ Fast Pattern Matching:                                              │
│  • Flash loan signatures (+0.95)                                        │
│  • Large transfers >50 ETH (+0.70)                                      │
│  • High gas usage >3M (+0.60)                                           │
│  • Multiple transfers (+0.75)                                           │
│  • Reentrancy patterns (+0.90)                                          │
│                                                                         │
│  Score: 0.0 - 1.0                                                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        Score < 0.5       Score 0.5-0.65      Score ≥ 0.65
        ┌─────────┐       ┌─────────┐        ┌─────────┐
        │  SAFE   │       │ MEDIUM  │        │  HIGH   │
        │ LOG ONLY│       │  ALERT  │        │ TRIGGER │
        │         │       │         │        │   AI    │
        └─────────┘       └─────────┘        └────┬────┘
                                                  │
              ┌───────────────────────────────────┼──────────┐
              │                                   │          │
              ▼                                   ▼          ▼
        Value > 50 ETH                   Rate Limit OK   Rate Limited
        Gas > 3M                         ┌──────────┐    ┌──────────┐
        Novel Pattern                    │          │    │  QUEUE   │
              │                          ▼          │    │   SKIP   │
              └──────────────────► ┌─────────┐     │    └──────────┘
                                   │ CALL AI │◄────┘
                                   │  VIA    │
                                   │   CRE   │
                                   └────┬────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 2: AI ANALYSIS (xAI Grok via Chainlink CRE, ~2-5s)               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                 │
│                                                                         │
│  🤖 Deep Analysis:                                                      │
│  • Transaction code decompilation                                       │
│  • Cross-reference with exploit database                                │
│  • Novel attack pattern recognition                                     │
│  • Confidence scoring (0-1)                                             │
│                                                                         │
│  Response: {                                                            │
│    threatDetected: boolean,                                             │
│    confidence: 0.92,                                                    │
│    severity: "CRITICAL",                                                │
│    attackType: "Flash Loan",                                            │
│    recommendedAction: "PAUSE" | "ALERT" | "MONITOR"                     │
│  }                                                                      │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
         Confidence         Confidence         Confidence
         < 0.70            0.70-0.85          >= 0.85
        ┌─────────┐       ┌─────────┐        ┌─────────┐
        │  ALERT  │       │  ALERT  │        │  PAUSE  │
        │  ONLY   │       │ + WATCH │        │EXECUTE  │
        └─────────┘       └─────────┘        └────┬────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 3: CONFIDENTIAL EXECUTION (Chainlink CRE, ~5-10s)                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                 │
│                                                                         │
│  🔒 Confidential Pause:                                                 │
│  • AI decision encrypted                                                │
│  • Sent via Chainlink Functions                                         │
│  • DON executes pause transaction                                       │
│  • Vulnerability hash logged on-chain                                   │
│  • Mempool privacy protected                                            │
│                                                                         │
│  Result: Contract paused, funds secured, audit trail immutable          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Trigger Conditions

### Immediate AI Triggers (Bypass Heuristic Threshold)

| Condition | Threshold | Reason |
|-----------|-----------|--------|
| High Value | > 50 ETH | Too risky to rely only on heuristics |
| Extreme Gas | > 3M gas | Complex exploit likely |
| Novel Pattern | First time seeing combo | Unknown attack vector |
| Known Attacker | Address in blacklist | 100% confidence |

### Rate Limiting (Prevent API Abuse)

```typescript
// Global limits
MAX_AI_CALLS_PER_MINUTE: 5
MAX_AI_CALLS_PER_HOUR: 50
COOLDOWN_BETWEEN_CALLS: 10 seconds

// Per-contract limits
MAX_SAME_CONTRACT_CALLS_PER_HOUR: 3
```

## Configuration

```typescript
const AI_CONFIG = {
  // Trigger thresholds
  HEURISTIC_TRIGGER_THRESHOLD: 0.65,    // Score to trigger AI
  AI_CRITICAL_THRESHOLD: 0.85,          // Score to auto-pause
  
  // High-value overrides
  HIGH_VALUE_THRESHOLD_ETH: 50,
  HIGH_GAS_THRESHOLD: 3000000,
  
  // Rate limiting
  MAX_AI_CALLS_PER_MINUTE: 5,
  MAX_AI_CALLS_PER_HOUR: 50,
  COOLDOWN_BETWEEN_CALLS_MS: 10000,
}
```

## Heuristic Weights

| Pattern | Weight | Rationale |
|---------|--------|-----------|
| Flash Loan | 0.95 | Most common DeFi attack |
| Reentrancy | 0.90 | Classic high-impact exploit |
| Multiple Transfers | 0.75 | Drain pattern indicator |
| Large Transfer | 0.70 | High-value target |
| High Gas | 0.60 | Complex contract interaction |

## Example Scenarios

### Scenario 1: Flash Loan Attack

```
Transaction: Flash loan + swaps + price manipulation

Heuristic Score: 0.95 (FLASH_LOAN: 0.95)
→ Triggers AI (>= 0.65)
→ Rate limit check: PASS
→ AI Analysis: 92% confidence, "Flash Loan Attack"
→ AI recommends: PAUSE
→ Confidence >= 0.85: EXECUTE PAUSE via CRE

Result: Contract paused in ~7 seconds
```

### Scenario 2: Normal High-Value Transfer

```
Transaction: 100 ETH transfer to contract

Heuristic Score: 0.70 (LARGE_TRANSFER: 0.70)
→ Triggers AI (value > 50 ETH)
→ Rate limit check: PASS
→ AI Analysis: 15% confidence, "Normal deposit"
→ AI recommends: MONITOR
→ Confidence < 0.70: LOG ONLY

Result: No action, monitoring continues
```

### Scenario 3: Rate Limited

```
Transaction: Suspicious pattern on Contract A
→ 3rd AI call this hour to Contract A
→ Rate limit check: FAIL
→ Action: QUEUE for later analysis

Result: Heuristic alert sent, AI deferred
```

## Implementation

```typescript
// In your transaction handler:
const heuristic = calculateHeuristicScore(tx, receipt)

if (heuristic.shouldTriggerAI) {
  const prompt = buildAIPrompt({
    contractAddress,
    txHash,
    heuristicScore: heuristic.score,
    heuristicFlags: heuristic.flags
  })
  
  const aiResult = await callGrokAI(prompt, creAddress, wallet)
  
  await executeAIResponse(aiResult, contractAddress, guardian, wallet)
}
```

## Benefits

1. **Cost Efficient**: Only 5-10% of transactions trigger AI API calls
2. **Fast Response**: Critical threats paused in <10 seconds
3. **Accurate**: AI reduces false positives vs pure heuristics
4. **Scalable**: Rate limiting prevents API abuse
5. **Private**: CRE hides vulnerability details from attackers
