# Scam Freeze Sentinel

Real-time freeze protection for USDA transfers using AI-powered risk assessment.

## How It Works

1. **USDA Transfer event** emitted
2. **CRE workflow triggers** on EVM Log
3. **Multi-source security check:**
   - GoPlus API (SlowMist, ScamSniffer, sanctions)
   - ScamSniffer GitHub blacklist
   - Sentinel Sanctions database
4. **xAI Grok risk assessment**
5. **Decision:** FREEZE or MONITOR
6. **DON-signed report** to Freezer contract

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| SimpleFreezer | `0x0F2672C6624540633171f4E38b316ea1ED50E3A9` | Test freezer with IReceiver interface |
| USDA Token | `0xFA93de331FCd870D83C21A0275d8b3E7aA883F45` | USDA Stablecoin V8 |

## Trigger

EVM Log: USDA Transfer event (`Transfer(address indexed from, address indexed to, uint256 value)`)

## Test Commands

### Simulate without broadcast
```bash
cd ../..
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation \
  --evm-tx-hash 0xfb612cdad247d0a99272c57553b629f39c0ac41c7d74f9033346c74039009ca4 \
  --evm-event-index 0 --non-interactive --trigger-index 0
```

### Simulate with broadcast (actual freeze)
```bash
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation \
  --broadcast --evm-tx-hash 0xfb612cdad247d0a99272c57553b629f39c0ac41c7d74f9033346c74039009ca4 \
  --evm-event-index 0 --non-interactive --trigger-index 0
```

## Test Results

**✅ Successful Test - March 7, 2026**

```
=== USDA Freeze Sentinel (Simulation Test) ===
Transfer detected: 0x9Eb4168b419F2311DaeD5eD8E072513520178f0C 
  -> 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045, 
  Value: 1000000 USDA
Risk score: 75/100
High risk! Executing freeze...
✅ FREEZE EXECUTED: 0xdc95953b758591794a51d4d2800113cf6043f130183c69a536ffbcc0d7c34eeb
```

**Test Details:**
- **Transfer Tx:** `0xfb612cdad247d0a99272c57553b629f39c0ac41c7d74f9033346c74039009ca4`
- **Target Address:** `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth)
- **Risk Score:** 75/100 (High risk - mock test data)
- **Freeze Tx:** `0xdc95953b758591794a51d4d2800113cf6043f130183c69a536ffbcc0d7c34eeb`
- **SimpleFreezer:** `0x0F2672C6624540633171f4E38b316ea1ED50E3A9`

**Verification:**
```bash
# Check if address is frozen
cast call 0x0F2672C6624540633171f4E38b316ea1ED50E3A9 \
  "isFrozen(address)(bool)" 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# Returns: true
```

## Report Format

The workflow generates a DON-signed report with the following ABI-encoded data:

```solidity
(bytes32 reportHash, address target, string reason)
```

This is decoded by the SimpleFreezer's `onReport()` function:
```solidity
function onReport(bytes calldata metadata, bytes calldata report) external
```

## Security Sources

- **GoPlus Labs API:** Multi-source security intelligence (SlowMist, ScamSniffer aggregation)
- **ScamSniffer GitHub:** Community-reported scam addresses (2,500+)
- **Sentinel Sanctions:** Lazarus Group, Tornado Cash, etc.
- **xAI Grok:** AI risk assessment for final freeze decisions

## Simulation Mode Notes

When running in CRE simulation mode:
- External HTTP calls are skipped (they timeout in simulation)
- Mock risk data is used for testing
- The workflow uses fallback decision logic based on risk scores
- Production TEE workflows make actual API calls

## Architecture

```
USDA Transfer Event
       │
       ▼
CRE Workflow (TEE)
       │
       ├──▶ Risk Assessment (Mock in sim, real APIs in prod)
       │
       ▼
DON-Signed Report
       │
       ▼
Chainlink Forwarder
       │
       ▼
SimpleFreezer.onReport()
       │
       ▼
   Address FROZEN 🧊
```
