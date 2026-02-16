import { Workflow, http, evm, llm } from '@chainlink/cre-sdk';
import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Sentinel Security Scanner - CRE Workflow
 * 
 * This workflow implements an autonomous AI security oracle that:
 * 1. Fetches contract source code from Etherscan (Confidential HTTP)
 * 2. Analyzes code for vulnerabilities using xAI Grok
 * 3. Evaluates risk and determines response action
 * 4. Executes emergency pause via Confidential Compute (if critical)
 * 5. Logs results to blockchain
 * 
 * @track Chainlink Convergence Hackathon 2026
 * @category Risk & Compliance | CRE & AI
 */

const sentinelWorkflow = new Workflow({
  name: 'Sentinel Security Scanner',
  description: 'Autonomous AI-powered smart contract vulnerability detection and emergency response',
  version: '1.0.0',
  trigger: { 
    http: { 
      path: '/scan',
      method: 'POST',
      body: {
        contractAddress: 'string',
        chainId: 'number',
        alertWebhook: 'string?'
      }
    } 
  },
});

sentinelWorkflow
  // Step 1: Fetch contract source code from Etherscan
  // Uses Confidential HTTP to hide API key from logs and public view
  .step('fetch_source', {
    confidentialHttp: {
      url: 'https://api.etherscan.io/v2/api',
      method: 'GET',
      query: {
        chainid: '{{input.chainId}}',
        module: 'contract',
        action: 'getsourcecode',
        address: '{{input.contractAddress}}',
        apikey: '{{secrets.etherscanApiKey}}'
      },
      allowedHosts: ['api.etherscan.io'],
      tls: { verify: true },
      timeout: 30000,
      // Response is encrypted, API key never exposed in logs
    },
  })
  
  // Step 2: AI Security Analysis using xAI Grok
  // Analyzes the fetched source code for vulnerabilities
  .step('ai_security_analysis', {
    llm: {
      provider: 'xai',
      model: 'grok-4-1-fast-reasoning',
      apiKey: '{{secrets.grokApiKey}}',
      prompt: `You are an expert smart contract security auditor. Analyze the following Solidity code for security vulnerabilities.

Focus on these vulnerability categories:
1. Reentrancy attacks (external calls before state changes)
2. Integer overflow/underflow (missing SafeMath or unchecked blocks)
3. Unchecked external calls (return values not verified)
4. Access control issues (missing onlyOwner or role checks)
5. Front-running vulnerabilities (predictable outcomes)
6. Timestamp dependence (block.timestamp manipulation)
7. Unchecked low-level calls (call/delegatecall)
8. Self-destruct vulnerabilities
9. Delegatecall injection
10. tx.origin authentication

Provide your analysis in STRICT JSON format:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|SAFE",
  "category": "Reentrancy|Overflow|AccessControl|Other",
  "vector": "Detailed description of the vulnerability",
  "lines": [1, 2, 3],
  "confidence": 0.95,
  "recommendation": "How to fix this issue"
}

If no vulnerabilities found, return:
{
  "severity": "SAFE",
  "category": "None",
  "vector": "No vulnerabilities detected",
  "lines": [],
  "confidence": 1.0,
  "recommendation": "Continue monitoring"
}

Contract Source Code:
{{fetch_source.result.0.SourceCode}}`,
      temperature: 0.1, // Low temperature for deterministic security analysis
      maxTokens: 2048,
    },
  })
  
  // Step 3: Risk Assessment Logic
  // Parse AI result and determine action based on severity and confidence
  .step('evaluate_risk', {
    compute: {
      runtime: 'javascript',
      logic: `
        const result = JSON.parse('{{ai_security_analysis.result}}');
        const severity = result.severity;
        const confidence = result.confidence;
        
        // Generate hash of vulnerability for privacy (don't reveal details on-chain)
        const vulnHash = require('crypto')
          .createHash('sha256')
          .update(result.vector)
          .digest('hex');
        
        let action, priority;
        
        if (severity === 'CRITICAL' && confidence > 0.85) {
          action = 'PAUSE';
          priority = 'URGENT';
        } else if (severity === 'HIGH' || (severity === 'CRITICAL' && confidence <= 0.85)) {
          action = 'ALERT';
          priority = 'HIGH';
        } else if (severity === 'MEDIUM') {
          action = 'WARN';
          priority = 'MEDIUM';
        } else {
          action = 'LOG';
          priority = 'LOW';
        }
        
        return {
          action,
          priority,
          severity,
          confidence,
          category: result.category,
          vulnHash,
          vector: result.vector,
          lines: result.lines,
          recommendation: result.recommendation
        };
      `
    }
  })
  
  // Step 4: Check if contract is registered (required for pause)
  .step('check_registration', {
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.registryContractAddress}}',
      functionAbi: 'function isRegistered(address) view returns (bool)',
      args: ['{{input.contractAddress}}'],
    },
  })
  
  // Step 5: Confidential Compute - Emergency Pause
  // Only executes if action is PAUSE AND contract is registered
  .step('confidential_pause', {
    confidentialCompute: {
      condition: '{{evaluate_risk.action}} === "PAUSE" && {{check_registration.result}} === true',
      evm: {
        chainId: '{{input.chainId}}',
        contractAddress: '{{secrets.guardianContractAddress}}',
        functionAbi: 'function emergencyPause(address target, bytes32 vulnerabilityHash) external',
        args: [
          '{{input.contractAddress}}',
          '0x{{evaluate_risk.vulnHash}}'
        ],
        privacy: 'full', // Hides calldata and target from public mempool
        gasLimit: 500000,
        // Use sentinel private key for signing
        privateKey: '{{secrets.sentinelPrivateKey}}',
      },
      // Fallback if confidential compute fails
      onFailure: 'continue'
    },
  })
  
  // Step 6: Log scan result to AuditLogger contract
  // Stores hashed findings for transparency without revealing vulnerability details
  .step('log_audit', {
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.auditLoggerAddress}}',
      functionAbi: 'function logScan(address target, bytes32 hash, uint8 severity, string calldata metadata) external returns (uint256)',
      args: [
        '{{input.contractAddress}}',
        '0x{{evaluate_risk.vulnHash}}',
        '{{evaluate_risk.severity}} === "CRITICAL" ? 3 : {{evaluate_risk.severity}} === "HIGH" ? 2 : {{evaluate_risk.severity}} === "MEDIUM" ? 1 : 0',
        '{{evaluate_risk.category}}'
      ],
      gasLimit: 200000,
      privateKey: '{{secrets.sentinelPrivateKey}}',
    },
  })
  
  // Step 7: Notify user via webhook
  // Sends sanitized notification (no vulnerability details for security)
  .step('notify_user', {
    condition: '{{input.alertWebhook}} != null',
    http: {
      url: '{{input.alertWebhook}}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentinel-Signature': '{{secrets.webhookSecret}}'
      },
      body: {
        contract: '{{input.contractAddress}}',
        chainId: '{{input.chainId}}',
        action: '{{evaluate_risk.action}}',
        severity: '{{evaluate_risk.severity}}',
        category: '{{evaluate_risk.category}}',
        confidence: '{{evaluate_risk.confidence}}',
        timestamp: '{{timestamp}}',
        scanId: '{{workflow.executionId}}',
        paused: '{{confidential_pause.result != null}}',
        logged: '{{log_audit.result != null}}',
        // Do NOT include vulnerability details or line numbers in webhook
        // These are kept private to prevent exploiters from using the info
      },
      timeout: 10000,
    },
  })
  
  // Error handling - notify on failure
  .onError('handle_failure', {
    http: { 
      url: '{{secrets.errorWebhook}}', 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: { 
        error: '{{error.message}}', 
        contract: '{{input.contractAddress}}',
        workflowId: '{{workflow.id}}',
        timestamp: '{{timestamp}}'
      } 
    },
  });

export default sentinelWorkflow;
