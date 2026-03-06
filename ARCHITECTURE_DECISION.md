# Architecture Decision: API-Server vs CRE-Native

## Question: Should we bring back api-server?

### What api-server was doing (before removal)
- Polling blockchain for events (inefficient)
- HTTP bridge to trigger CRE workflows (complex)
- Manual contract interaction endpoints

### Why we removed it
- CRE has native triggers now (EVM Log, Cron, HTTP)
- Native triggers are more reliable than polling
- Simpler architecture
- Better security (events handled in TEE)

### Current Problem
Local simulation with `--broadcast` uses mock DON signatures that real contracts reject.

---

## Options Analysis

### Option A: Bring back api-server
**What it would do:**
```
HTTP Request → api-server → Direct contract call (bypass CRE)
```

**Pros:**
- Can test minting immediately
- Direct contract calls work
- HTTP API for manual operations

**Cons:**
- Re-introduces complexity we just removed
- Two code paths to maintain (api-server + CRE workflows)
- Kind of defeats the purpose of using CRE
- Polling is less efficient than native triggers

**Verdict:** ❌ Not recommended - we're going backwards

---

### Option B: Create simple "manual mint" script (Recommended)
**What it would do:**
```
Manual script → Direct contract call for testing only
```

**Pros:**
- Simple, one-off solution
- Can test minting without api-server complexity
- Keeps CRE workflows for production
- Easy to remove later

**Cons:**
- Manual process (not automated)
- Not a full HTTP API

**Verdict:** ✅ Recommended for testing

---

### Option C: Use official template approach (HTTP Trigger)
**What it would do:**
```
HTTP Trigger → CRE Workflow → writeReport → MintingConsumer
```

**Pros:**
- Matches official Chainlink pattern
- Works with local simulation
- No mock signature issues (same flow, just different trigger)

**Cons:**
- Manual HTTP call to trigger (not fully automated)
- Different from our current EVM Log approach

**Verdict:** ✅ Good option if we want to test minting now

---

### Option D: Deploy to Production DON (Best long-term)
**What it would do:**
```
EVM Log Trigger → CRE Workflow (production) → writeReport → MintingConsumer
```

**Pros:**
- Real DON signatures
- Automated (no manual triggers)
- Production-ready

**Cons:**
- Requires early access approval
- Can't test right now

**Verdict:** ✅ Best long-term, but blocked on access

---

## Recommendation

**Don't bring back api-server.** Instead:

1. **For immediate testing:** Create a simple `manual-mint.ts` script that calls MintingConsumer directly
2. **For hackathon/demo:** Use HTTP trigger (like official template) - it's proven to work
3. **For production:** Deploy to production DON when access is granted

The api-server was a bridge solution. We've moved past that with native CRE triggers.

---

## What should we do right now?

**Option 1: Create manual mint script (15 min)**
```typescript
// scripts/manual-mint.ts
// Direct call to MintingConsumer for testing
```

**Option 2: Switch to HTTP trigger (30 min)**
```typescript
// Change workflow from EVM Log to HTTP trigger
// Matches official template exactly
```

**Option 3: Deploy test MintingConsumer (30 min)**
```solidity
// Deploy MintingConsumerSimple that accepts direct calls
// Update workflow to use it for testing
```

Which option do you prefer?
