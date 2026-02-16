# Sentinel Test Scenarios

## Scenario 1: Reentrancy Attack Prevention

**Objective**: Verify Sentinel detects and prevents reentrancy attacks

**Setup:**
1. Deploy VulnerableVault with 10 ETH
2. Deploy MaliciousAttacker contract
3. Register VulnerableVault with Sentinel

**Test Steps:**
```bash
# 1. Fund the attacker
cast send <ATTACKER> --value 1ether

# 2. Start attack (this would normally drain funds)
cast send <ATTACKER> "attack()"

# 3. Sentinel detects reentrancy pattern
# 4. Confidential pause executes
# 5. Attack is blocked (paused() = true)
```

**Expected Result:**
- Vulnerability detected: Reentrancy in withdraw()
- Severity: CRITICAL
- Action: PAUSE
- Funds saved: 10 ETH

---

## Scenario 2: Access Control Vulnerability

**Objective**: Test detection of missing access control

**Setup:**
1. Deploy contract with admin functions lacking onlyOwner
2. Register with Sentinel

**Test:**
```bash
# Simulate external call to privileged function
# Sentinel should detect missing access control
```

**Expected Result:**
- Vulnerability: AccessControl
- Severity: HIGH
- Action: ALERT

---

## Scenario 3: Safe Contract Verification

**Objective**: Ensure Sentinel correctly identifies secure contracts

**Setup:**
1. Deploy SafeVault (has ReentrancyGuard)
2. Register with Sentinel

**Test:**
```bash
# Trigger scan on SafeVault
```

**Expected Result:**
- Vulnerability: None
- Severity: SAFE
- Action: LOG

---

## Scenario 4: Confidential Compute Privacy

**Objective**: Verify emergency pause is hidden from mempool

**Setup:**
1. Deploy and register vulnerable contract
2. Set up mempool monitoring
3. Trigger CRITICAL vulnerability

**Test:**
```bash
# Terminal 1: Monitor mempool
npm run mempool-watcher

# Terminal 2: Trigger Sentinel
curl -X POST <CRE_ENDPOINT> ...

# Observe: No pause transaction visible
# Then: Transaction suddenly included in block
```

**Expected Result:**
- Pause transaction not visible in mempool
- Only appears after block inclusion
- Calldata encrypted until execution

---

## Scenario 5: Multi-Contract Monitoring

**Objective**: Test Sentinel handling multiple registered contracts

**Test:**
```bash
# Register 5 different contracts
# Trigger scans on all simultaneously
# Verify all are processed correctly
```

**Expected Result:**
- All contracts scanned
- Appropriate actions taken for each
- No cross-contamination of results

---

## Scenario 6: Audit Log Integrity

**Objective**: Verify scan results are immutably logged

**Test:**
```bash
# Perform multiple scans
# Read AuditLogger history
# Verify SHA256 hashes match vulnerability details
```

**Expected Result:**
- All scans recorded on-chain
- Hashes are deterministic
- Chronological ordering maintained
