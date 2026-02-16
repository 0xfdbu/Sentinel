import { Workflow, http, evm, llm, cron } from '@chainlink/cre-sdk';
import { analyzeTransactions, getTopThreat } from './heuristics';

/**
 * Sentinel Hybrid Workflow: Static Analysis + Runtime Heuristics + Cross-Chain Response
 * 
 * Three modes of operation:
 * 1. Static Mode: HTTP trigger → AI code analysis (existing)
 * 2. Runtime Mode: Cron trigger → Heuristic transaction analysis (NEW)
 * 3. Event Mode: EVM log trigger → High-value deposit monitoring (NEW)
 * 
 * Cross-Chain: When CRITICAL detected → CCIP messages to all linked chains
 * 
 * @track Chainlink Convergence Hackathon 2026
 * @category Risk & Compliance | CRE & AI
 */

const sentinelWorkflow = new Workflow({
  name: 'Sentinel Hybrid Security Oracle',
  description: 'Multi-modal security detection with cross-chain response',
  version: '2.0.0',
  
  // Multiple triggers for different modes
  triggers: [
    // Mode 1: HTTP trigger for static code analysis
    {
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
    // Mode 2: Cron trigger for runtime monitoring (every 5 minutes)
    {
      cron: {
        schedule: '*/5 * * * *', // Every 5 minutes
        input: {
          mode: 'runtime',
          chainId: 11155111 // Sepolia
        }
      }
    },
    // Mode 3: Event trigger for high-value operations
    {
      evm: {
        chainId: 11155111,
        contractAddress: '*', // Watch all contracts
        eventSignature: 'Transfer(address,address,uint256)',
        filter: {
          // Only trigger for transfers > $100k
          topics: [null, null, null]
        }
      }
    }
  ]
});

// ============================================
// SHARED UTILITIES
// ============================================

// Encode CCIP message
function encodeSentinelMessage(
  type: number,
  victim: string,
  threatHash: string,
  sourceChain: number,
  timestamp: number,
  signature: string
): string {
  return JSON.stringify({
    messageType: type,
    victimContract: victim,
    threatHash,
    sourceChainId: sourceChain,
    timestamp,
    signature
  });
}

// ============================================
// MODE 1: STATIC ANALYSIS (HTTP Trigger)
// ============================================

sentinelWorkflow
  // Step 1: Fetch contract source
  .step('fetch_source', {
    condition: '{{trigger.type}} === "http"',
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
    },
  })
  
  // Step 2: AI Security Analysis (xAI Grok)
  .step('ai_security_analysis', {
    condition: '{{trigger.type}} === "http"',
    llm: {
      provider: 'xai',
      model: 'grok-4-1-fast-reasoning',
      apiKey: '{{secrets.grokApiKey}}',
      prompt: `Analyze the following Solidity code for security vulnerabilities.

Focus on: Reentrancy, Integer overflow, Access control, Unchecked calls, Price manipulation

Output STRICT JSON:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|SAFE",
  "category": "Reentrancy|Overflow|AccessControl|Other|None",
  "vector": "Description",
  "lines": [1, 2, 3],
  "confidence": 0.95,
  "recommendation": "Fix"
}

Source Code:
{{fetch_source.result.0.SourceCode}}`,
      temperature: 0.1,
      maxTokens: 2048,
    },
  })
  
  // Step 3: Static Risk Evaluation
  .step('evaluate_static_risk', {
    condition: '{{trigger.type}} === "http"',
    compute: {
      runtime: 'javascript',
      logic: `
        const result = JSON.parse('{{ai_security_analysis.result}}');
        const severity = result.severity;
        const confidence = result.confidence;
        
        const vulnHash = require('crypto')
          .createHash('sha256')
          .update(result.vector)
          .digest('hex');
        
        let action = severity === 'CRITICAL' && confidence > 0.85 ? 'PAUSE' :
                     severity === 'HIGH' ? 'ALERT' :
                     severity === 'MEDIUM' ? 'WARN' : 'LOG';
        
        return {
          mode: 'STATIC',
          action,
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
  });

// ============================================
// MODE 2: RUNTIME ANALYSIS (Cron Trigger)
// ============================================

sentinelWorkflow
  // Step 1: Fetch recent transactions from Alchemy
  .step('fetch_mempool_recent', {
    condition: '{{trigger.type}} === "cron" || {{input.mode}} === "runtime"',
    confidentialHttp: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/{{secrets.alchemyKey}}',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '{{currentBlock - 5}}',
          toBlock: 'latest',
          category: ['external', 'erc20', 'internal'],
          withMetadata: true,
          excludeZeroValue: true,
          maxCount: '0x32' // 50 txs
        }]
      },
      allowedHosts: ['eth-sepolia.g.alchemy.com'],
      timeout: 10000
    }
  })
  
  // Step 2: Get transaction receipts for deep analysis
  .step('fetch_transaction_traces', {
    condition: '{{trigger.type}} === "cron" || {{input.mode}} === "runtime"',
    confidentialHttp: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/{{secrets.alchemyKey}}',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTransactionReceipt',
        params: ['{{fetch_mempool_recent.result.transfers[0].hash}}']
      }
    }
  })
  
  // Step 3: Get current block for context
  .step('get_current_block', {
    condition: '{{trigger.type}} === "cron" || {{input.mode}} === "runtime"',
    evm: {
      chainId: '{{input.chainId}}',
      method: 'eth_blockNumber',
      params: [],
    }
  })
  
  // Step 4: Heuristic Analysis (Deterministic)
  .step('heuristic_scan', {
    condition: '{{trigger.type}} === "cron" || {{input.mode}} === "runtime"',
    compute: {
      runtime: 'javascript',
      imports: ['crypto'],
      logic: `
        // Import heuristics module
        const heuristics = require('./heuristics');
        
        // Parse transactions
        const transfers = {{fetch_mempool_recent.result.transfers}} || [];
        const traces = {{fetch_transaction_traces.result}} || [];
        const currentBlock = parseInt('{{get_current_block.result}}', 16);
        
        // Convert to TransactionTrace format
        const txs = transfers.slice(0, 10).map((transfer, idx) => ({
          hash: transfer.hash,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value,
          gasUsed: traces[idx]?.gasUsed || 100000,
          gasPrice: transfer.gasPrice || '0',
          calls: traces[idx]?.calls || [],
          events: traces[idx]?.logs?.map(log => ({
            name: log.topics[0],
            address: log.address,
            topics: log.topics,
            data: log.data
          })) || [],
          timestamp: Date.now(),
          blockNumber: transfer.blockNum
        }));
        
        // Run heuristic analysis
        const avgGas = 150000;
        const threats = heuristics.analyzeTransactions(txs, avgGas);
        const topThreat = heuristics.getTopThreat(threats);
        
        if (topThreat && topThreat.level === 'CRITICAL') {
          return {
            mode: 'RUNTIME_ALERT',
            action: 'PAUSE',
            topThreat,
            allThreats: threats,
            victim: topThreat.victim,
            attacker: topThreat.attacker,
            pattern: topThreat.pattern,
            confidence: topThreat.confidence,
            vulnHash: require('crypto').createHash('sha256').update(topThreat.pattern + topThreat.txHash).digest('hex')
          };
        }
        
        return { mode: 'SAFE', threats: [] };
      `
    }
  });

// ============================================
// MODE 3: EVENT TRIGGER (High-Value Transfer)
// ============================================

sentinelWorkflow
  .step('analyze_high_value_event', {
    condition: '{{trigger.type}} === "evm"',
    compute: {
      logic: `
        const event = {{trigger.event}};
        const amount = BigInt(event.data);
        const threshold = BigInt('100000000000000000000000'); // $100k
        
        if (amount > threshold) {
          return {
            mode: 'EVENT_ALERT',
            action: 'MONITOR',
            amount: amount.toString(),
            from: event.topics[1],
            to: event.topics[2],
            contract: event.address
          };
        }
        return { mode: 'SAFE' };
      `
    }
  });

// ============================================
// CROSS-CHAIN RESPONSE (All Modes)
// ============================================

sentinelWorkflow
  // Step: Get linked chains for cross-chain pause
  .step('get_linked_chains', {
    condition: '{{evaluate_static_risk.action}} === "PAUSE" || {{heuristic_scan.action}} === "PAUSE"',
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.crossChainGuardianAddress}}',
      functionAbi: 'function getSupportedChains() view returns (uint64[] memory)',
      args: []
    }
  })
  
  // Step: Check if contract is registered
  .step('check_registration', {
    condition: '{{evaluate_static_risk.action}} === "PAUSE" || {{heuristic_scan.action}} === "PAUSE"',
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.registryContractAddress}}',
      functionAbi: 'function isRegistered(address) view returns (bool)',
      args: ['{{input.contractAddress || heuristic_scan.victim}}']
    }
  })
  
  // Step: Execute local pause via Confidential Compute
  .step('confidential_pause_local', {
    condition: '{{check_registration.result}} === true',
    confidentialCompute: {
      evm: {
        chainId: '{{input.chainId}}',
        contractAddress: '{{secrets.crossChainGuardianAddress}}',
        functionAbi: 'function emergencyPause(address target, bytes32 threatHash, uint64[] calldata siblingChains) external payable',
        args: [
          '{{input.contractAddress || heuristic_scan.victim}}',
          '0x{{evaluate_static_risk.vulnHash || heuristic_scan.vulnHash}}',
          '{{get_linked_chains.result}}'
        ],
        privacy: 'full',
        gasLimit: 1000000,
        value: '10000000000000000', // 0.01 ETH for CCIP fees
        privateKey: '{{secrets.sentinelPrivateKey}}'
      }
    }
  })
  
  // Step: Log audit record
  .step('log_audit', {
    evm: {
      chainId: '{{input.chainId}}',
      contractAddress: '{{secrets.auditLoggerAddress}}',
      functionAbi: 'function logScan(address target, bytes32 hash, uint8 severity, string calldata metadata) external returns (uint256)',
      args: [
        '{{input.contractAddress || heuristic_scan.victim}}',
        '0x{{evaluate_static_risk.vulnHash || heuristic_scan.vulnHash}}',
        '3', // CRITICAL
        '{{evaluate_static_risk.mode || heuristic_scan.mode}}:{{evaluate_static_risk.category || heuristic_scan.pattern}}'
      ],
      gasLimit: 200000,
      privateKey: '{{secrets.sentinelPrivateKey}}'
    }
  })
  
  // Step: Verify cross-chain delivery (poll for confirmation)
  .step('verify_cross_chain_delivery', {
    condition: '{{get_linked_chains.result.length}} > 0',
    http: {
      url: 'https://ccip.chain.link/api/v1/messages',
      method: 'GET',
      query: {
        sourceChain: '{{input.chainId}}',
        sender: '{{secrets.crossChainGuardianAddress}}',
        limit: 5
      },
      timeout: 30000
    }
  })
  
  // Step: Final notification
  .step('notify_all_channels', {
    http: {
      url: '{{input.alertWebhook || secrets.defaultWebhook}}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentinel-Version': '2.0.0'
      },
      body: {
        mode: '{{evaluate_static_risk.mode || heuristic_scan.mode}}',
        contract: '{{input.contractAddress || heuristic_scan.victim}}',
        chainId: '{{input.chainId}}',
        action: 'PAUSE',
        severity: 'CRITICAL',
        confidence: '{{evaluate_static_risk.confidence || heuristic_scan.confidence}}',
        category: '{{evaluate_static_risk.category || heuristic_scan.pattern}}',
        timestamp: '{{timestamp}}',
        localPause: '{{confidential_pause_local.result != null}}',
        crossChainChains: '{{get_linked_chains.result}}',
        ccipVerified: '{{verify_cross_chain_delivery.result.messages.length}} > 0',
        auditLogId: '{{log_audit.result}}',
        scanId: '{{workflow.executionId}}'
      }
    }
  })
  
  // Error handling
  .onError('handle_failure', {
    http: {
      url: '{{secrets.errorWebhook}}',
      method: 'POST',
      body: {
        error: '{{error.message}}',
        stack: '{{error.stack}}',
        contract: '{{input.contractAddress}}',
        mode: '{{trigger.type}}',
        timestamp: '{{timestamp}}'
      }
    }
  });

export default sentinelWorkflow;
