# Sentinel — AML & Compliance Oracle for DeFi

AI-powered security monitoring with Chainlink CRE, DON-signed execution, and automated threat response.

---

## ⚠️ Known Issues [Experimental]

- **No Confidential HTTP** — Uses regular HTTPClient with hardcoded keys (testnet only). Production needs Vault DON + ConfidentialHTTPClient.
- **ACE policies not enforced on-chain** — `runPolicy` modifier is a placeholder; policies stored but never evaluated in mint/transfer.
- **Pause workflow doesn't actually pause** — Interface mismatch: Forwarder calls `onReport()` but EmergencyGuardianDON only has `writeReport()`.
- **Freeze workflow targets wrong contract** — Points to SimpleFreezer but USDA V8 checks USDAFreezer.
- **CRE CLI spawning fails** — Demo limitation; production would use CRE API, not local CLI.

---

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| USDA V8 | `0xFA93de331FCd870D83C21A0275d8b3E7aA883F45` |
| SentinelVaultETH | `0x12fe97b889158380e1D94b69718F89E521b38c11` |
| MintingConsumerV8 | `0xb59f7feb8e609faec000783661d4197ee38a8b07` |
| USDAFreezer | `0xa0d1b9a6A7A297D6CAA4603c4016A7Dc851e8b21` |
| SimpleFreezer | `0x0F2672C6624540633171f4E38b316ea1ED50E3A9` |
| EmergencyGuardianDON | `0x777403644f2eE19f887FBB129674a93dCEEda7d4` |
| SentinelRegistry | `0x774B96F8d892A1e4482B52b3d255Fa269136A0E9` |
| Chainlink Forwarder | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` |
| PolicyEngine | `0x07532372Aef9D76c1Fe08CB1C26AAB224E01d347` |
| VolumePolicyDON | `0x84e1b5E100393105608Ab05d549Da936cD7E995a` |

---

## Project Structure

```
sentinel/
├── contracts/          # Smart contracts (Hardhat + Foundry)
│   ├── src/tokens/     # USDA Stablecoin V8
│   ├── src/core/       # Sentinel core contracts
│   ├── src/policies/   # ACE PolicyEngine
│   └── src/por/        # Proof of Reserve contracts
├── api-server/         # REST API server
├── sentinel-node/      # Blockchain monitoring node
├── frontend/           # React web application
└── workflows/          # CRE workflow definitions
    ├── eth-por-unified/       # ETH Reserve Mint
    ├── blacklist-manager/     # Blacklist Sync
    ├── volume-sentinel/       # Volume Guardian
    ├── pause-with-don/        # Sentinel Guard
    └── usda-freeze-sentinel/  # Scam Freeze Sentinel
```

---

## Workflows

| # | Workflow | Trigger | Purpose |
|---|----------|---------|---------|
| 1 | **ETH Reserve Mint** | EVM Log (ETHDeposited) | Multi-source price + PoR + AI review → DON-signed USDA mint |
| 2 | **Blacklist Manager** | HTTP / Cron | Sync GoPlus + ScamSniffer + sanctions → PolicyEngine |
| 3 | **Volume Guardian** | Cron (15min) | Market data + AI analysis → auto-adjust volume limits |
| 4 | **Sentinel Guard** | HTTP (from node) | GoPlus investigation + AI decision → emergency pause |
| 5 | **Scam Freeze** | EVM Log (Transfer) | Multi-source security check + AI → freeze suspicious addresses |

Simulation uses 5 HTTP calls max; production is unlimited (enables Kraken, ScamSniffer, OFAC checks).

---

## Test Commands

```bash
# 1. ETH Reserve Mint
cre workflow simulate ./workflows/eth-por-unified --target local-simulation

# 2. Blacklist Manager
cre workflow simulate ./workflows/blacklist-manager --target local-simulation \
  --http-payload '{"action":"blacklist","address":"0x3333333333333333333333333333333333333333","reason":"Test"}'

# 3. Volume Guardian
cre workflow simulate ./workflows/volume-sentinel --target local-simulation

# 4. Sentinel Guard
cre workflow simulate ./workflows/pause-with-don --target local-simulation \
  --http-payload '{"action":"pause","target":"0xFA93de331FCd870D83C21A0275d8b3E7aA883F45","reason":"Test","metadata":{"fraudScore":85,"riskFactors":["Suspicious"],"suspiciousTx":"0xabc","from":"0x123","to":"0x456","value":"10000"}}'

# 5. Scam Freeze Sentinel
cre workflow simulate ./workflows/usda-freeze-sentinel --target local-simulation
```

---

## Quick Start

```bash
npm run install:all
cp .env.example .env   # Set SEPOLIA_RPC, SENTINEL_PRIVATE_KEY, CRE_ETH_PRIVATE_KEY, ETHERSCAN_API_KEY
npm run api            # API server
npm run dev            # Frontend
```

## Production To-Do

| Priority | Item |
|----------|------|
| P0 | Implement actual ACE policy enforcement in `runPolicy` |
| P0 | Fix freeze workflow config (correct freezer address + report encoding) |
| P1 | Move API keys to Vault DON + ConfidentialHTTPClient |
| P1 | CCIP cross-chain deployment (Arbitrum Sepolia) |
| P1 | Timelock governance for admin functions |
| P2 | Security audit + mainnet deployment |
| P2 | Monitoring dashboard (Grafana) |

## License

MIT
