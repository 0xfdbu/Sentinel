# Blacklist Manager

Sync security blacklists to on-chain PolicyEngine via DON-signed reports.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BLACKLIST MANAGER WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Cron Schedule (Daily) or HTTP Trigger                                       │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DATA SOURCE AGGREGATION                           │    │
│  │                                                                     │    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐   │    │
│  │  │  GoPlus API     │ │ ScamSniffer     │ │ Sentinel Sanctions  │   │    │
│  │  │  (SlowMist +    │ │ GitHub          │ │ (Lazarus, Tornado   │   │    │
│  │  │   ScamSniffer)  │ │ (2,500+ addr)   │ │  Cash, Garantex)    │   │    │
│  │  └────────┬────────┘ └────────┬────────┘ └──────────┬──────────┘   │    │
│  │           └───────────────────┼─────────────────────┘              │    │
│  │                               ▼                                     │    │
│  │              Merge & Deduplicate inside CRE TEE                     │    │
│  │                               │                                     │    │
│  │                               ▼                                     │    │
│  │              Compute Merkle Root (keccak256)                        │    │
│  │                               │                                     │    │
│  │                               ▼                                     │    │
│  │              Generate Report Hash (keccak256)                       │    │
│  │                               │                                     │    │
│  │                               ▼                                     │    │
│  │              ABI-Encode Report                                      │    │
│  │              (reportHash, merkleRoot, count, reason)                │    │
│  │                               │                                     │    │
│  │                               ▼                                     │    │
│  │              runtime.report() → DON-signed report                   │    │
│  │                               │                                     │    │
│  └───────────────────────────────┼─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│              evm.writeReport() → Chainlink Forwarder                         │
│                                  │                                           │
│                                  ▼                                           │
│              Forwarder validates DON signatures                            │
│                                  │                                           │
│                                  ▼                                           │
│              PolicyEngine.onReport(metadata, report)                         │
│                                  │                                           │
│                                  ▼                                           │
│              _processReport() decodes and stores                            │
│                                  │                                           │
│                                  ▼                                           │
│              Emit BlacklistUpdated(merkleRoot, count, reason)               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sources

| Source | URL | Data |
|--------|-----|------|
| **GoPlus API** | `api.gopluslabs.io` | Aggregated security intelligence (SlowMist + ScamSniffer) |
| **ScamSniffer GitHub** | `github.com/scamsniffer/scam-database` | Community-reported scam addresses (2,500+) |
| **Sentinel Sanctions** | `github.com/0xfdbu/sanctions-data` | Lazarus Group, Tornado Cash, Garantex |

## Report Format

DON-signed reports sent to `PolicyEngine.onReport()`:

```solidity
struct BlacklistReport {
    bytes32 reportHash;      // Unique identifier (keccak256 of unique data)
    bytes32 merkleRoot;      // Merkle root of all blacklisted addresses
    uint256 addressCount;    // Total number of addresses in this update
    string reason;           // Human-readable update reason
}
```

**Encoding:** `abi.encode(reportHash, merkleRoot, addressCount, reason)`

## IReceiver Interface

PolicyEngine implements `IReceiver` for Chainlink Forwarder integration:

```solidity
interface IReceiver {
    function onReport(bytes metadata, bytes report) external;
}
```

When the Blacklist Manager workflow runs:
1. **Fetch** - Gather addresses from 3 security sources
2. **Process** - Merge, deduplicate, compute Merkle root inside TEE
3. **Sign** - Generate DON-signed report via `runtime.report()`
4. **Submit** - `evm.writeReport()` sends to Chainlink Forwarder
5. **Validate** - Forwarder verifies cryptographic signatures
6. **Execute** - Forwarder calls `PolicyEngine.onReport(metadata, report)`
7. **Store** - Contract updates `blacklistMerkleRoot` and emits event

## Contract Addresses (Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| **PolicyEngine** | `0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347` | Receives blacklist updates (IReceiver) |
| **Chainlink Forwarder** | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` | Delivers DON-signed reports |

## Merkle Root Calculation

```typescript
// 1. Hash each address
const addressHashes = addresses.map(addr => 
  keccak256(address.toLowerCase())
);

// 2. Combine hashes iteratively
let merkleRoot = addressHashes[0];
for (let i = 1; i < addressHashes.length; i++) {
  merkleRoot = keccak256(merkleRoot + addressHashes[i]);
}
```

## Run Workflow

### Simulation Only
```bash
cd ../..
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --trigger-index 1 --http-payload '{"action":"full-sync"}'
```

### With On-Chain Broadcast
```bash
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --broadcast --trigger-index 1 --http-payload '{"action":"full-sync"}'
```

## Example Output

```
=== Blacklist Manager (Cron Trigger) - Daily Sync ===
[1] Fetching blacklist sources...
[1a] Fetching GoPlus security database...
    ✓ GoPlus: API ready for on-demand queries
[1b] Fetching Sentinel custom blacklist...
    ✓ Sentinel DB: 2 addresses
[1c] Fetching ScamSniffer GitHub blacklist...
    ✓ ScamSniffer: 2530 addresses
[1d] Fetching Sentinel Sanctions database...
    ✓ Sentinel Sanctions: 27 addresses
[2] Merging and deduplicating...
    ✓ Unified: 2559 unique addresses
[3] Building blacklist report...
    ✓ Report built: 0x2f88ad917d3df4d7b26c...
[4] Creating DON attestation...
    ✓ Report signed: 1 signatures
[5] Broadcasting to PolicyEngine...
    Target: 0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347
    Addresses: 2559
    Merkle Root: 0xfb25c59dd4eb0fb06116...
    Mode: BROADCAST
    ✅ Broadcast successful!
    Tx Hash: 0x56c62b9ab6df1c7cb6bd0cfc0e0d7a1d7654d80c64d18712de4acbe692897341
✅ SUCCESS: Blacklist update prepared
```

## Recent Executions

| Date | Addresses | Merkle Root | Tx Hash | Status |
|------|-----------|-------------|---------|--------|
| 2026-03-07 | 4 | 0xfb25c59dd4eb0fb06116... | [0x56c6...](https://sepolia.etherscan.io/tx/0x56c62b9ab6df1c7cb6bd0cfc0e0d7a1d7654d80c64d18712de4acbe692897341) | ✅ Success |

## Security Features

- **Replay Protection:** Each `reportHash` can only be used once (`usedReports` mapping)
- **DON Authentication:** Only Chainlink Forwarder with `DON_SIGNER_ROLE` can call `onReport()`
- **Cryptographic Signatures:** Reports signed by DON consensus (ECDSA + Keccak256)
- **Merkle Root:** Efficient on-chain verification of blacklist membership
- **Audit Trail:** All updates emit `BlacklistUpdated` event with reason

## Demo Mode

Limited to 10 addresses per batch for gas efficiency in testing.

```typescript
const DEMO_LIMIT = 10
if (unified.addresses.length > DEMO_LIMIT) {
  unified.addresses = unified.addresses.slice(0, DEMO_LIMIT)
  // Recompute merkle root with limited set
}
```
