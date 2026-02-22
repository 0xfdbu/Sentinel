# 🔍 Sentinel CRE Contract Security Scanner

A Chainlink Runtime Environment (CRE) workflow that performs automated security analysis on smart contracts.

## ✨ Features

- 🔍 **Etherscan Integration**: Fetches verified contract source code (API V2)
- 🤖 **XAI Grok Analysis**: AI-powered security vulnerability detection
- 📊 **Structured Results**: Returns risk levels and identified vulnerabilities
- 🔗 **Multi-Chain Support**: Works with all Etherscan-supported networks

## ⚠️ Important Note on Confidential HTTP

The CRE CLI v1.0.10/1.0.11 has a bug where Confidential HTTP secret substitution (`{{.secretName}}`) doesn't work correctly in simulation mode. The secrets file is loaded but templates aren't replaced.

**Current workaround**: API keys are passed via config.json for simulation. In production deployment, Confidential HTTP works correctly with TEE (Trusted Execution Environment) enclaves.

## 🚀 Quick Start

### Prerequisites

1. **Install CRE CLI v1.0.10** (required for stable simulation)
   ```bash
   curl -sL "https://github.com/smartcontractkit/cre-cli/releases/download/v1.0.10/cre_linux_amd64.tar.gz" | tar -xz
   sudo mv cre_v1.0.10_linux_amd64 /usr/local/bin/cre
   ```

2. **Install Bun runtime**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Setup CRE SDK**
   ```bash
   cd sentinel/cre-workflow
   bun install
   bun x cre-setup
   ```

### Configuration

Edit `config.json` with your API keys (for simulation only):

```json
{
  "owner": "0x89feEbA43b294425C0d7B482770eefbcc1359f8d",
  "etherscanApiKey": "your_etherscan_api_key",
  "grokApiKey": "your_xai_api_key"
}
```

## 🧪 Testing with Simulation

### Run Simulation

```bash
cd sentinel
echo '{"contractAddress":"0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C","chainId":11155111}' | \
  cre workflow simulate cre-workflow --target=hackathon-settings --project-root . --trigger-index 0 --http-payload -
```

### Using Test Payload File

```bash
cd sentinel
cre workflow simulate cre-workflow --target=hackathon-settings --project-root . --trigger-index 0 \
  --http-payload cre-workflow/examples/test-payload-sepolia.json
```

## 📡 Example Response

```json
{
  "status": "success",
  "contractAddress": "0xc7cd6f13a4be91604bcc04a78f57531d30808d1c",
  "chainId": 11155111,
  "contractName": "PausableVulnerableVault",
  "compilerVersion": "v0.8.26+commit.8a97fa7a",
  "riskLevel": "HIGH",
  "summary": "Contract contains a reentrancy vulnerability in the withdraw function...",
  "vulnerabilities": [
    {
      "type": "Reentrancy",
      "severity": "HIGH",
      "description": "External call before state update in withdraw function"
    }
  ],
  "timestamp": 1771460491109
}
```

## 🔗 Supported Networks

Uses Etherscan API V2 which supports all chains via `chainid` parameter:

| Chain ID | Network |
|----------|---------|
| 1 | Ethereum Mainnet |
| 11155111 | Sepolia Testnet |
| 8453 | Base Mainnet |
| 137 | Polygon Mainnet |
| 42161 | Arbitrum One |
| 10 | Optimism |
| ... | ... |

## 🚢 Deployment

Note: Deployment requires Early Access approval from Chainlink.

```bash
# Deploy to hackathon environment
cre workflow deploy . --target=hackathon-settings --project-root ..
```

## 📁 File Structure

```
cre-workflow/
├── contract-scanner.ts      # Main workflow
├── workflow.yaml            # Workflow configuration
├── config.json              # Runtime config (API keys for sim)
├── package.json             # Dependencies
├── README.md                # This file
└── examples/                # Test payloads
    ├── test-payload-sepolia.json
    ├── test-payload-mainnet.json
    └── test-payload-base.json
```

## 🔒 Production Security

In production deployment:
- Secrets are stored in Vault DON
- API keys are injected in TEE enclaves via `{{.secretName}}` templates
- Keys never appear in code, logs, or WASM
- Use Confidential HTTP for secure secret handling

## 📚 Resources

- [Chainlink CRE Docs](https://docs.chain.link/cre)
- [Etherscan API V2](https://docs.etherscan.io/v2-migration)
- [XAI API Docs](https://docs.x.ai/)

---

Part of the [Sentinel](../README.md) autonomous security monitoring system.
