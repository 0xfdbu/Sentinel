# CRE Minting Analysis: Official Template vs Our Setup

## Official Template (stablecoin-ace-ccip)

### Trigger Type
- **HTTP Trigger** - Bank sends HTTP request to start workflow
- Manual initiation via API call

### Key Code Pattern
```typescript
// Official template
const initWorkflow = (config: Config) => {
	const httpTrigger = new cre.capabilities.HTTPCapability()
	return [
		cre.handler(httpTrigger.trigger({}), onHTTPTrigger),
	]
}
```

### Minting Flow
1. HTTP POST to workflow
2. Workflow validates PoR
3. Workflow calls `writeReport()` to MintingConsumer
4. Returns `reportDelivered: true`
5. **⚠️ Important:** Even if TX succeeds, ACE can block internally
6. Users must verify on-chain to confirm mint actually happened

### Expected Behavior (from official docs)
> "The CRE Forwarder TX always succeeds (report delivered), but the internal consumer call can revert due to ACE. Always verify on-chain via balance/events to confirm policy enforcement."

---

## Our Setup

### Trigger Type
- **EVM Log Trigger** - Vault emits ETHDeposited event
- Fully automated (no manual HTTP call needed)

### Key Code Pattern
```typescript
// Our workflow
const init = (cfg: any) => {
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
  const ethDepositedHash = keccak256(toBytes('ETHDeposited(address,uint256,uint256,bytes32,uint256)'))
  
  return [
    cre.handler(
      evm.logTrigger({
        addresses: [hexToBase64(cfg.sepolia.vaultAddress)],
        topics: [{ values: [hexToBase64(ethDepositedHash)] }],
        confidence: 'CONFIDENCE_LEVEL_FINALIZED',
      }),
      onLogTrigger
    ),
  ]
}
```

---

## Key Insight: Transaction Succeeded But Mint Failed

Our transaction `0x610d4925...` shows:
- ✅ Status: SUCCESS
- ✅ To: Forwarder (0x15fC6ae953E024d975e77382eEeC56A9101f9F88)
- ✅ Event: ReportProcessed emitted
- ❌ Actual mint: Only 0.079 USDA received (vs expected 9.9 USDA)

### Root Cause
The Forwarder accepted the report but the MintingConsumer rejected it internally.

Possible reasons:
1. **Mock signatures in local sim** - Forwarder accepts, but Consumer validates and rejects
2. **ACE policy blocking** - Beneficiary might be hitting policy limits
3. **Wrong report format** - Consumer expects different encoding

---

## Solution Options

### Option 1: Use HTTP Trigger (Like Official Template)
Deploy workflow with HTTP trigger, call it manually:
```bash
cre workflow simulate ./workflows/eth-por-unified \
  --target local-simulation \
  --broadcast \
  --http-payload '{"beneficiary":"0x...","amount":"1000"}'
```

### Option 2: Deploy to Production DON
Production DON has real signatures that pass validation:
```bash
cre workflow deploy ./workflows/eth-por-unified --target production
```

### Option 3: Create MintingConsumer that Accepts Direct Calls
Bypass Forwarder signature validation for testing.

---

## Recommended Path

Given the analysis, the **EVM Log trigger approach is correct** but:
1. Local simulation with `--broadcast` will always fail because of mock signatures
2. We need production deployment for real minting
3. OR we switch to HTTP trigger like the official template

**Decision needed:** Which approach do you prefer?
