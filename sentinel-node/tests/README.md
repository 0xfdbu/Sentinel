# 🧪 Sentinel CRE Workflow Tests

This directory contains test suites for the Sentinel CRE (Chainlink Runtime Environment) workflow.

## Test Structure

```
tests/
├── README.md                    # This file
├── run-cre-tests.ts            # Main test runner
├── ace-policy-test.ts          # ACE Policy unit tests
├── manual-cre-test.sh          # Manual test script
└── payloads/                   # Test payloads
    ├── safe-contract.json      # Clean contract (should pass)
    ├── vulnerable-reentrancy.json  # Reentrancy vulnerability
    ├── blacklisted-sender.json # Blacklisted address
    ├── attack-function.json    # Attack function signature
    └── high-value.json         # High value transaction
```

## Quick Start

### Run All Tests
```bash
npm test
# or
npm run test:cre
```

### Run Specific Test
```bash
# Safe contract (should ALLOW)
npm run test:cre:safe

# Vulnerable contract (should PAUSE)
npm run test:cre:vulnerable

# Blacklisted sender (should PAUSE_IMMEDIATELY)
npm run test:cre:blacklist

# Attack function (should PAUSE_IMMEDIATELY)
npm run test:cre:attack

# High value (should PAUSE)
npm run test:cre:highvalue
```

### Run ACE Policy Unit Tests
```bash
npm run test:ace
```

### Manual Test (Grok-style)
```bash
cd tests

# Simulation only
./manual-cre-test.sh vulnerable-reentrancy

# With broadcast preview (shows on-chain calls)
./manual-cre-test.sh vulnerable-reentrancy --broadcast
```

### Broadcast Mode
The `--broadcast` flag (or `BROADCAST=true` env var) shows what transactions **would** be sent on-chain:

```bash
# Using npm script with broadcast
BROADCAST=true npm run test:cre

# Using manual script
./manual-cre-test.sh safe-contract --broadcast
```

**Output with --broadcast:**
```
🚩 Broadcast mode: Showing on-chain transaction details

[SIMULATION] Broadcasting transactions to EVM...
  • To: 0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1 (Guardian)
  • Data: 0x3a5... (emergencyPause)
  • Gas: 100000
⚠️  Note: Set CRE_ETH_PRIVATE_KEY to actually send transactions
```

**Without private key:** Shows preview only (safe for testing)
**With private key:** Would actually send transactions (requires test ETH)

## Test Payloads

### 1. Safe Contract (`safe-contract.json`)
- **Expected**: ✅ PASSED, Risk: SAFE, Action: ALLOW
- **Description**: Clean contract with proper ReentrancyGuard
- **Tests**: Basic safety validation

### 2. Vulnerable Reentrancy (`vulnerable-reentrancy.json`)
- **Expected**: ❌ VIOLATION, Risk: HIGH, Action: PAUSE
- **Description**: Contract with reentrancy vulnerability
- **Tests**: Pattern detection, vulnerability identification

### 3. Blacklisted Sender (`blacklisted-sender.json`)
- **Expected**: ❌ VIOLATION, Risk: CRITICAL, Action: PAUSE_IMMEDIATELY
- **Description**: Transaction from known malicious address
- **Tests**: ACE blacklist policy, compliance enforcement

### 4. Attack Function (`attack-function.json`)
- **Expected**: ❌ VIOLATION, Risk: CRITICAL, Action: PAUSE_IMMEDIATELY
- **Description**: `attack()` function signature detected
- **Tests**: Function signature heuristics

### 5. High Value (`high-value.json`)
- **Expected**: ❌ VIOLATION, Risk: HIGH, Action: PAUSE
- **Description**: Transaction > 1 ETH
- **Tests**: Volume policy, threshold enforcement

## Expected CRE Output

When tests pass, you should see output like:

```
╔══════════════════════════════════════════════════════════════════╗
║     🔒 SENTINEL GUARDIAN - TEE PROTECTED (ACE + PoR)             ║
╚══════════════════════════════════════════════════════════════════╝

[SYSTEM] Contract Address: 0x2265...
[SYSTEM] Chain ID: 11155111
[SYSTEM] ACE Policy: sentinel-threat-assessment-v1
[SYSTEM] ACE Risk Score: 85/100
[SYSTEM] ACE Action: PAUSE
⚠️  ACE POLICY VIOLATIONS DETECTED

[STEP 1/3] 📡 Fetching contract source from Etherscan...
[STEP 2/3] 🤖 AI Security Analysis via xAI Grok...
[STEP 3/3] 📊 Compiling security assessment...

📋 ACE COMPLIANCE RESULT
   Policy: sentinel-threat-assessment-v1
   Passed: ❌ NO
   Risk Score: 85/100
   Recommended Action: PAUSE

╔══════════════════════════════════════════════════════════════════╗
║  SCAN COMPLETE - HIGH                                            ║
╚══════════════════════════════════════════════════════════════════╝

✅ Analysis secured by Chainlink TEE
🔒 API keys never left secure enclave
🛡️  ACE Policy: sentinel-threat-assessment-v1
```

## Test Validation Criteria

| Test | Risk Level | ACE Action | Compliance |
|------|-----------|------------|------------|
| safe-contract | SAFE/LOW | ALLOW | ✅ PASSED |
| vulnerable-reentrancy | HIGH | PAUSE | ❌ VIOLATION |
| blacklisted-sender | CRITICAL | PAUSE_IMMEDIATELY | ❌ VIOLATION |
| attack-function | CRITICAL | PAUSE_IMMEDIATELY | ❌ VIOLATION |
| high-value | HIGH | PAUSE | ❌ VIOLATION |

## Creating New Test Payloads

1. Create a new JSON file in `payloads/`:
```json
{
  "_description": "What this test checks",
  "contractAddress": "0x...",
  "chainId": 11155111,
  "transactionHash": "0x...",
  "contractName": "TestContract",
  "sourceCode": "// Solidity code...",
  "transactionContext": {
    "hash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "1.0",
    "data": "0x...",
    "threatSummary": []
  },
  "acePolicy": {
    "passed": false,
    "policy": "sentinel-threat-assessment-v1",
    "riskScore": 75,
    "recommendedAction": "PAUSE",
    "violations": []
  },
  "urgency": "high"
}
```

2. Add npm script to `package.json`:
```json
"test:cre:mytest": "npx ts-node tests/run-cre-tests.ts my-test"
```

3. Run: `npm run test:cre:mytest`

## CI/CD Integration

The test runner exits with:
- `0` if all tests pass
- `1` if any test fails

Use in GitHub Actions:
```yaml
- name: Test CRE Workflow
  run: |
    cd sentinel/sentinel-node
    npm test
```

## Debugging Failed Tests

1. **Check CRE logs**: Look for `[STEP X/3]` output
2. **Verify payload format**: Ensure valid JSON
3. **Check API keys**: Etherscan/xAI keys must be configured
4. **Run manually**: Use `./manual-cre-test.sh` for detailed output
5. **Check risk level**: Compare expected vs actual in test output

## Environment Variables

Tests use the same environment as the main application:
- `ETHERSCAN_API_KEY` - For fetching contract source
- `XAI_API_KEY` - For AI analysis (optional, falls back to patterns)
- `XAI_MODEL` - Model to use (default: grok-4-1-fast-reasoning)

## Notes

- Tests run in **simulation mode** - no real transactions are sent
- The `--broadcast` flag shows what *would* be sent on-chain
- All API keys are protected by Confidential HTTP in TEE
- Test payloads are mock data - no real contracts required
