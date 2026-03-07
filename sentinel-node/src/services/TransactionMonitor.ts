/**
 * Transaction Monitor Service
 * 
 * Monitors USDA V8 contract for suspicious transactions using heuristic analysis.
 * Triggers pause workflow when fraud score exceeds threshold.
 */

import { ethers, WebSocketProvider, Contract, TransactionResponse, Log } from 'ethers';

// USDA V8 Contract ABI (minimal for monitoring)
const USDA_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Mint(address indexed to, uint256 amount)',
  'event Burn(address indexed from, uint256 amount)',
  'function paused() view returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

// Configuration
const CONFIG = {
  USDA_ADDRESS: '0xFA93de331FCd870D83C21A0275d8b3E7aA883F45',
  GUARDIAN_ADDRESS: '0xD1965D40aeAAd9F1898F249C9cf6b2b74c3B5AE1',
  RPC_WSS: 'wss://sepolia.gateway.tenderly.co/5srkjbJkFMoz8BH8ZiCmsH',
  POLL_INTERVAL_MS: 1000,
  FRAUD_THRESHOLD: 70, // Score 0-100, trigger pause if above
  WORKFLOW_ENDPOINT: process.env.PAUSE_WORKFLOW_ENDPOINT || 'http://localhost:8080/workflows/pause-with-don',
  WORKFLOW_AUTH_KEY: process.env.PAUSE_WORKFLOW_AUTH_KEY || '',
};

// Heuristic patterns
const HEURISTICS = {
  // Known malicious patterns
  SUSPICIOUS_SIGNATURES: [
    '0x8da5cb5b', // ownership transfer
    '0x3659cfe6', // upgrade
    '0xf2fde38b', // transfer ownership
  ],
  
  // Large transfer threshold (in USDA wei = 6 decimals)
  LARGE_TRANSFER: ethers.parseUnits('100000', 6), // 100K USDA
  
  // Rapid transaction threshold (same sender, multiple txs)
  RAPID_TX_WINDOW_MS: 60000, // 1 minute
  RAPID_TX_COUNT: 5,
};

interface TransactionAnalysis {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  data: string;
  timestamp: number;
  fraudScore: number;
  riskFactors: string[];
}

interface FraudHeuristic {
  name: string;
  weight: number;
  check: (tx: TransactionResponse, context: TxContext) => boolean;
}

interface TxContext {
  recentTxs: Map<string, number[]>; // sender -> timestamps
  knownScammers: Set<string>;
  lastBlockNumber: number;
}

export class TransactionMonitor {
  private provider: WebSocketProvider | null = null;
  private usdaContract: Contract | null = null;
  private isRunning = false;
  private context: TxContext = {
    recentTxs: new Map(),
    knownScammers: new Set(),
    lastBlockNumber: 0,
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  // Heuristic definitions
  private heuristics: FraudHeuristic[] = [
    {
      name: 'Large Transfer',
      weight: 30,
      check: (tx) => {
        if (!tx.value) return false;
        // Check if transfer value exceeds threshold
        return tx.value > HEURISTICS.LARGE_TRANSFER;
      },
    },
    {
      name: 'Suspicious Function Call',
      weight: 40,
      check: (tx) => {
        if (!tx.data || tx.data === '0x') return false;
        const selector = tx.data.slice(0, 10);
        return HEURISTICS.SUSPICIOUS_SIGNATURES.includes(selector);
      },
    },
    {
      name: 'Rapid Transactions',
      weight: 25,
      check: (tx, context) => {
        const now = Date.now();
        const sender = tx.from.toLowerCase();
        const timestamps = context.recentTxs.get(sender) || [];
        
        // Add current timestamp
        timestamps.push(now);
        
        // Clean old timestamps outside window
        const recentTimestamps = timestamps.filter(
          t => now - t < HEURISTICS.RAPID_TX_WINDOW_MS
        );
        
        context.recentTxs.set(sender, recentTimestamps);
        
        return recentTimestamps.length >= HEURISTICS.RAPID_TX_COUNT;
      },
    },
    {
      name: 'Contract Interaction',
      weight: 15,
      check: (tx) => {
        // Transactions to contracts (not EOA) are slightly more suspicious
        return tx.to !== null && tx.data && tx.data !== '0x';
      },
    },
    {
      name: 'Unusual Gas Limit',
      weight: 20,
      check: (tx) => {
        // Very high gas limit might indicate complex attack
        if (!tx.gasLimit) return false;
        return tx.gasLimit > 500000; // 500k gas
      },
    },
  ];

  async start(): Promise<void> {
    console.log('🛡️  Starting Transaction Monitor...\n');
    console.log(`   USDA Contract: ${CONFIG.USDA_ADDRESS}`);
    console.log(`   Guardian: ${CONFIG.GUARDIAN_ADDRESS}`);
    console.log(`   Fraud Threshold: ${CONFIG.FRAUD_THRESHOLD}`);
    console.log(`   Poll Interval: ${CONFIG.POLL_INTERVAL_MS}ms\n`);

    await this.connect();
    this.isRunning = true;

    // Load known scammers from blacklist
    await this.loadBlacklist();

    // Start monitoring
    this.monitorLoop();

    // Subscribe to events
    this.subscribeToEvents();

    console.log('✅ Transaction Monitor started\n');
  }

  private async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to WebSocket RPC...');
      this.provider = new WebSocketProvider(CONFIG.RPC_WSS);
      
      // Wait for connection
      await this.provider.ready;
      
      this.usdaContract = new Contract(
        CONFIG.USDA_ADDRESS,
        USDA_ABI,
        this.provider
      );

      const blockNumber = await this.provider.getBlockNumber();
      this.context.lastBlockNumber = blockNumber;
      this.reconnectAttempts = 0;
      
      console.log(`✅ Connected at block ${blockNumber}\n`);
    } catch (error) {
      console.error('❌ Connection failed:', error);
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      process.exit(1);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`⏳ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }

  private async loadBlacklist(): Promise<void> {
    try {
      // Load from ScamSniffer or local DB
      const response = await fetch('https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json');
      const addresses = await response.json();
      
      addresses.forEach((addr: string) => {
        this.context.knownScammers.add(addr.toLowerCase());
      });
      
      console.log(`✅ Loaded ${this.context.knownScammers.size} blacklisted addresses\n`);
    } catch (error) {
      console.warn('⚠️  Could not load blacklist:', error);
    }
  }

  private subscribeToEvents(): void {
    if (!this.usdaContract) return;

    console.log('📡 Subscribing to contract events...\n');

    // Monitor Transfer events
    this.usdaContract.on('Transfer', async (from, to, value, event) => {
      await this.analyzeEvent('Transfer', { from, to, value: BigInt(value.toString()) }, event);
    });

    // Monitor Mint events
    this.usdaContract.on('Mint', async (to, amount, event) => {
      await this.analyzeEvent('Mint', { to, amount: BigInt(amount.toString()) }, event);
    });

    // Monitor Approval events (unlimited approvals are suspicious)
    this.usdaContract.on('Approval', async (owner, spender, value, event) => {
      const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      if (BigInt(value.toString()) === maxUint256) {
        console.log(`⚠️  UNLIMITED APPROVAL detected: ${owner} -> ${spender}`);
        await this.analyzeEvent('UnlimitedApproval', { owner, spender }, event);
      }
    });
  }

  private async analyzeEvent(
    eventType: string,
    data: Record<string, any>,
    event: any
  ): Promise<void> {
    const tx = await event.getTransaction();
    const receipt = await event.getTransactionReceipt();
    
    // Skip if contract is already paused
    if (await this.isPaused()) {
      console.log(`⏸️  Contract paused, skipping analysis`);
      return;
    }

    // Analyze transaction
    const analysis = await this.analyzeTransaction(tx, receipt);
    
    if (analysis.fraudScore >= CONFIG.FRAUD_THRESHOLD) {
      console.log(`\n🚨 HIGH FRAUD SCORE DETECTED: ${analysis.fraudScore}`);
      console.log(`   Tx: ${analysis.hash}`);
      console.log(`   Risk Factors: ${analysis.riskFactors.join(', ')}`);
      
      // Trigger pause workflow
      await this.triggerPauseWorkflow(analysis);
    }
  }

  private async analyzeTransaction(
    tx: TransactionResponse,
    receipt: any
  ): Promise<TransactionAnalysis> {
    let fraudScore = 0;
    const riskFactors: string[] = [];

    // Run heuristics
    for (const heuristic of this.heuristics) {
      if (heuristic.check(tx, this.context)) {
        fraudScore += heuristic.weight;
        riskFactors.push(heuristic.name);
      }
    }

    // Check if sender/recipient is blacklisted
    if (this.context.knownScammers.has(tx.from.toLowerCase())) {
      fraudScore += 50;
      riskFactors.push('Blacklisted Sender');
    }
    if (tx.to && this.context.knownScammers.has(tx.to.toLowerCase())) {
      fraudScore += 50;
      riskFactors.push('Blacklisted Recipient');
    }

    // Check for failed transactions (might be attack attempts)
    if (receipt && receipt.status === 0) {
      fraudScore += 10;
      riskFactors.push('Failed Transaction');
    }

    // Cap at 100
    fraudScore = Math.min(fraudScore, 100);

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value ? BigInt(tx.value.toString()) : BigInt(0),
      data: tx.data || '0x',
      timestamp: Date.now(),
      fraudScore,
      riskFactors,
    };
  }

  private async isPaused(): Promise<boolean> {
    if (!this.usdaContract) return false;
    try {
      return await this.usdaContract.paused();
    } catch {
      return false;
    }
  }

  private async triggerPauseWorkflow(analysis: TransactionAnalysis): Promise<void> {
    console.log(`\n🔴 TRIGGERING PAUSE WORKFLOW`);
    console.log(`   Endpoint: ${CONFIG.WORKFLOW_ENDPOINT}`);

    try {
      const payload = {
        action: 'pause',
        target: CONFIG.GUARDIAN_ADDRESS,
        reason: `Fraud detected (score: ${analysis.fraudScore}). Risk factors: ${analysis.riskFactors.join(', ')}. Tx: ${analysis.hash}`,
        broadcast: true,
        metadata: {
          fraudScore: analysis.fraudScore,
          riskFactors: analysis.riskFactors,
          suspiciousTx: analysis.hash,
          from: analysis.from,
          to: analysis.to,
          value: analysis.value.toString(),
          timestamp: analysis.timestamp,
        },
      };

      const response = await fetch(CONFIG.WORKFLOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.WORKFLOW_AUTH_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Pause workflow triggered successfully`);
        console.log(`   Result:`, result);
      } else {
        console.error(`❌ Failed to trigger pause workflow: ${response.status}`);
        // Fallback: direct contract call
        await this.directPauseCall(analysis);
      }
    } catch (error) {
      console.error(`❌ Error triggering pause workflow:`, error);
      // Fallback: direct contract call
      await this.directPauseCall(analysis);
    }
  }

  private async directPauseCall(analysis: TransactionAnalysis): Promise<void> {
    console.log(`\n🔄 FALLBACK: Attempting direct pause call...`);
    
    // This would require a signer - for now just log
    console.log(`   Would call EmergencyGuardian.pause() directly`);
    console.log(`   With report hash: ${analysis.hash}`);
  }

  private async monitorLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check provider health
        if (!this.provider) {
          await this.reconnect();
        }

        // Get latest block
        const blockNumber = await this.provider!.getBlockNumber();
        
        if (blockNumber > this.context.lastBlockNumber) {
          console.log(`📦 New block: ${blockNumber}`);
          this.context.lastBlockNumber = blockNumber;
        }

        // Clean old transaction history every 100 blocks
        if (blockNumber % 100 === 0) {
          this.cleanOldTransactions();
        }

      } catch (error) {
        console.error('❌ Monitor loop error:', error);
        await this.reconnect();
      }

      await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
    }
  }

  private cleanOldTransactions(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sender, timestamps] of this.context.recentTxs.entries()) {
      const recent = timestamps.filter(t => now - t < HEURISTICS.RAPID_TX_WINDOW_MS);
      if (recent.length !== timestamps.length) {
        cleaned += timestamps.length - recent.length;
        this.context.recentTxs.set(sender, recent);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old transaction records`);
    }
  }

  stop(): void {
    console.log('\n🛑 Stopping Transaction Monitor...');
    this.isRunning = false;
    
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    
    console.log('✅ Transaction Monitor stopped');
  }
}

// Singleton instance
export const transactionMonitor = new TransactionMonitor();

// Graceful shutdown
process.on('SIGINT', () => {
  transactionMonitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  transactionMonitor.stop();
  process.exit(0);
});
